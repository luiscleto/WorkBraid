package architecture

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
)

func TestInitializeCreatesAndLoadsExactBootstrap(t *testing.T) {
	dataDirectory := t.TempDir()
	manager := NewManager(dataDirectory)
	storeID := uuid.NewString()
	sourceHint := filepath.Join(t.TempDir(), "example-project")

	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Example Project", sourceHint)
	if err != nil {
		t.Fatalf("initialize: %v", err)
	}
	if snapshot.Revision() == "" || snapshot.ComponentCount() != 0 {
		t.Fatalf("unexpected snapshot: revision=%q components=%d", snapshot.Revision(), snapshot.ComponentCount())
	}

	storePath, err := manager.StorePath(storeID)
	if err != nil {
		t.Fatal(err)
	}
	if bare := gitText(t, "--git-dir", storePath, "rev-parse", "--is-bare-repository"); bare != "true" {
		t.Fatalf("repository is bare = %q", bare)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != snapshot.Revision() {
		t.Fatalf("accepted = %q, snapshot = %q", accepted, snapshot.Revision())
	}
	if commitLine := gitText(t, "--git-dir", storePath, "rev-list", "--parents", "-n", "1", snapshot.Revision()); commitLine != snapshot.Revision() {
		t.Fatalf("bootstrap is not parentless: %q", commitLine)
	}
	if tree := gitText(t, "--git-dir", storePath, "ls-tree", snapshot.Revision()); !strings.HasPrefix(tree, "100644 blob ") || !strings.HasSuffix(tree, "\tarchitecture.yaml") || strings.Contains(tree, "\n") {
		t.Fatalf("unexpected bootstrap tree: %q", tree)
	}
	manifestBytes, err := runGit(context.Background(), nil, "--git-dir", storePath, "show", snapshot.Revision()+":architecture.yaml")
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := parseManifest(manifestBytes)
	if err != nil {
		t.Fatalf("parse generated manifest: %v", err)
	}
	if parsed.Format != "workbraid-architecture" || parsed.Version != 1 || parsed.StoreID != storeID || parsed.Project.Name != "Example Project" || parsed.Project.SourceHint != sourceHint {
		t.Fatalf("unexpected manifest: %+v", parsed)
	}

	gitText(t, "--git-dir", storePath, "symbolic-ref", "HEAD", "refs/heads/unrelated")
	reloaded, err := manager.InitializeOrLoad(context.Background(), storeID, "Ignored", "/ignored")
	if err != nil {
		t.Fatalf("load with unrelated HEAD: %v", err)
	}
	if reloaded.Revision() != snapshot.Revision() {
		t.Fatalf("reloaded revision = %q, want %q", reloaded.Revision(), snapshot.Revision())
	}
	if commits := gitText(t, "--git-dir", storePath, "rev-list", "--all", "--count"); commits != "1" {
		t.Fatalf("retry created another bootstrap commit: count=%s", commits)
	}
}

func TestIncompleteInitializationRetriesAtSameLocation(t *testing.T) {
	dataDirectory := t.TempDir()
	manager := NewManager(dataDirectory)
	storeID := uuid.NewString()
	blockingPath := filepath.Join(dataDirectory, "architecture")
	if err := os.WriteFile(blockingPath, []byte("blocks repository directory"), 0o600); err != nil {
		t.Fatal(err)
	}

	_, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if !errors.Is(err, ErrIncomplete) {
		t.Fatalf("first initialization error = %v, want incomplete", err)
	}
	storePath, _ := manager.StorePath(storeID)
	if _, err := os.Stat(storePath); err == nil {
		t.Fatal("store unexpectedly exists after interruption")
	}
	if err := os.Remove(blockingPath); err != nil {
		t.Fatal(err)
	}

	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatalf("retry: %v", err)
	}
	if snapshot.Revision() == "" {
		t.Fatal("retry did not load an accepted revision")
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != snapshot.Revision() {
		t.Fatalf("retry loaded %q, accepted is %q", snapshot.Revision(), accepted)
	}
}

func TestRetryCompletesAnEmptyAssociatedStoreDirectory(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	storePath, _ := manager.StorePath(storeID)
	if err := os.MkdirAll(storePath, 0o700); err != nil {
		t.Fatal(err)
	}

	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatalf("retry empty store directory: %v", err)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != snapshot.Revision() {
		t.Fatalf("accepted = %q, snapshot = %q", accepted, snapshot.Revision())
	}
}

func TestLoadRejectsIdentityMismatchWithoutChangingAccepted(t *testing.T) {
	manager := NewManager(t.TempDir())
	associatedID := uuid.NewString()
	snapshot, err := manager.InitializeOrLoad(context.Background(), associatedID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(associatedID)

	wrongManifest, err := marshalManifest(manifest{
		Format: "workbraid-architecture", Version: 1, StoreID: uuid.NewString(),
		Project: manifestProject{Name: "Project", SourceHint: "/tmp/project"},
	})
	if err != nil {
		t.Fatal(err)
	}
	wrongCommit := commitManifestTree(t, storePath, wrongManifest, "100644", nil)
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, wrongCommit, snapshot.Revision())

	_, err = manager.InitializeOrLoad(context.Background(), associatedID, "Project", "/tmp/project")
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("mismatch error = %v, want invalid", err)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != wrongCommit {
		t.Fatalf("load changed accepted from %q to %q", wrongCommit, accepted)
	}
}

func TestLoadReportsComponentBearingV1TreeAsUnsupported(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(storeID)
	manifestBytes := gitBytes(t, "--git-dir", storePath, "show", snapshot.Revision()+":architecture.yaml")
	component := []byte("---\nid: \"" + uuid.NewString() + "\"\nrelationships: []\n---\n# API\n")
	componentBlob := writeTestBlob(t, storePath, component)
	componentTree := mktree(t, storePath, "100644 blob "+componentBlob+"\tapi.md\n")
	commit := commitManifestTree(t, storePath, manifestBytes, "100644", []string{"040000 tree " + componentTree + "\tcomponents"})
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, commit, snapshot.Revision())

	_, err = manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if !errors.Is(err, ErrUnsupported) || errors.Is(err, ErrInvalid) {
		t.Fatalf("component-bearing tree error = %v, want unsupported and not invalid", err)
	}
}

