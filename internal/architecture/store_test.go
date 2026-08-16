package architecture

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"sort"
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
	reloaded, err := NewManager(dataDirectory).LoadAccepted(context.Background(), storeID)
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

func TestLoadAcceptedLeavesMissingStoreMissing(t *testing.T) {
	dataDirectory := t.TempDir()
	manager := NewManager(dataDirectory)
	storeID := uuid.NewString()
	storePath, _ := manager.StorePath(storeID)

	_, err := manager.LoadAccepted(context.Background(), storeID)
	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("missing store error = %v, want unavailable", err)
	}
	if _, err := os.Stat(storePath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("read-only load created missing store: %v", err)
	}
}

func TestLoadAcceptedNeverFallsBackFromMissingAccepted(t *testing.T) {
	dataDirectory := t.TempDir()
	manager := NewManager(dataDirectory)
	storeID := uuid.NewString()
	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(storeID)
	gitText(t, "--git-dir", storePath, "update-ref", "refs/heads/plausible", snapshot.Revision())
	gitText(t, "--git-dir", storePath, "symbolic-ref", "HEAD", "refs/heads/plausible")
	gitText(t, "--git-dir", storePath, "update-ref", "-d", acceptedRef, snapshot.Revision())
	before := acceptedAuthorityState(t, storePath)

	_, err = NewManager(dataDirectory).LoadAccepted(context.Background(), storeID)
	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("missing accepted error = %v, want unavailable", err)
	}
	if after := acceptedAuthorityState(t, storePath); after != before {
		t.Fatalf("read-only load changed private repository\nbefore:\n%s\nafter:\n%s", before, after)
	}
	if _, present, err := manager.git.resolveRef(context.Background(), storePath, acceptedRef); err != nil || present {
		t.Fatalf("accepted was recreated: present=%t err=%v", present, err)
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

	_, err = manager.LoadAccepted(context.Background(), associatedID)
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("mismatch error = %v, want invalid", err)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != wrongCommit {
		t.Fatalf("load changed accepted from %q to %q", wrongCommit, accepted)
	}
}

func TestLoadRejectsNonStringRecoveryHintsFromAcceptedGitTree(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(storeID)
	typedManifest := []byte("format: workbraid-architecture\nversion: 1\nstore_id: \"" + storeID + "\"\nproject:\n  name: 123\n  source_hint: true\n")
	commit := commitManifestTree(t, storePath, typedManifest, "100644", nil)
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, commit, snapshot.Revision())

	loaded, err := manager.LoadAccepted(context.Background(), storeID)
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("typed recovery hints load = (%+v, %v), want invalid", loaded, err)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != commit {
		t.Fatalf("failed load changed accepted from %q to %q", commit, accepted)
	}
}

