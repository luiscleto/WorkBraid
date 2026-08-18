package architecture

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
	"go.yaml.in/yaml/v4"
)

const (
	acceptedRef = "refs/heads/accepted"
	zeroObject  = "0000000000000000000000000000000000000000"
)

var (
	ErrIncomplete  = errors.New("Architecture setup is incomplete")
	ErrUnavailable = errors.New("Architecture is unavailable")
	ErrInvalid     = errors.New("Architecture store is invalid")
	ErrUnsupported = errors.New("Architecture is unsupported")
)

// Snapshot is immutable accepted Architecture state pinned to one Git commit.
type Snapshot struct {
	storeID    uuid.UUID
	revision   string
	components []component
}

type component struct {
	id            uuid.UUID
	path          string
	title         string
	body          []byte
	relationships []componentRelationship
	mode          string
	source        []byte
	headingStart  int
	headingEnd    int
	headingStyle  headingStyle
}

type headingStyle uint8

const (
	headingATX headingStyle = iota
	headingSetext
)

type componentRelationship struct {
	target uuid.UUID
	label  string
}

func (snapshot Snapshot) Revision() string    { return snapshot.revision }
func (snapshot Snapshot) ComponentCount() int { return len(snapshot.components) }
func (snapshot Snapshot) StoreID() string     { return snapshot.storeID.String() }
func (snapshot Snapshot) ComponentTitles() []string {
	titles := make([]string, len(snapshot.components))
	for index := range snapshot.components {
		titles[index] = snapshot.components[index].title
	}
	return titles
}

// AuthoringComponent is the structured projection used by the local browser.
// Canonical Markdown interpretation remains owned by the accepted loader.
type AuthoringComponent struct {
	ID          string
	Title       string
	Description string
}

func (snapshot Snapshot) AuthoringComponents() []AuthoringComponent {
	components := make([]AuthoringComponent, len(snapshot.components))
	for index := range snapshot.components {
		components[index] = AuthoringComponent{
			ID:          snapshot.components[index].id.String(),
			Title:       snapshot.components[index].title,
			Description: string(snapshot.components[index].body),
		}
	}
	return components
}

func (snapshot Snapshot) ChangeForAcceptedComponent(id string) (ComponentChange, bool) {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return ComponentChange{}, false
	}
	for _, component := range snapshot.components {
		if component.id == parsed {
			return ComponentChange{
				ID:          component.id.String(),
				Title:       component.title,
				Description: string(component.body),
				Path:        component.path,
			}, true
		}
	}
	return ComponentChange{}, false
}

// ComponentChange is one addition or replacement in a multi-file pending
// Architecture change set. Its path and identity are assigned by the backend,
// never by browser input.
type ComponentChange struct {
	ID                 string
	Title              string
	Description        string
	Path               string
	New                bool
	TitleChanged       bool
	DescriptionChanged bool
}

// Candidate is a completely constructed and validated non-canonical tree.
type Candidate struct {
	tree     string
	snapshot Snapshot
}

func (candidate Candidate) Tree() string       { return candidate.tree }
func (candidate Candidate) Snapshot() Snapshot { return candidate.snapshot }
func (candidate Candidate) SnapshotAt(revision string) Snapshot {
	snapshot := candidate.snapshot
	snapshot.revision = revision
	return snapshot
}

var (
	ErrTitleRequired = errors.New("component title is required")
	ErrTitleOneLine  = errors.New("component title must fit on one line")
)

type ComponentValidationError struct {
	ComponentID string
	Err         error
}

func (err *ComponentValidationError) Error() string { return err.Err.Error() }
func (err *ComponentValidationError) Unwrap() error { return err.Err }

type Manager struct {
	storeRoot string
	git       gitRunner
}

func NewManager(dataDirectory string) *Manager {
	return &Manager{
		storeRoot: filepath.Join(dataDirectory, "architecture"),
		git:       gitRunner{},
	}
}

func (manager *Manager) ValidateSourceIsolation(sourceRoot string) error {
	relative, err := filepath.Rel(sourceRoot, manager.storeRoot)
	if err != nil {
		return fmt.Errorf("compare project and private Architecture paths: %w", err)
	}
	if relative == "." || (relative != ".." && !strings.HasPrefix(relative, ".."+string(filepath.Separator))) {
		return errors.New("private Architecture directory must be outside the project folder")
	}
	return nil
}

func (manager *Manager) StorePath(storeID string) (string, error) {
	id, err := uuid.Parse(storeID)
	if err != nil {
		return "", fmt.Errorf("%w: associated store ID is not a UUID", ErrInvalid)
	}
	return filepath.Join(manager.storeRoot, id.String()+".git"), nil
}

