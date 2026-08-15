package web

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	_ "modernc.org/sqlite"

	"workbraid/internal/associations"
)

const testOrigin = "http://127.0.0.1:8080"

func TestOpenProjectUsesRealSQLiteAndLeavesSourceRepositoryUntouched(t *testing.T) {
	db := openWebTestDatabase(t)
	repository := createSourceRepository(t)
	before := snapshotRepository(t, repository)
	handler := NewHandler(db, testOrigin, t.TempDir())

	response := postOpenProject(t, handler, testOrigin, repository)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("permissive CORS header = %q", got)
	}
	var body struct {
		SourceRoot string `json:"source_root"`
		Known      bool   `json:"known"`
		StoreID    string `json:"store_id"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.SourceRoot != filepath.Clean(repository) || body.Known || body.StoreID != "" {
		t.Fatalf("unexpected response: %+v", body)
	}

	var count int
	if err := db.QueryRow(`SELECT count(*) FROM source_architecture_associations`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("open inserted %d associations, want 0", count)
	}
	after := snapshotRepository(t, repository)
	if before != after {
		t.Fatalf("source repository changed\nbefore:\n%s\nafter:\n%s", before, after)
	}
}

func TestOpenProjectReturnsPreseededAssociation(t *testing.T) {
	db := openWebTestDatabase(t)
	repository := t.TempDir()
	const storeID = "a0b38e04-54bd-464d-8a8f-8f2e78e653ea"
	if _, err := db.Exec(
		`INSERT INTO source_architecture_associations(normalized_source_root, store_id) VALUES (?, ?)`,
		filepath.Clean(repository), storeID,
	); err != nil {
		t.Fatal(err)
	}

	response := postOpenProject(t, NewHandler(db, testOrigin, t.TempDir()), testOrigin, repository)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"known":true`) || !strings.Contains(response.Body.String(), storeID) {
		t.Fatalf("response does not contain seeded association: %s", response.Body.String())
	}
}

func TestOpenProjectReportsOperationalDatabaseFailure(t *testing.T) {
	db := openWebTestDatabase(t)
	handler := NewHandler(db, testOrigin, t.TempDir())
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}

	response := postOpenProject(t, handler, testOrigin, t.TempDir())
	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), "could not inspect") {
		t.Fatalf("unexpected error body: %s", response.Body.String())
	}
}

func TestOpenProjectRejectsUnexpectedOrMissingOriginWithoutCORS(t *testing.T) {
	db := openWebTestDatabase(t)
	handler := NewHandler(db, testOrigin, t.TempDir())
	repository := t.TempDir()

	for _, origin := range []string{"", "http://attacker.example"} {
		response := postOpenProject(t, handler, origin, repository)
		if response.Code != http.StatusForbidden {
			t.Fatalf("origin %q: status = %d, want 403", origin, response.Code)
		}
		if got := response.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("origin %q: permissive CORS header = %q", origin, got)
		}
	}
}

func TestOpenProjectRejectsInvalidPaths(t *testing.T) {
	db := openWebTestDatabase(t)
	handler := NewHandler(db, testOrigin, t.TempDir())
	regularFile := filepath.Join(t.TempDir(), "file.txt")
	if err := os.WriteFile(regularFile, []byte("file"), 0o600); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		path string
		want string
	}{
		{name: "relative", path: "relative/project", want: "absolute path"},
		{name: "missing", path: filepath.Join(t.TempDir(), "missing"), want: "does not exist"},
		{name: "regular file", path: regularFile, want: "not a directory"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := postOpenProject(t, handler, testOrigin, test.path)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
			}
			if !strings.Contains(response.Body.String(), test.want) {
				t.Fatalf("body = %s, want text %q", response.Body.String(), test.want)
			}
		})
	}
}

func TestHandlerServesBuiltUI(t *testing.T) {
	db := openWebTestDatabase(t)
	uiDirectory := t.TempDir()
	if err := os.WriteFile(filepath.Join(uiDirectory, "index.html"), []byte("<main>WorkBraid</main>"), 0o600); err != nil {
		t.Fatal(err)
	}

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	response := httptest.NewRecorder()
	NewHandler(db, testOrigin, uiDirectory).ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "WorkBraid") {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func postOpenProject(t *testing.T, handler http.Handler, origin, sourceRoot string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(map[string]string{"source_root": sourceRoot})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/projects/open", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if origin != "" {
		request.Header.Set("Origin", origin)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func openWebTestDatabase(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "workbraid.db"))
	if err != nil {
		t.Fatal(err)
	}
	if err := associations.Initialize(db); err != nil {
		db.Close()
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func createSourceRepository(t *testing.T) string {
	t.Helper()
	repository := t.TempDir()
	runGit(t, repository, "init", "--quiet")
	if err := os.WriteFile(filepath.Join(repository, "tracked.txt"), []byte("tracked\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	runGit(t, repository, "add", "tracked.txt")
	runGit(t, repository, "-c", "user.name=WorkBraid Test", "-c", "user.email=test@workbraid.invalid", "commit", "--quiet", "-m", "test source")
	if err := os.WriteFile(filepath.Join(repository, "untracked.txt"), []byte("untracked\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	return repository
}

func runGit(t *testing.T, directory string, arguments ...string) string {
	t.Helper()
	command := exec.CommandContext(context.Background(), "git", arguments...)
	command.Dir = directory
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("git %v: %v\n%s", arguments, err, output)
	}
	return strings.TrimSpace(string(output))
}

func snapshotRepository(t *testing.T, repository string) string {
	t.Helper()
	head := runGit(t, repository, "rev-parse", "HEAD")
	status := runGit(t, repository, "status", "--short")
	var files []string
	err := filepath.WalkDir(repository, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		relative, err := filepath.Rel(repository, path)
		if err != nil {
			return err
		}
		if entry.IsDir() {
			if relative == ".git" {
				return filepath.SkipDir
			}
			return nil
		}
		contents, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		sum := sha256.Sum256(contents)
		files = append(files, relative+":"+hex.EncodeToString(sum[:]))
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	sort.Strings(files)
	return strings.Join([]string{head, status, strings.Join(files, "\n")}, "\n---\n")
}
