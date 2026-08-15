package projects

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"workbraid/internal/associations"
)

func TestInspectPathValidationAndLexicalNormalization(t *testing.T) {
	db := openProjectTestDatabase(t)
	root := t.TempDir()
	filePath := filepath.Join(root, "file.txt")
	if err := os.WriteFile(filePath, []byte("content"), 0o600); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name string
		path string
		want error
	}{
		{name: "empty", path: "", want: ErrPathRequired},
		{name: "relative", path: "project", want: ErrPathRelative},
		{name: "missing", path: filepath.Join(root, "missing"), want: ErrPathMissing},
		{name: "regular file", path: filePath, want: ErrPathNotDir},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := Inspect(context.Background(), db, test.path)
			if !errors.Is(err, test.want) {
				t.Fatalf("Inspect(%q) error = %v, want %v", test.path, err, test.want)
			}
		})
	}

	unclean := filepath.Join(root, "child", "..")
	inspection, err := Inspect(context.Background(), db, unclean)
	if err != nil {
		t.Fatalf("Inspect(%q): %v", unclean, err)
	}
	if inspection.SourceRoot != filepath.Clean(unclean) {
		t.Fatalf("normalized root = %q, want %q", inspection.SourceRoot, filepath.Clean(unclean))
	}
	if inspection.Known {
		t.Fatal("fresh database unexpectedly reports known association")
	}
}

func TestInspectDoesNotResolveSymlinksForAssociationLookup(t *testing.T) {
	db := openProjectTestDatabase(t)
	parent := t.TempDir()
	realRoot := filepath.Join(parent, "real-project")
	if err := os.Mkdir(realRoot, 0o700); err != nil {
		t.Fatal(err)
	}
	aliasRoot := filepath.Join(parent, "project-alias")
	if err := os.Symlink(realRoot, aliasRoot); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(
		`INSERT INTO source_architecture_associations(normalized_source_root, store_id) VALUES (?, ?)`,
		filepath.Clean(realRoot), "04c3852f-d46d-489c-98a7-ccce9ef88018",
	); err != nil {
		t.Fatal(err)
	}

	inspection, err := Inspect(context.Background(), db, aliasRoot)
	if err != nil {
		t.Fatalf("Inspect symlink alias: %v", err)
	}
	if inspection.SourceRoot != filepath.Clean(aliasRoot) {
		t.Fatalf("source root = %q, want lexical alias %q", inspection.SourceRoot, filepath.Clean(aliasRoot))
	}
	if inspection.Known {
		t.Fatal("symlink alias unexpectedly reused the real path association")
	}
}

func openProjectTestDatabase(t *testing.T) *sql.DB {
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