// LoadAccepted reads the exact Architecture revision named by accepted. It is
// deliberately read-only: missing repositories or refs remain missing, and no
// other ref or object is considered as a fallback authority.
func (manager *Manager) LoadAccepted(ctx context.Context, storeID string) (Snapshot, error) {
	parsedStoreID, err := uuid.Parse(storeID)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: associated store ID is not a UUID", ErrInvalid)
	}
	storePath, _ := manager.StorePath(parsedStoreID.String())

	info, err := os.Stat(storePath)
	if errors.Is(err, os.ErrNotExist) {
		return Snapshot{}, fmt.Errorf("%w: private Architecture location is missing", ErrUnavailable)
	}
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: inspect private Architecture location: %v", ErrUnavailable, err)
	}
	if !info.IsDir() {
		return Snapshot{}, fmt.Errorf("%w: private Architecture location is not a directory", ErrInvalid)
	}

	bare, err := manager.git.isBare(ctx, storePath)
	if err != nil || !bare {
		return Snapshot{}, fmt.Errorf("%w: private Architecture location is not a compatible bare Git repository", ErrInvalid)
	}
	revision, present, err := manager.git.resolveRef(ctx, storePath, acceptedRef)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: observe accepted Architecture: %v", ErrInvalid, err)
	}
	if !present {
		return Snapshot{}, fmt.Errorf("%w: accepted Architecture is missing", ErrUnavailable)
	}

	return manager.load(ctx, storePath, parsedStoreID, revision)
}

// InitializeOrLoad completes a compatible manifest-only bootstrap or loads the
// exact valid revision already named by accepted. It never changes an existing
// accepted ref.
func (manager *Manager) InitializeOrLoad(ctx context.Context, storeID, projectName, sourceHint string) (Snapshot, error) {
	parsedStoreID, err := uuid.Parse(storeID)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: associated store ID is not a UUID", ErrInvalid)
	}
	storePath, _ := manager.StorePath(parsedStoreID.String())

	initialized, err := manager.ensureBareRepository(ctx, storePath)
	if err != nil {
		return Snapshot{}, err
	}

	revision, present, err := manager.git.resolveRef(ctx, storePath, acceptedRef)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: observe accepted Architecture: %v", ErrInvalid, err)
	}
	if present {
		return manager.load(ctx, storePath, parsedStoreID, revision)
	}
	if !initialized {
		refs, err := manager.git.refs(ctx, storePath)
		if err != nil {
			return Snapshot{}, fmt.Errorf("%w: inspect private repository refs: %v", ErrInvalid, err)
		}
		if len(refs) != 0 {
			return Snapshot{}, fmt.Errorf("%w: accepted Architecture is missing while other refs exist", ErrInvalid)
		}
	}

	manifestBytes, err := marshalManifest(manifest{
		Format:  "workbraid-architecture",
		Version: 1,
		StoreID: parsedStoreID.String(),
		Project: manifestProject{Name: projectName, SourceHint: sourceHint},
	})
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: prepare Architecture identity: %v", ErrIncomplete, err)
	}
	blob, err := manager.git.writeBlob(ctx, storePath, manifestBytes)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: write Architecture identity: %v", ErrIncomplete, err)
	}
	tree, err := manager.git.makeBootstrapTree(ctx, storePath, blob)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: create bootstrap tree: %v", ErrIncomplete, err)
	}
	commit, err := manager.git.makeBootstrapCommit(ctx, storePath, tree)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: create bootstrap commit: %v", ErrIncomplete, err)
	}
	if err := manager.git.createRef(ctx, storePath, acceptedRef, commit); err != nil {
		observed, nowPresent, observeErr := manager.git.resolveRef(ctx, storePath, acceptedRef)
		if observeErr != nil {
			return Snapshot{}, fmt.Errorf("%w: verify accepted Architecture after update failure: %v", ErrIncomplete, observeErr)
		}
		if !nowPresent {
			return Snapshot{}, fmt.Errorf("%w: accepted Architecture was not created", ErrIncomplete)
		}
		return manager.load(ctx, storePath, parsedStoreID, observed)
	}
	return manager.load(ctx, storePath, parsedStoreID, commit)
}

// ensureBareRepository returns true only when it created the repository.
func (manager *Manager) ensureBareRepository(ctx context.Context, storePath string) (bool, error) {
	info, err := os.Stat(storePath)
	if errors.Is(err, os.ErrNotExist) {
		if err := os.MkdirAll(manager.storeRoot, 0o700); err != nil {
			return false, fmt.Errorf("%w: create private Architecture directory: %v", ErrIncomplete, err)
		}
		if err := manager.git.initBare(ctx, storePath); err != nil {
			return false, fmt.Errorf("%w: create private Architecture repository: %v", ErrIncomplete, err)
		}
		if err := os.Chmod(storePath, 0o700); err != nil {
			return false, fmt.Errorf("%w: protect private Architecture repository: %v", ErrIncomplete, err)
		}
		return true, nil
	}
	if err != nil {
		return false, fmt.Errorf("%w: inspect private Architecture location: %v", ErrIncomplete, err)
	}
	if !info.IsDir() {
		return false, fmt.Errorf("%w: private Architecture location is not a directory", ErrInvalid)
	}
	bare, err := manager.git.isBare(ctx, storePath)
	if err != nil || !bare {
		empty, readErr := directoryEmpty(storePath)
		if readErr != nil {
			return false, fmt.Errorf("%w: inspect incomplete private Architecture repository: %v", ErrIncomplete, readErr)
		}
		if empty {
			if err := manager.git.initBare(ctx, storePath); err != nil {
				return false, fmt.Errorf("%w: complete private Architecture repository: %v", ErrIncomplete, err)
			}
			if err := os.Chmod(storePath, 0o700); err != nil {
				return false, fmt.Errorf("%w: protect private Architecture repository: %v", ErrIncomplete, err)
			}
			return true, nil
		}
		return false, fmt.Errorf("%w: private Architecture repository is not a compatible bare Git repository", ErrInvalid)
	}
	return false, nil
}