func TestLoadAcceptedComponentSnapshotFromRealGit(t *testing.T) {
	dataDirectory := t.TempDir()
	manager := NewManager(dataDirectory)
	storeID := uuid.NewString()
	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(storeID)
	manifestBytes := gitBytes(t, "--git-dir", storePath, "show", snapshot.Revision()+":architecture.yaml")
	apiID := uuid.NewString()
	workerID := uuid.NewString()
	duplicateTitleID := uuid.NewString()
	omittedID := uuid.NewString()
	api := []byte("---\nid: \"" + apiID + "\"\nrelationships:\n  - target: \"" + workerID + "\"\n    label: \"calls\"\n  - target: \"" + workerID + "\"\n    label: \"observes\"\n---\n\n# Shared title\n\nAPI body with [a link](https://example.invalid).\n")
	worker := []byte("---\nid: \"" + workerID + "\"\nrelationships:\n  - target: \"" + apiID + "\"\n    label: \"responds to\"\n---\nWorker\n======\n<div>inert source</div>\n")
	duplicateTitle := []byte("---\nid: \"" + duplicateTitleID + "\"\nrelationships: []\n---\n# Shared title\n```mermaid\ngraph TD\n```\n")
	omitted := []byte("---\nid: \"" + omittedID + "\"\n---\n# Other\n[Markdown link](https://example.invalid/other)\n")
	apiBlob := writeTestBlob(t, storePath, api)
	workerBlob := writeTestBlob(t, storePath, worker)
	duplicateBlob := writeTestBlob(t, storePath, duplicateTitle)
	omittedBlob := writeTestBlob(t, storePath, omitted)
	componentTree := mktree(t, storePath, strings.Join([]string{
		"100644 blob " + duplicateBlob + "\tanything.md",
		"100644 blob " + apiBlob + "\todd name.md",
		"100644 blob " + omittedBlob + "\tomitted.md",
		"100755 blob " + workerBlob + "\tworker.md",
	}, "\n")+"\n")
	commit := commitManifestTree(t, storePath, manifestBytes, "100644", []string{"040000 tree " + componentTree + "\tcomponents"})
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, commit, snapshot.Revision())
	before := acceptedAuthorityState(t, storePath)

	loaded, err := manager.LoadAccepted(context.Background(), storeID)
	if err != nil {
		t.Fatalf("load component-bearing tree: %v", err)
	}
	if loaded.Revision() != commit || loaded.ComponentCount() != 4 {
		t.Fatalf("loaded snapshot revision=%q components=%d", loaded.Revision(), loaded.ComponentCount())
	}
	if got := loaded.ComponentTitles(); strings.Join(got, "|") != "Shared title|Shared title|Other|Worker" {
		t.Fatalf("component titles = %q", got)
	}
	byID := make(map[uuid.UUID]component)
	for _, component := range loaded.components {
		byID[component.id] = component
	}
	parsedAPI := byID[uuid.MustParse(apiID)]
	if parsedAPI.path != "components/odd name.md" || string(parsedAPI.body) != "\nAPI body with [a link](https://example.invalid).\n" {
		t.Fatalf("API path/body = %q / %q", parsedAPI.path, parsedAPI.body)
	}
	if len(parsedAPI.relationships) != 2 ||
		parsedAPI.relationships[0].target != uuid.MustParse(workerID) || parsedAPI.relationships[0].label != "calls" ||
		parsedAPI.relationships[1].target != uuid.MustParse(workerID) || parsedAPI.relationships[1].label != "observes" {
		t.Fatalf("API relationships = %+v", parsedAPI.relationships)
	}
	parsedWorker := byID[uuid.MustParse(workerID)]
	if string(parsedWorker.body) != "<div>inert source</div>\n" || len(parsedWorker.relationships) != 1 || parsedWorker.relationships[0].target != uuid.MustParse(apiID) || parsedWorker.relationships[0].label != "responds to" {
		t.Fatalf("worker body/relationships = %q / %+v", parsedWorker.body, parsedWorker.relationships)
	}
	if relationships := byID[uuid.MustParse(duplicateTitleID)].relationships; len(relationships) != 0 {
		t.Fatalf("empty relationship sequence parsed as %+v", relationships)
	}
	if relationships := byID[uuid.MustParse(omittedID)].relationships; len(relationships) != 0 {
		t.Fatalf("Markdown link or omitted relationships parsed as %+v", relationships)
	}
	if after := acceptedAuthorityState(t, storePath); after != before {
		t.Fatalf("component load changed accepted repository\nbefore:\n%s\nafter:\n%s", before, after)
	}
	reconstructed, err := NewManager(dataDirectory).LoadAccepted(context.Background(), storeID)
	if err != nil {
		t.Fatalf("reconstruct component snapshot with a new Manager: %v", err)
	}
	if reconstructed.Revision() != commit {
		t.Fatalf("reconstructed revision = %q, want %q", reconstructed.Revision(), commit)
	}
	loadedState := retainedComponentState(loaded)
	reconstructedState := retainedComponentState(reconstructed)
	if !reflect.DeepEqual(reconstructedState, loadedState) {
		t.Fatalf("reconstructed retained fields differ\nloaded: %#v\nreconstructed: %#v", loadedState, reconstructedState)
	}
	if after := acceptedAuthorityState(t, storePath); after != before {
		t.Fatalf("new-Manager reconstruction changed accepted repository\nbefore:\n%s\nafter:\n%s", before, after)
	}

	renamedTree := mktree(t, storePath, strings.Join([]string{
		"100644 blob " + duplicateBlob + "\tanything.md",
		"100644 blob " + omittedBlob + "\tomitted.md",
		"100644 blob " + apiBlob + "\trenamed.md",
		"100755 blob " + workerBlob + "\tworker.md",
	}, "\n")+"\n")
	renamedCommit := commitManifestTree(t, storePath, manifestBytes, "100644", []string{"040000 tree " + renamedTree + "\tcomponents"})
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, renamedCommit, commit)
	renamed, err := manager.LoadAccepted(context.Background(), storeID)
	if err != nil {
		t.Fatalf("load renamed component: %v", err)
	}
	var renamedAPI component
	for _, component := range renamed.components {
		if component.id == uuid.MustParse(apiID) {
			renamedAPI = component
		}
	}
	if renamedAPI.id != uuid.MustParse(apiID) || renamedAPI.path != "components/renamed.md" || renamedAPI.title != "Shared title" {
		t.Fatalf("renamed component identity/path/title = %s / %q / %q", renamedAPI.id, renamedAPI.path, renamedAPI.title)
	}
}

