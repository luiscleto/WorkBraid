package architecture

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
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
	ErrUnsupported = errors.New("Architecture components are not supported yet")
)

// Snapshot is immutable accepted Architecture state pinned to one Git commit.
// I1.2 loads only the valid zero-component form.
type Snapshot struct {
	storeID        uuid.UUID
	revision       string
	componentCount int
}

func (snapshot Snapshot) Revision() string    { return snapshot.revision }
func (snapshot Snapshot) ComponentCount() int { return snapshot.componentCount }

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
	componentsPresent := false
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
			componentsPresent = true
		default:
			return Snapshot{}, fmt.Errorf("%w: accepted tree contains unsupported path %q", ErrInvalid, entry.Path)
		}
	}
	if manifestEntry == nil {
		return Snapshot{}, fmt.Errorf("%w: architecture.yaml is missing", ErrInvalid)
	}
	if componentsTreePresent && !componentsPresent {
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
	if componentsPresent {
		return Snapshot{}, ErrUnsupported
	}
	return Snapshot{storeID: expectedStoreID, revision: revision, componentCount: 0}, nil
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