func directoryEmpty(path string) (bool, error) {
	directory, err := os.Open(path)
	if err != nil {
		return false, err
	}
	defer directory.Close()
	_, err = directory.Readdirnames(1)
	if errors.Is(err, io.EOF) {
		return true, nil
	}
	return false, err
}

func (manager *Manager) load(ctx context.Context, storePath string, expectedStoreID uuid.UUID, revision string) (Snapshot, error) {
	entries, err := manager.git.treeEntries(ctx, storePath, revision)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: read accepted Architecture tree: %v", ErrInvalid, err)
	}

	var manifestEntry *treeEntry
	componentsTreePresent := false
	var componentEntries []treeEntry
	for index := range entries {
		entry := entries[index]
		switch {
		case entry.Path == "architecture.yaml":
			if entry.Type != "blob" || (entry.Mode != "100644" && entry.Mode != "100755") {
				return Snapshot{}, fmt.Errorf("%w: architecture.yaml is not an ordinary file", ErrInvalid)
			}
			manifestEntry = &entry
		case entry.Path == "components" && entry.Type == "tree":
			componentsTreePresent = true
		case strings.HasPrefix(entry.Path, "components/"):
			relative := strings.TrimPrefix(entry.Path, "components/")
			if strings.Contains(relative, "/") || !strings.HasSuffix(relative, ".md") || entry.Type != "blob" || (entry.Mode != "100644" && entry.Mode != "100755") {
				return Snapshot{}, fmt.Errorf("%w: accepted tree contains an invalid component path", ErrInvalid)
			}
			componentEntries = append(componentEntries, entry)
		default:
			return Snapshot{}, fmt.Errorf("%w: accepted tree contains unsupported path %q", ErrInvalid, entry.Path)
		}
	}
	if manifestEntry == nil {
		return Snapshot{}, fmt.Errorf("%w: architecture.yaml is missing", ErrInvalid)
	}
	if componentsTreePresent && len(componentEntries) == 0 {
		return Snapshot{}, fmt.Errorf("%w: accepted tree contains an empty components directory", ErrInvalid)
	}
	contents, err := manager.git.readBlob(ctx, storePath, manifestEntry.Object)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: read architecture.yaml: %v", ErrInvalid, err)
	}
	parsed, err := parseManifest(contents)
	if err != nil {
		return Snapshot{}, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	manifestStoreID, err := uuid.Parse(parsed.StoreID)
	if err != nil || manifestStoreID != expectedStoreID {
		return Snapshot{}, fmt.Errorf("%w: Architecture identity does not match this project", ErrInvalid)
	}
	components := make([]component, 0, len(componentEntries))
	componentIDs := make(map[uuid.UUID]struct{}, len(componentEntries))
	for _, entry := range componentEntries {
		contents, err := manager.git.readBlob(ctx, storePath, entry.Object)
		if err != nil {
			return Snapshot{}, fmt.Errorf("%w: read component %q: %v", ErrInvalid, entry.Path, err)
		}
		component, err := parseComponent(entry.Path, contents)
		if err != nil {
			return Snapshot{}, fmt.Errorf("%w: component %q: %v", ErrInvalid, entry.Path, err)
		}
		if _, duplicate := componentIDs[component.id]; duplicate {
			return Snapshot{}, fmt.Errorf("%w: duplicate component ID %s", ErrInvalid, component.id)
		}
		component.mode = entry.Mode
		component.source = append([]byte(nil), contents...)
		componentIDs[component.id] = struct{}{}
		components = append(components, component)
	}
	for _, component := range components {
		for _, relationship := range component.relationships {
			if _, exists := componentIDs[relationship.target]; !exists {
				return Snapshot{}, fmt.Errorf("%w: component %q has a relationship to an unknown component", ErrInvalid, component.path)
			}
		}
	}
	return Snapshot{storeID: expectedStoreID, revision: revision, components: components}, nil
}

// NewComponentChange assigns creation-time identity and filename while leaving
// the accepted snapshot untouched. Existing pending paths participate in the
// collision check because all changes form one candidate Architecture.
func (manager *Manager) NewComponentChange(base Snapshot, changes []ComponentChange, title, description string) ComponentChange {
	used := make(map[string]struct{}, len(base.components)+len(changes))
	for _, component := range base.components {
		used[component.path] = struct{}{}
	}
	for _, change := range changes {
		used[change.Path] = struct{}{}
	}
	slug := componentFilenameSlug(title)
	path := "components/" + slug + ".md"
	for suffix := 2; ; suffix++ {
		if _, exists := used[path]; !exists {
			break
		}
		path = fmt.Sprintf("components/%s-%d.md", slug, suffix)
	}
	return ComponentChange{
		ID:                 uuid.NewString(),
		Title:              title,
		Description:        description,
		Path:               path,
		New:                true,
		TitleChanged:       true,
		DescriptionChanged: true,
	}
}