func TestLoadRejectsNonOrdinaryManifestPath(t *testing.T) {
	for _, kind := range []string{"tree", "symlink"} {
		t.Run(kind, func(t *testing.T) {
			manager := NewManager(t.TempDir())
			storeID := uuid.NewString()
			snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
			if err != nil {
				t.Fatal(err)
			}
			storePath, _ := manager.StorePath(storeID)
			fileBlob := writeTestBlob(t, storePath, []byte("nested"))
			var entry string
			if kind == "tree" {
				subtree := mktree(t, storePath, "100644 blob "+fileBlob+"\tvalue\n")
				entry = "040000 tree " + subtree + "\tarchitecture.yaml\n"
			} else {
				entry = "120000 blob " + fileBlob + "\tarchitecture.yaml\n"
			}
			tree := mktree(t, storePath, entry)
			commit := gitTextWithInput(t, []byte("non-ordinary manifest\n"), "--git-dir", storePath, "commit-tree", tree)
			gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, commit, snapshot.Revision())

			_, err = manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
			if !errors.Is(err, ErrInvalid) {
				t.Fatalf("non-ordinary manifest error = %v, want invalid", err)
			}
			if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != commit {
				t.Fatalf("failed load changed accepted from %q to %q", commit, accepted)
			}
		})
	}
}