type retainedComponent struct {
	path          string
	title         string
	body          string
	relationships []string
}

func retainedComponentState(snapshot Snapshot) map[uuid.UUID]retainedComponent {
	state := make(map[uuid.UUID]retainedComponent, len(snapshot.components))
	for _, component := range snapshot.components {
		relationships := make([]string, len(component.relationships))
		for index, relationship := range component.relationships {
			relationships[index] = relationship.target.String() + "\x00" + relationship.label
		}
		sort.Strings(relationships)
		state[component.id] = retainedComponent{
			path:          component.path,
			title:         component.title,
			body:          string(component.body),
			relationships: relationships,
		}
	}
	return state
}

func TestParseComponentPreservesExactBodyAfterCompleteHeadingBlock(t *testing.T) {
	id := uuid.NewString()
	for _, test := range []struct {
		name   string
		source string
		title  string
		body   string
	}{
		{
			name:   "ATX with optional whitespace",
			source: "---\r\nid: \"" + id + "\"\r\nrelationships: []\r\n---\r\n \r\n# API #\r\n\r\nBody  \r\n",
			title:  "API",
			body:   "\r\nBody  \r\n",
		},
		{
			name:   "Setext",
			source: "---\nid: \"" + id + "\"\n---\nComponent *title*\n=================\n\n- exact body\n",
			title:  "Component title",
			body:   "\n- exact body\n",
		},
		{
			name:   "Setext text beginning with hash",
			source: "---\nid: \"" + id + "\"\n---\n#not an ATX heading\n===================\nBody\n",
			title:  "#not an ATX heading",
			body:   "Body\n",
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			component, err := parseComponent("components/value.md", []byte(test.source))
			if err != nil {
				t.Fatalf("parse component: %v", err)
			}
			if component.title != test.title || string(component.body) != test.body {
				t.Fatalf("title/body = %q / %q, want %q / %q", component.title, component.body, test.title, test.body)
			}
		})
	}
}

func TestComponentFrontmatterSchemaIsClosedAndTyped(t *testing.T) {
	id := uuid.NewString()
	target := uuid.NewString()
	valid := "---\nid: \"" + id + "\"\nrelationships:\n  - target: \"" + target + "\"\n    label: calls\n---\n# Component\n"
	for name, source := range map[string][]byte{
		"non-mapping frontmatter":     []byte("---\n- id\n---\n# Component\n"),
		"malformed frontmatter":       []byte("---\nid: [\n---\n# Component\n"),
		"missing closing delimiter":   []byte("---\nid: \"" + id + "\"\n# Component\n"),
		"unknown component field":     []byte(strings.Replace(valid, "relationships:", "unknown: true\nrelationships:", 1)),
		"duplicate component field":   []byte(strings.Replace(valid, "relationships:", "id: \""+id+"\"\nrelationships:", 1)),
		"wrong id type":               []byte(strings.Replace(valid, "id: \""+id+"\"", "id: 123", 1)),
		"wrong relationships type":    []byte(strings.Replace(valid, "relationships:\n  - target:", "relationships: value\nignored:\n  - target:", 1)),
		"non-mapping relationship":    []byte(strings.Replace(valid, "  - target: \""+target+"\"\n    label: calls", "  - calls", 1)),
		"unknown relationship field":  []byte(strings.Replace(valid, "    label: calls", "    label: calls\n    extra: true", 1)),
		"duplicate relationship key":  []byte(strings.Replace(valid, "    label: calls", "    label: calls\n    label: again", 1)),
		"wrong relationship type":     []byte(strings.Replace(valid, "label: calls", "label: [calls]", 1)),
		"empty relationship label":    []byte(strings.Replace(valid, "label: calls", "label: '   '", 1)),
		"invalid relationship target": []byte(strings.Replace(valid, target, "not-a-uuid", 1)),
		"invalid UTF-8":               append([]byte(valid), 0xff),
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := parseComponent("components/value.md", source); err == nil {
				t.Fatal("component unexpectedly parsed")
			}
		})
	}
}