func componentFilenameSlug(title string) string {
	var result strings.Builder
	separator := false
	for _, character := range strings.ToLower(strings.TrimSpace(title)) {
		switch {
		case character >= 'a' && character <= 'z', character >= '0' && character <= '9':
			if separator && result.Len() > 0 {
				result.WriteByte('-')
			}
			separator = false
			result.WriteRune(character)
		case unicode.IsLetter(character), unicode.IsDigit(character):
			if separator && result.Len() > 0 {
				result.WriteByte('-')
			}
			separator = false
			result.WriteRune(character)
		default:
			separator = true
		}
	}
	value := strings.Trim(result.String(), "-")
	if value == "" {
		return "component"
	}
	return value
}

// ConstructCandidate is the single I2.2 candidate construction and validation
// path. It starts from the exact loaded base tree, writes only changed/new
// blobs, and validates the complete resulting tree through the same loader used
// for accepted Architecture.
func (manager *Manager) ConstructCandidate(ctx context.Context, base Snapshot, changes []ComponentChange) (Candidate, error) {
	storePath, err := manager.StorePath(base.storeID.String())
	if err != nil {
		return Candidate{}, err
	}
	entries, err := manager.git.treeEntries(ctx, storePath, base.revision)
	if err != nil {
		return Candidate{}, fmt.Errorf("construct candidate from accepted base: %w", err)
	}

	byPath := make(map[string]treeEntry, len(entries))
	var manifest treeEntry
	for _, entry := range entries {
		if entry.Path == "architecture.yaml" {
			manifest = entry
		}
		if entry.Type == "blob" {
			byPath[entry.Path] = entry
		}
	}
	if manifest.Path == "" {
		return Candidate{}, fmt.Errorf("%w: architecture identity is missing", ErrInvalid)
	}

	baseByID := make(map[string]component, len(base.components))
	for _, component := range base.components {
		baseByID[component.id.String()] = component
	}
	seenIDs := make(map[string]struct{}, len(changes))
	for _, change := range changes {
		if _, duplicate := seenIDs[change.ID]; duplicate {
			return Candidate{}, fmt.Errorf("%w: component is changed more than once", ErrInvalid)
		}
		seenIDs[change.ID] = struct{}{}
		if strings.TrimSpace(change.Title) == "" {
			return Candidate{}, &ComponentValidationError{ComponentID: change.ID, Err: ErrTitleRequired}
		}
		if strings.ContainsAny(change.Title, "\r\n") {
			return Candidate{}, &ComponentValidationError{ComponentID: change.ID, Err: ErrTitleOneLine}
		}

		var source []byte
		mode := "100644"
		if change.New {
			if _, exists := baseByID[change.ID]; exists {
				return Candidate{}, fmt.Errorf("%w: new component identity already exists", ErrInvalid)
			}
			if !validNewComponentPath(change.Path) {
				return Candidate{}, fmt.Errorf("%w: new component path is invalid", ErrInvalid)
			}
			if _, exists := byPath[change.Path]; exists {
				return Candidate{}, fmt.Errorf("%w: new component path already exists", ErrInvalid)
			}
			if _, err := uuid.Parse(change.ID); err != nil {
				return Candidate{}, fmt.Errorf("%w: new component identity is invalid", ErrInvalid)
			}
			source = newComponentSource(change)
		} else {
			accepted, exists := baseByID[change.ID]
			if !exists || accepted.path != change.Path {
				return Candidate{}, fmt.Errorf("%w: changed component does not belong to the accepted base", ErrInvalid)
			}
			mode = accepted.mode
			source = editedComponentSource(accepted, change)
			if bytes.Equal(source, accepted.source) {
				continue
			}
		}
		blob, err := manager.git.writeBlob(ctx, storePath, source)
		if err != nil {
			return Candidate{}, fmt.Errorf("write candidate component: %w", err)
		}
		byPath[change.Path] = treeEntry{Mode: mode, Type: "blob", Object: blob, Path: change.Path}
	}

	componentPaths := make([]string, 0, len(byPath))
	for path := range byPath {
		if strings.HasPrefix(path, "components/") {
			componentPaths = append(componentPaths, path)
		}
	}
	sort.Strings(componentPaths)
	var componentTree string
	if len(componentPaths) > 0 {
		var treeSource strings.Builder
		for _, path := range componentPaths {
			entry := byPath[path]
			fmt.Fprintf(&treeSource, "%s blob %s\t%s\n", entry.Mode, entry.Object, strings.TrimPrefix(path, "components/"))
		}
		componentTree, err = manager.git.makeTree(ctx, storePath, []byte(treeSource.String()))
		if err != nil {
			return Candidate{}, fmt.Errorf("construct candidate component tree: %w", err)
		}
	}
	rootSource := fmt.Sprintf("%s blob %s\tarchitecture.yaml\n", manifest.Mode, manifest.Object)
	if componentTree != "" {
		rootSource += "040000 tree " + componentTree + "\tcomponents\n"
	}
	tree, err := manager.git.makeTree(ctx, storePath, []byte(rootSource))
	if err != nil {
		return Candidate{}, fmt.Errorf("construct candidate tree: %w", err)
	}
	snapshot, err := manager.load(ctx, storePath, base.storeID, tree)
	if err != nil {
		return Candidate{}, err
	}
	return Candidate{tree: tree, snapshot: snapshot}, nil
}

