package associations

import (
	"context"
	"database/sql"
	"errors"
)

const schema = `
CREATE TABLE IF NOT EXISTS source_architecture_associations (
    normalized_source_root TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL CHECK (length(store_id) > 0)
) WITHOUT ROWID;
`

// Initialize creates the one operational table needed by Architecture I1.1.
func Initialize(db *sql.DB) error {
	if _, err := db.Exec(schema); err != nil {
		return err
	}
	return nil
}

// Lookup returns the associated private store ID for a normalized local source
// root. The boolean is false when WorkBraid knows no association for the root.
func Lookup(ctx context.Context, db *sql.DB, normalizedSourceRoot string) (string, bool, error) {
	var storeID string
	err := db.QueryRowContext(ctx,
		`SELECT store_id FROM source_architecture_associations WHERE normalized_source_root = ?`,
		normalizedSourceRoot,
	).Scan(&storeID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return storeID, true, nil
}

// GetOrCreate records proposedStoreID when the source root has no association.
// If another caller wins the unique-key race, it returns that winning store ID.
func GetOrCreate(ctx context.Context, db *sql.DB, normalizedSourceRoot, proposedStoreID string) (string, error) {
	result, err := db.ExecContext(ctx,
		`INSERT INTO source_architecture_associations(normalized_source_root, store_id)
		 VALUES (?, ?)
		 ON CONFLICT(normalized_source_root) DO NOTHING`,
		normalizedSourceRoot, proposedStoreID,
	)
	if err != nil {
		return "", err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return "", err
	}
	if rows == 1 {
		return proposedStoreID, nil
	}

	storeID, known, err := Lookup(ctx, db, normalizedSourceRoot)
	if err != nil {
		return "", err
	}
	if !known {
		return "", errors.New("association conflict winner could not be read")
	}
	return storeID, nil
}