func TestComponentRequiresFirstNonEmptyH1Block(t *testing.T) {
	id := uuid.NewString()
	prefix := "---\nid: \"" + id + "\"\n---\n"
	for name, markdown := range map[string]string{
		"missing":      "Body only\n",
		"not first":    "Body first\n\n# Later\n",
		"level two":    "## Component\n",
		"empty ATX":    "#   \n",
		"empty Setext": "   \n===\n",
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := parseComponent("components/value.md", []byte(prefix+markdown)); err == nil {
				t.Fatal("component unexpectedly parsed")
			}
		})
	}
}

func TestLoadRejectsDuplicateIDsAndUnresolvedRelationshipsAtomically(t *testing.T) {
	for _, test := range []struct {
		name       string
		components func() []string
	}{
		{
			name: "duplicate IDs",
			components: func() []string {
				id := uuid.NewString()
				return []string{
					"---\nid: \"" + id + "\"\n---\n# One\n",
					"---\nid: \"" + id + "\"\n---\n# Two\n",
				}
			},
		},
		{
			name: "string ID that is not a UUID",
			components: func() []string {
				return []string{"---\nid: \"not-a-uuid\"\nrelationships: []\n---\n# One\n"}
			},
		},
		{
			name: "unresolved relationship",
			components: func() []string {
				return []string{"---\nid: \"" + uuid.NewString() + "\"\nrelationships:\n  - target: \"" + uuid.NewString() + "\"\n    label: calls\n---\n# One\n"}
			},
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			manager := NewManager(t.TempDir())
			storeID := uuid.NewString()
			base, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
			if err != nil {
				t.Fatal(err)
			}
			storePath, _ := manager.StorePath(storeID)
			manifest := gitBytes(t, "--git-dir", storePath, "show", base.Revision()+":architecture.yaml")
			var componentEntries []string
			for index, source := range test.components() {
				blob := writeTestBlob(t, storePath, []byte(source))
				componentEntries = append(componentEntries, fmt.Sprintf("100644 blob %s\tcomponent-%d.md", blob, index))
			}
			componentTree := mktree(t, storePath, strings.Join(componentEntries, "\n")+"\n")
			invalidCommit := commitManifestTree(t, storePath, manifest, "100644", []string{"040000 tree " + componentTree + "\tcomponents"})
			gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, invalidCommit, base.Revision())
			before := acceptedAuthorityState(t, storePath)

			loaded, err := manager.LoadAccepted(context.Background(), storeID)
			if !errors.Is(err, ErrInvalid) || loaded.Revision() != "" || loaded.ComponentCount() != 0 {
				t.Fatalf("failed load = (%+v, %v), want no snapshot and invalid", loaded, err)
			}
			if after := acceptedAuthorityState(t, storePath); after != before {
				t.Fatalf("failed load changed accepted repository\nbefore:\n%s\nafter:\n%s", before, after)
			}
		})
	}
}