// AcceptedRevision observes only the authoritative accepted ref for the
// snapshot's private store. It does not load or fall back to another ref.
func (manager *Manager) AcceptedRevision(ctx context.Context, snapshot Snapshot) (string, bool, error) {
	storePath, err := manager.StorePath(snapshot.storeID.String())
	if err != nil {
		return "", false, err
	}
	return manager.git.resolveRef(ctx, storePath, acceptedRef)
}

// CandidateDiff returns review evidence for the exact base and candidate
// trees. The bytes are predictable presentation, not canonical state.
func (manager *Manager) CandidateDiff(ctx context.Context, base Snapshot, candidate Candidate) ([]byte, error) {
	if base.storeID != candidate.snapshot.storeID {
		return nil, fmt.Errorf("candidate belongs to another Architecture store")
	}
	storePath, err := manager.StorePath(base.storeID.String())
	if err != nil {
		return nil, err
	}
	diff, err := manager.git.diffTrees(ctx, storePath, base.revision, candidate.tree)
	if err != nil {
		return nil, err
	}
	return []byte(presentUnifiedDiff(diff)), nil
}

func presentUnifiedDiff(diff []byte) string {
	var presented strings.Builder
	for len(diff) > 0 {
		value, size := utf8.DecodeRune(diff)
		if value == utf8.RuneError && size == 1 {
			fmt.Fprintf(&presented, "\\x%02x", diff[0])
			diff = diff[1:]
			continue
		}
		diff = diff[size:]
		switch {
		case value == '\n' || value == '\t':
			presented.WriteRune(value)
		case value == '\\':
			presented.WriteString("\\\\")
		case unicode.IsPrint(value):
			presented.WriteRune(value)
		case value <= 0xff:
			fmt.Fprintf(&presented, "\\x%02x", value)
		default:
			fmt.Fprintf(&presented, "\\u{%x}", value)
		}
	}
	return presented.String()
}

// CreateSuccessor creates a non-canonical commit object. Authority changes
// only if AdvanceAccepted subsequently succeeds.
func (manager *Manager) CreateSuccessor(ctx context.Context, base Snapshot, candidate Candidate) (string, error) {
	if base.storeID != candidate.snapshot.storeID {
		return "", fmt.Errorf("candidate belongs to another Architecture store")
	}
	storePath, err := manager.StorePath(base.storeID.String())
	if err != nil {
		return "", err
	}
	return manager.git.makeSuccessorCommit(ctx, storePath, candidate.tree, base.revision)
}

// AdvanceAccepted performs the mandatory compare-and-swap. A nil result is the
// acceptance success boundary; callers observe the ref only to classify a
// failed update, never by parsing Git's diagnostic text.
func (manager *Manager) AdvanceAccepted(ctx context.Context, base Snapshot, successor string) error {
	storePath, err := manager.StorePath(base.storeID.String())
	if err != nil {
		return err
	}
	return manager.git.updateRef(ctx, storePath, acceptedRef, successor, base.revision)
}

func validNewComponentPath(path string) bool {
	if !strings.HasPrefix(path, "components/") || !strings.HasSuffix(path, ".md") {
		return false
	}
	relative := strings.TrimPrefix(path, "components/")
	return relative != "" && !strings.Contains(relative, "/")
}

func newComponentSource(change ComponentChange) []byte {
	return []byte(fmt.Sprintf("---\nid: %q\n---\n# %s\n%s", change.ID, escapeMarkdownTitle(change.Title), change.Description))
}

func editedComponentSource(accepted component, change ComponentChange) []byte {
	heading := accepted.source[accepted.headingStart:accepted.headingEnd]
	if change.TitleChanged && change.Title != accepted.title {
		heading = replacementHeading(accepted, change.Title)
	}
	body := accepted.body
	if change.DescriptionChanged {
		body = []byte(change.Description)
	}
	source := make([]byte, 0, len(accepted.source)+len(change.Title)+len(change.Description))
	source = append(source, accepted.source[:accepted.headingStart]...)
	source = append(source, heading...)
	source = append(source, body...)
	return source
}

func replacementHeading(accepted component, title string) []byte {
	lineEnding := headingLineEnding(accepted.source[accepted.headingStart:accepted.headingEnd])
	escaped := escapeMarkdownTitle(title)
	if accepted.headingStyle == headingSetext {
		return []byte(escaped + lineEnding + "=" + lineEnding)
	}
	return []byte("# " + escaped + lineEnding)
}

func headingLineEnding(block []byte) string {
	if bytes.Contains(block, []byte("\r\n")) {
		return "\r\n"
	}
	if bytes.Contains(block, []byte("\n")) {
		return "\n"
	}
	return "\n"
}

func escapeMarkdownTitle(title string) string {
	var escaped strings.Builder
	for _, character := range title {
		if character == '&' {
			escaped.WriteString("&amp;")
			continue
		}
		if character < utf8.RuneSelf && util.IsPunct(byte(character)) {
			escaped.WriteByte('\\')
		}
		escaped.WriteRune(character)
	}
	return escaped.String()
}

type componentFrontmatter struct {
	ID            string                      `yaml:"id"`
	Relationships []componentRelationshipYAML `yaml:"relationships"`
}

type componentRelationshipYAML struct {
	Target string `yaml:"target"`
	Label  string `yaml:"label"`
}