func TestUnacceptedObjectsDoNotBecomeAcceptedState(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	storePath, _ := manager.StorePath(storeID)
	if err := os.MkdirAll(filepath.Dir(storePath), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := manager.git.initBare(context.Background(), storePath); err != nil {
		t.Fatal(err)
	}
	dangling := commitManifestTree(t, storePath, []byte("not: the bootstrap\n"), "100644", nil)

	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	if snapshot.Revision() == dangling {
		t.Fatal("dangling commit became accepted")
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != snapshot.Revision() {
		t.Fatalf("accepted = %q, snapshot = %q", accepted, snapshot.Revision())
	}
}

func TestAcceptedRefCreationFailureLeavesOnlyUnacceptedObjects(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	storePath, _ := manager.StorePath(storeID)
	if err := os.MkdirAll(filepath.Dir(storePath), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := manager.git.initBare(context.Background(), storePath); err != nil {
		t.Fatal(err)
	}
	lockPath := filepath.Join(storePath, "refs", "heads", "accepted.lock")
	if err := os.WriteFile(lockPath, []byte("external lock"), 0o600); err != nil {
		t.Fatal(err)
	}

	_, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if !errors.Is(err, ErrIncomplete) {
		t.Fatalf("ref creation error = %v, want incomplete", err)
	}
	if _, present, err := manager.git.resolveRef(context.Background(), storePath, acceptedRef); err != nil || present {
		t.Fatalf("accepted after failed create = present:%t error:%v", present, err)
	}
	if unreachable := gitText(t, "--git-dir", storePath, "fsck", "--unreachable", "--no-reflogs"); !strings.Contains(unreachable, "commit ") {
		t.Fatalf("expected an unaccepted commit object, got %q", unreachable)
	}
	if err := os.Remove(lockPath); err != nil {
		t.Fatal(err)
	}
	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatalf("retry after external lock: %v", err)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != snapshot.Revision() {
		t.Fatalf("accepted = %q, snapshot = %q", accepted, snapshot.Revision())
	}
}

func TestManifestSchemaIsClosed(t *testing.T) {
	storeID := uuid.NewString()
	base := "format: workbraid-architecture\nversion: 1\nstore_id: \"" + storeID + "\"\nproject:\n  name: Project\n  source_hint: /tmp/project\n"
	for name, contents := range map[string]string{
		"top-level unknown":   base + "extra: true\n",
		"project unknown":     strings.Replace(base, "  source_hint: /tmp/project\n", "  source_hint: /tmp/project\n  extra: true\n", 1),
		"unsupported version": strings.Replace(base, "version: 1", "version: 2", 1),
		"empty name":          strings.Replace(base, "name: Project", "name: '   '", 1),
		"multiple documents":  base + "---\nformat: workbraid-architecture\n",
		"wrong format type":   strings.Replace(base, "format: workbraid-architecture", "format: [workbraid-architecture]", 1),
		"wrong version type":  strings.Replace(base, "version: 1", "version: one", 1),
		"wrong project type":  strings.Replace(base, "project:\n  name: Project\n  source_hint: /tmp/project", "project: Project", 1),
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := parseManifest([]byte(contents)); err == nil {
				t.Fatal("manifest unexpectedly parsed")
			}
		})
	}
}

func commitManifestTree(t *testing.T, repository string, manifestBytes []byte, mode string, otherEntries []string) string {
	t.Helper()
	blob := writeTestBlob(t, repository, manifestBytes)
	lines := append([]string{mode + " blob " + blob + "\tarchitecture.yaml"}, otherEntries...)
	tree := mktree(t, repository, strings.Join(lines, "\n")+"\n")
	return gitTextWithInput(t, []byte("test commit\n"), "--git-dir", repository, "commit-tree", tree)
}

func writeTestBlob(t *testing.T, repository string, contents []byte) string {
	t.Helper()
	return gitTextWithInput(t, contents, "--git-dir", repository, "hash-object", "-w", "--stdin")
}

func mktree(t *testing.T, repository, input string) string {
	t.Helper()
	return gitTextWithInput(t, []byte(input), "--git-dir", repository, "mktree")
}

func gitText(t *testing.T, arguments ...string) string {
	t.Helper()
	return strings.TrimSpace(string(gitBytes(t, arguments...)))
}

func gitTextWithInput(t *testing.T, input []byte, arguments ...string) string {
	t.Helper()
	output, err := runGit(context.Background(), input, arguments...)
	if err != nil {
		t.Fatalf("git %v: %v", arguments, err)
	}
	return strings.TrimSpace(string(output))
}

func gitBytes(t *testing.T, arguments ...string) []byte {
	t.Helper()
	output, err := runGit(context.Background(), nil, arguments...)
	if err != nil {
		t.Fatalf("git %v: %v", arguments, err)
	}
	return output
}