func TestLoadRejectsEmptyComponentsTreeInsteadOfLoadingEmptySnapshot(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	snapshot, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(storeID)
	manifestBytes := gitBytes(t, "--git-dir", storePath, "show", snapshot.Revision()+":architecture.yaml")
	emptyComponentsTree := mktree(t, storePath, "")
	commit := commitManifestTree(t, storePath, manifestBytes, "100644", []string{"040000 tree " + emptyComponentsTree + "\tcomponents"})
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, commit, snapshot.Revision())

	loaded, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if !errors.Is(err, ErrInvalid) || errors.Is(err, ErrUnsupported) {
		t.Fatalf("empty components tree load = (%+v, %v), want invalid and not unsupported", loaded, err)
	}
	if accepted := gitText(t, "--git-dir", storePath, "show-ref", "--verify", "--hash", acceptedRef); accepted != commit {
		t.Fatalf("failed load changed accepted from %q to %q", commit, accepted)
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

func TestLoadRejectsNonOrdinaryComponentPath(t *testing.T) {
	manager := NewManager(t.TempDir())
	storeID := uuid.NewString()
	base, err := manager.InitializeOrLoad(context.Background(), storeID, "Project", "/tmp/project")
	if err != nil {
		t.Fatal(err)
	}
	storePath, _ := manager.StorePath(storeID)
	manifest := gitBytes(t, "--git-dir", storePath, "show", base.Revision()+":architecture.yaml")
	symlinkBlob := writeTestBlob(t, storePath, []byte("elsewhere.md"))
	componentTree := mktree(t, storePath, "120000 blob "+symlinkBlob+"\tcomponent.md\n")
	commit := commitManifestTree(t, storePath, manifest, "100644", []string{"040000 tree " + componentTree + "\tcomponents"})
	gitText(t, "--git-dir", storePath, "update-ref", acceptedRef, commit, base.Revision())
	before := acceptedAuthorityState(t, storePath)

	loaded, err := manager.LoadAccepted(context.Background(), storeID)
	if !errors.Is(err, ErrInvalid) || loaded.Revision() != "" {
		t.Fatalf("non-ordinary component load = (%+v, %v), want invalid", loaded, err)
	}
	if after := acceptedAuthorityState(t, storePath); after != before {
		t.Fatalf("failed component load changed accepted repository\nbefore:\n%s\nafter:\n%s", before, after)
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
		"top-level unknown":       base + "extra: true\n",
		"duplicate top field":     base + "format: workbraid-architecture\n",
		"project unknown":         strings.Replace(base, "  source_hint: /tmp/project\n", "  source_hint: /tmp/project\n  extra: true\n", 1),
		"duplicate project field": strings.Replace(base, "  source_hint: /tmp/project\n", "  source_hint: /tmp/project\n  name: Again\n", 1),
		"unsupported version":     strings.Replace(base, "version: 1", "version: 2", 1),
		"empty name":              strings.Replace(base, "name: Project", "name: '   '", 1),
		"multiple documents":      base + "---\nformat: workbraid-architecture\n",
		"wrong format type":       strings.Replace(base, "format: workbraid-architecture", "format: [workbraid-architecture]", 1),
		"boolean format":          strings.Replace(base, "format: workbraid-architecture", "format: true", 1),
		"wrong version type":      strings.Replace(base, "version: 1", "version: one", 1),
		"quoted version":          strings.Replace(base, "version: 1", "version: \"1\"", 1),
		"numeric store ID":        strings.Replace(base, "store_id: \""+storeID+"\"", "store_id: 123", 1),
		"wrong project type":      strings.Replace(base, "project:\n  name: Project\n  source_hint: /tmp/project", "project: Project", 1),
		"numeric project name":    strings.Replace(base, "name: Project", "name: 123", 1),
		"boolean source hint":     strings.Replace(base, "source_hint: /tmp/project", "source_hint: true", 1),
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

func acceptedAuthorityState(t *testing.T, repository string) string {
	t.Helper()
	refs := gitText(t, "--git-dir", repository, "for-each-ref", "--format=%(refname) %(objectname)")
	head := gitText(t, "--git-dir", repository, "symbolic-ref", "-q", "HEAD")
	objects := gitText(t, "--git-dir", repository, "rev-list", "--objects", "--all")
	return strings.Join([]string{head, refs, objects}, "\n---\n")
}