var componentMarkdown = goldmark.New(
	goldmark.WithExtensions(
		extension.Table,
		extension.TaskList,
		extension.Strikethrough,
		extension.Linkify,
	),
)

func parseComponent(path string, contents []byte) (component, error) {
	if !utf8.Valid(contents) {
		return component{}, errors.New("source is not valid UTF-8")
	}
	frontmatter, markdownSource, err := splitComponentFrontmatter(contents)
	if err != nil {
		return component{}, err
	}
	metadata, err := parseComponentFrontmatter(frontmatter)
	if err != nil {
		return component{}, err
	}
	componentID, err := uuid.Parse(metadata.ID)
	if err != nil {
		return component{}, errors.New("id is not a valid UUID")
	}

	document := componentMarkdown.Parser().Parse(text.NewReader(markdownSource))
	first := document.FirstChild()
	heading, ok := first.(*ast.Heading)
	if !ok || heading.Level != 1 {
		return component{}, errors.New("first Markdown block must be a level-one heading")
	}
	titleBytes, err := plainHeadingText(heading, markdownSource)
	if err != nil {
		return component{}, err
	}
	title := strings.TrimSpace(string(titleBytes))
	if title == "" {
		return component{}, errors.New("level-one heading title is empty")
	}
	bodyStart, err := headingBlockEnd(markdownSource, heading)
	if err != nil {
		return component{}, err
	}

	relationships := make([]componentRelationship, len(metadata.Relationships))
	for index, relationship := range metadata.Relationships {
		target, err := uuid.Parse(relationship.Target)
		if err != nil {
			return component{}, fmt.Errorf("relationship %d target is not a valid UUID", index+1)
		}
		relationships[index] = componentRelationship{target: target, label: relationship.Label}
	}
	body := append([]byte(nil), markdownSource[bodyStart:]...)
	headingStart, style, err := headingBlockStart(markdownSource, heading)
	if err != nil {
		return component{}, err
	}
	markdownStart := len(contents) - len(markdownSource)
	return component{
		id:            componentID,
		path:          path,
		title:         title,
		body:          body,
		relationships: relationships,
		headingStart:  markdownStart + headingStart,
		headingEnd:    markdownStart + bodyStart,
		headingStyle:  style,
	}, nil
}

func plainHeadingText(heading *ast.Heading, source []byte) ([]byte, error) {
	var result bytes.Buffer
	err := ast.Walk(heading, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		switch value := node.(type) {
		case *ast.CodeSpan:
			result.Write(value.Text(source))
			return ast.WalkSkipChildren, nil
		case *ast.AutoLink:
			result.Write(value.Label(source))
			return ast.WalkSkipChildren, nil
		case *ast.RawHTML:
			result.Write(value.Segments.Value(source))
			return ast.WalkSkipChildren, nil
		case *ast.Text:
			result.Write(resolveMarkdownText(value.Value(source)))
			if value.SoftLineBreak() || value.HardLineBreak() {
				result.WriteByte(' ')
			}
		case *ast.String:
			if value.IsCode() || value.IsRaw() {
				result.Write(value.Value)
			} else {
				result.Write(resolveMarkdownText(value.Value))
			}
		}
		return ast.WalkContinue, nil
	})
	if err != nil {
		return nil, fmt.Errorf("read level-one heading title: %w", err)
	}
	return result.Bytes(), nil
}

func resolveMarkdownText(source []byte) []byte {
	value := util.UnescapePunctuations(source)
	value = util.ResolveNumericReferences(value)
	return util.ResolveEntityNames(value)
}

func splitComponentFrontmatter(contents []byte) ([]byte, []byte, error) {
	firstLine, next, ok := sourceLine(contents, 0)
	if !ok || string(firstLine) != "---" {
		return nil, nil, errors.New("required YAML frontmatter is missing")
	}
	frontmatterStart := next
	for offset := next; offset <= len(contents); {
		lineStart := offset
		line, following, exists := sourceLine(contents, offset)
		if !exists {
			break
		}
		if string(line) == "---" {
			return contents[frontmatterStart:lineStart], contents[following:], nil
		}
		if following <= offset {
			break
		}
		offset = following
	}
	return nil, nil, errors.New("YAML frontmatter closing delimiter is missing")
}

func sourceLine(source []byte, offset int) ([]byte, int, bool) {
	if offset < 0 || offset > len(source) || offset == len(source) {
		return nil, offset, false
	}
	end := bytes.IndexByte(source[offset:], '\n')
	if end < 0 {
		line := source[offset:]
		return bytes.TrimSuffix(line, []byte{'\r'}), len(source), true
	}
	line := source[offset : offset+end]
	return bytes.TrimSuffix(line, []byte{'\r'}), offset + end + 1, true
}

func parseComponentFrontmatter(contents []byte) (componentFrontmatter, error) {
	decoder := yaml.NewDecoder(bytes.NewReader(contents))
	var document yaml.Node
	if err := decoder.Decode(&document); err != nil {
		return componentFrontmatter{}, fmt.Errorf("parse frontmatter: %w", err)
	}
	var extra yaml.Node
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return componentFrontmatter{}, errors.New("frontmatter contains multiple YAML documents")
		}
		return componentFrontmatter{}, fmt.Errorf("parse frontmatter: %w", err)
	}
	if len(document.Content) != 1 {
		return componentFrontmatter{}, errors.New("frontmatter must contain one mapping")
	}
	if err := validateComponentFrontmatterYAML(document.Content[0]); err != nil {
		return componentFrontmatter{}, err
	}
	var value componentFrontmatter
	if err := document.Content[0].Decode(&value); err != nil {
		return componentFrontmatter{}, fmt.Errorf("parse frontmatter: %w", err)
	}
	return value, nil
}

