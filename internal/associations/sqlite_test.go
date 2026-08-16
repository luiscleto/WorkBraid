package associations

import (
	"context"
	"database/sql"
	"path/filepath"
	"sync"
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

func TestGetOrCreateAdoptsOneConcurrentWinner(t *testing.T) {
	db := openTestDatabase(t)
	ctx := context.Background()
	root := filepath.Join(t.TempDir(), "project")
	candidates := []string{
		"2f0d0df7-8dbe-41dd-892a-d0f3321316e8",
		"4a42411a-b59c-4f9b-b069-760ad1cd4f9d",
		"7d460398-b7c3-466b-a38d-7e97c96f067c",
		"c1d7fe3f-79e2-4314-b4ef-0782ea0cbfb1",
	}

	start := make(chan struct{})
	results := make(chan string, len(candidates))
	errorsSeen := make(chan error, len(candidates))
	var wait sync.WaitGroup
	for _, candidate := range candidates {
		wait.Add(1)
		go func() {
			defer wait.Done()
			<-start
			storeID, err := GetOrCreate(ctx, db, root, candidate)
			if err != nil {
				errorsSeen <- err
				return
			}
			results <- storeID
		}()
	}
	close(start)
	wait.Wait()
	close(results)
	close(errorsSeen)
	for err := range errorsSeen {
		t.Fatalf("GetOrCreate: %v", err)
	}

	winner, known, err := Lookup(ctx, db, root)
	if err != nil || !known {
		t.Fatalf("lookup winner = (%q, %t, %v)", winner, known, err)
	}
	for result := range results {
		if result != winner {
			t.Fatalf("caller used losing identity %q, winner is %q", result, winner)
		}
	}
	var count int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM source_architecture_associations WHERE normalized_source_root = ?`, root).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("association count = %d, want 1", count)
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
