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
			// The directory entry itself is permitted when direct component files exist.
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
	if componentsPresent {
		return Snapshot{}, ErrUnsupported
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
	decoder.KnownFields(true)
	var value manifest
	if err := decoder.Decode(&value); err != nil {
		return manifest{}, fmt.Errorf("parse architecture.yaml: %w", err)
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return manifest{}, errors.New("architecture.yaml contains multiple YAML documents")
		}
		return manifest{}, fmt.Errorf("parse architecture.yaml: %w", err)
	}
	if err := validateManifest(value); err != nil {
		return manifest{}, err
	}
	return value, nil
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