func validateComponentFrontmatterYAML(root *yaml.Node) error {
	if root.Kind != yaml.MappingNode || root.ShortTag() != "!!map" {
		return errors.New("frontmatter must contain a mapping")
	}
	required := map[string]bool{"id": false}
	seenRelationships := false
	for index := 0; index < len(root.Content); index += 2 {
		key := root.Content[index]
		value := root.Content[index+1]
		if key.Kind != yaml.ScalarNode || key.ShortTag() != "!!str" {
			return errors.New("frontmatter field names must be strings")
		}
		switch key.Value {
		case "id":
			if required["id"] {
				return errors.New("frontmatter contains duplicate field \"id\"")
			}
			required["id"] = true
			if value.Kind != yaml.ScalarNode || value.ShortTag() != "!!str" {
				return errors.New("frontmatter field id must be a string")
			}
		case "relationships":
			if seenRelationships {
				return errors.New("frontmatter contains duplicate field \"relationships\"")
			}
			seenRelationships = true
			if value.Kind != yaml.SequenceNode || value.ShortTag() != "!!seq" {
				return errors.New("frontmatter field relationships must be a sequence")
			}
			for relationshipIndex, relationship := range value.Content {
				if err := validateRelationshipYAML(relationship); err != nil {
					return fmt.Errorf("relationship %d: %w", relationshipIndex+1, err)
				}
			}
		default:
			return fmt.Errorf("frontmatter contains unknown field %q", key.Value)
		}
	}
	if !required["id"] {
		return errors.New("frontmatter is missing field \"id\"")
	}
	return nil
}

func validateRelationshipYAML(root *yaml.Node) error {
	if root.Kind != yaml.MappingNode || root.ShortTag() != "!!map" {
		return errors.New("item must be a mapping")
	}
	required := map[string]bool{"target": false, "label": false}
	for index := 0; index < len(root.Content); index += 2 {
		key := root.Content[index]
		value := root.Content[index+1]
		if key.Kind != yaml.ScalarNode || key.ShortTag() != "!!str" {
			return errors.New("field names must be strings")
		}
		if _, known := required[key.Value]; !known {
			return fmt.Errorf("contains unknown field %q", key.Value)
		}
		if required[key.Value] {
			return fmt.Errorf("contains duplicate field %q", key.Value)
		}
		required[key.Value] = true
		if value.Kind != yaml.ScalarNode || value.ShortTag() != "!!str" {
			return fmt.Errorf("field %s must be a string", key.Value)
		}
	}
	for field, present := range required {
		if !present {
			return fmt.Errorf("is missing field %q", field)
		}
	}
	label := relationshipField(root, "label")
	if strings.TrimSpace(label) == "" {
		return errors.New("label is empty")
	}
	return nil
}

func relationshipField(root *yaml.Node, name string) string {
	for index := 0; index < len(root.Content); index += 2 {
		if root.Content[index].Value == name {
			return root.Content[index+1].Value
		}
	}
	return ""
}

func headingBlockEnd(source []byte, heading *ast.Heading) (int, error) {
	lines := heading.Lines()
	if lines == nil || lines.Len() == 0 {
		return 0, errors.New("level-one heading has no source location")
	}
	first := lines.At(0)
	lineStart := bytes.LastIndexByte(source[:first.Start], '\n') + 1
	lineEnd := endOfSourceLine(source, first.Stop)
	line := bytes.TrimLeft(source[lineStart:lineEnd], " \t")
	if (len(line) == 1 && line[0] == '#') || (len(line) > 1 && line[0] == '#' && (line[1] == ' ' || line[1] == '\t' || line[1] == '\r' || line[1] == '\n')) {
		return lineEnd, nil
	}
	last := lines.At(lines.Len() - 1)
	contentEnd := endOfSourceLine(source, last.Stop)
	underlineEnd := endOfLineStartingAt(source, contentEnd)
	if underlineEnd == contentEnd {
		return 0, errors.New("Setext level-one heading is incomplete")
	}
	return underlineEnd, nil
}

func headingBlockStart(source []byte, heading *ast.Heading) (int, headingStyle, error) {
	lines := heading.Lines()
	if lines == nil || lines.Len() == 0 {
		return 0, headingATX, errors.New("level-one heading has no source location")
	}
	first := lines.At(0)
	lineStart := bytes.LastIndexByte(source[:first.Start], '\n') + 1
	lineEnd := endOfSourceLine(source, first.Stop)
	line := bytes.TrimLeft(source[lineStart:lineEnd], " \t")
	if (len(line) == 1 && line[0] == '#') || (len(line) > 1 && line[0] == '#' && (line[1] == ' ' || line[1] == '\t' || line[1] == '\r' || line[1] == '\n')) {
		return lineStart, headingATX, nil
	}
	return lineStart, headingSetext, nil
}

