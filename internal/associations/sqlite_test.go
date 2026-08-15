package associations

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

func TestAssociationLookupAndUniqueSourceRoot(t *testing.T) {
	db := openTestDatabase(t)
	ctx := context.Background()
	root := filepath.Join(t.TempDir(), "project")

	if _, known, err := Lookup(ctx, db, root); err != nil {
		t.Fatalf("lookup fresh association: %v", err)
	} else if known {
		t.Fatal("fresh database unexpectedly reports an association")
	}

	const firstStoreID = "1d3812c3-d603-487c-9d16-af2f5dfae0ba"
	if _, err := db.ExecContext(ctx,
		`INSERT INTO source_architecture_associations(normalized_source_root, store_id) VALUES (?, ?)`,
		root, firstStoreID,
	); err != nil {
		t.Fatalf("seed association: %v", err)
	}

	storeID, known, err := Lookup(ctx, db, root)
	if err != nil {
		t.Fatalf("lookup seeded association: %v", err)
	}
	if !known || storeID != firstStoreID {
		t.Fatalf("lookup = (%q, %t), want (%q, true)", storeID, known, firstStoreID)
	}

	if _, err := db.ExecContext(ctx,
		`INSERT INTO source_architecture_associations(normalized_source_root, store_id) VALUES (?, ?)`,
		root, "e694bc6a-ff31-4908-a4ea-481b0f4e3520",
	); err == nil {
		t.Fatal("duplicate normalized source root unexpectedly inserted")
	}
}

func openTestDatabase(t *testing.T) *sql.DB {
	t.Helper()
	databasePath := filepath.Join(t.TempDir(), "workbraid.db")
	db, err := sql.Open("sqlite", databasePath)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	db.SetMaxOpenConns(1)
	if err := Initialize(db); err != nil {
		db.Close()
		t.Fatalf("initialize test database: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}
