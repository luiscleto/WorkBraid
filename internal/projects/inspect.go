package projects

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"workbraid/internal/associations"
)

var (
	ErrPathRequired = errors.New("source root is required")
	ErrPathRelative = errors.New("source root must be an absolute path")
	ErrPathMissing  = errors.New("source root does not exist")
	ErrPathNotDir   = errors.New("source root is not a directory")
)

type Inspection struct {
	SourceRoot  string `json:"source_root"`
	ProjectName string `json:"project_name"`
	Known       bool   `json:"known"`
	StoreID     string `json:"store_id,omitempty"`
}

// Inspect validates a local source-root path and checks only the operational
// association. Normalization is lexical: symlinks are not resolved.
func Inspect(ctx context.Context, db *sql.DB, sourceRoot string) (Inspection, error) {
	sourceRoot = strings.TrimSpace(sourceRoot)
	if sourceRoot == "" {
		return Inspection{}, ErrPathRequired
	}
	if !filepath.IsAbs(sourceRoot) {
		return Inspection{}, ErrPathRelative
	}

	normalized := filepath.Clean(sourceRoot)
	info, err := os.Stat(normalized)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Inspection{}, ErrPathMissing
		}
		return Inspection{}, fmt.Errorf("inspect source root: %w", err)
	}
	if !info.IsDir() {
		return Inspection{}, ErrPathNotDir
	}

	storeID, known, err := associations.Lookup(ctx, db, normalized)
	if err != nil {
		return Inspection{}, fmt.Errorf("look up Architecture association: %w", err)
	}
	return Inspection{
		SourceRoot:  normalized,
		ProjectName: projectName(normalized),
		Known:       known,
		StoreID:     storeID,
	}, nil
}

func projectName(sourceRoot string) string {
	name := strings.TrimSpace(filepath.Base(sourceRoot))
	if name == "" || name == string(filepath.Separator) || name == "." {
		return "Project"
	}
	return name
}