func endOfSourceLine(source []byte, offset int) int {
	if offset > len(source) {
		return len(source)
	}
	if offset > 0 && source[offset-1] == '\n' {
		return offset
	}
	if newline := bytes.IndexByte(source[offset:], '\n'); newline >= 0 {
		return offset + newline + 1
	}
	return len(source)
}

func endOfLineStartingAt(source []byte, offset int) int {
	if offset >= len(source) {
		return len(source)
	}
	if newline := bytes.IndexByte(source[offset:], '\n'); newline >= 0 {
		return offset + newline + 1
	}
	return len(source)
}

type manifest struct {
	Format  string          `yaml:"format"`
	Version int             `yaml:"version"`
	StoreID string          `yaml:"store_id"`
	Project manifestProject `yaml:"project"`
}

type manifestProject struct {
	Name       string `yaml:"name"`
	SourceHint string `yaml:"source_hint"`
}

func marshalManifest(value manifest) ([]byte, error) {
	if err := validateManifest(value); err != nil {
		return nil, err
	}
	return yaml.Marshal(value)
}

func parseManifest(contents []byte) (manifest, error) {
	decoder := yaml.NewDecoder(bytes.NewReader(contents))
	var document yaml.Node
	if err := decoder.Decode(&document); err != nil {
		return manifest{}, fmt.Errorf("parse architecture.yaml: %w", err)
	}
	var extra yaml.Node
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return manifest{}, errors.New("architecture.yaml contains multiple YAML documents")
		}
		return manifest{}, fmt.Errorf("parse architecture.yaml: %w", err)
	}
	if len(document.Content) != 1 {
		return manifest{}, errors.New("architecture.yaml must contain one mapping")
	}
	if err := validateManifestYAML(document.Content[0]); err != nil {
		return manifest{}, err
	}
	var value manifest
	if err := document.Content[0].Decode(&value); err != nil {
		return manifest{}, fmt.Errorf("parse architecture.yaml: %w", err)
	}
	if err := validateManifest(value); err != nil {
		return manifest{}, err
	}
	return value, nil
}

func validateManifestYAML(root *yaml.Node) error {
	if root.Kind != yaml.MappingNode || root.ShortTag() != "!!map" {
		return errors.New("architecture.yaml must contain a mapping")
	}
	required := map[string]bool{
		"format": false, "version": false, "store_id": false, "project": false,
	}
	for index := 0; index < len(root.Content); index += 2 {
		key := root.Content[index]
		value := root.Content[index+1]
		if key.Kind != yaml.ScalarNode || key.ShortTag() != "!!str" {
			return errors.New("architecture.yaml field names must be strings")
		}
		if _, known := required[key.Value]; !known {
			return fmt.Errorf("architecture.yaml contains unknown field %q", key.Value)
		}
		if required[key.Value] {
			return fmt.Errorf("architecture.yaml contains duplicate field %q", key.Value)
		}
		required[key.Value] = true
		switch key.Value {
		case "format", "store_id":
			if value.Kind != yaml.ScalarNode || value.ShortTag() != "!!str" {
				return fmt.Errorf("architecture.yaml field %s must be a string", key.Value)
			}
		case "version":
			if value.Kind != yaml.ScalarNode || value.ShortTag() != "!!int" {
				return errors.New("architecture.yaml field version must be an integer")
			}
		case "project":
			if err := validateManifestProjectYAML(value); err != nil {
				return err
			}
		}
	}
	for field, present := range required {
		if !present {
			return fmt.Errorf("architecture.yaml is missing field %q", field)
		}
	}
	return nil
}

func validateManifestProjectYAML(project *yaml.Node) error {
	if project.Kind != yaml.MappingNode || project.ShortTag() != "!!map" {
		return errors.New("architecture.yaml field project must be a mapping")
	}
	required := map[string]bool{"name": false, "source_hint": false}
	for index := 0; index < len(project.Content); index += 2 {
		key := project.Content[index]
		value := project.Content[index+1]
		if key.Kind != yaml.ScalarNode || key.ShortTag() != "!!str" {
			return errors.New("architecture.yaml project field names must be strings")
		}
		if _, known := required[key.Value]; !known {
			return fmt.Errorf("architecture.yaml project contains unknown field %q", key.Value)
		}
		if required[key.Value] {
			return fmt.Errorf("architecture.yaml project contains duplicate field %q", key.Value)
		}
		required[key.Value] = true
		if value.Kind != yaml.ScalarNode || value.ShortTag() != "!!str" {
			return fmt.Errorf("architecture.yaml field project.%s must be a string", key.Value)
		}
	}
	for field, present := range required {
		if !present {
			return fmt.Errorf("architecture.yaml project is missing field %q", field)
		}
	}
	return nil
}

func validateManifest(value manifest) error {
	if value.Format != "workbraid-architecture" {
		return errors.New("unsupported Architecture format")
	}
	if value.Version != 1 {
		return errors.New("unsupported Architecture format version")
	}
	if _, err := uuid.Parse(value.StoreID); err != nil {
		return errors.New("store_id is not a valid UUID")
	}
	if strings.TrimSpace(value.Project.Name) == "" {
		return errors.New("project.name is empty")
	}
	if strings.TrimSpace(value.Project.SourceHint) == "" {
		return errors.New("project.source_hint is empty")
	}
	return nil
}
