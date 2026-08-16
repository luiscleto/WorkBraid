package web

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"

	"workbraid/internal/architecture"
	"workbraid/internal/associations"
	"workbraid/internal/projects"
)

const maxRequestBody = 64 << 10

type Handler struct {
	db             *sql.DB
	expectedOrigin string
	uiDirectory    string
	architecture   *architecture.Manager
	setupMutex     sync.Mutex
	snapshotMutex  sync.RWMutex
	loadedSnapshot *architecture.Snapshot
}

func NewHandler(db *sql.DB, expectedOrigin, uiDirectory, dataDirectory string) http.Handler {
	handler := &Handler{
		db:             db,
		expectedOrigin: expectedOrigin,
		uiDirectory:    uiDirectory,
		architecture:   architecture.NewManager(dataDirectory),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/projects/open", handler.openProject)
	mux.HandleFunc("POST /api/projects/initialize", handler.initializeProject)
	mux.Handle("/", handler.staticFiles())
	return mux
}

type openProjectRequest struct {
	SourceRoot string `json:"source_root"`
}

type errorResponse struct {
	Code string `json:"code"`
}

const (
	errorPathRequired            = "path_required"
	errorPathRelative            = "path_relative"
	errorPathMissing             = "path_missing"
	errorPathNotDir              = "path_not_directory"
	errorOriginMismatch          = "origin_mismatch"
	errorLookupFailed            = "lookup_failed"
	errorSetupIncomplete         = "setup_incomplete"
	errorArchitectureUnavailable = "architecture_unavailable"
	errorArchitectureInvalid     = "architecture_invalid"
	errorArchitectureUnsupported = "architecture_unsupported"
)

func (h *Handler) openProject(response http.ResponseWriter, request *http.Request) {
	if request.Header.Get("Origin") != h.expectedOrigin {
		writeJSON(response, http.StatusForbidden, errorResponse{Code: errorOriginMismatch})
		return
	}

	request.Body = http.MaxBytesReader(response, request.Body, maxRequestBody)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	var payload openProjectRequest
	if err := decoder.Decode(&payload); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorLookupFailed})
		return
	}
	if err := ensureJSONEnd(decoder); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorLookupFailed})
		return
	}

	inspection, err := projects.Inspect(request.Context(), h.db, payload.SourceRoot)
	if err != nil {
		writeProjectError(response, err)
		return
	}
	if !inspection.Known {
		writeJSON(response, http.StatusOK, inspection)
		return
	}
	if err := h.architecture.ValidateSourceIsolation(inspection.SourceRoot); err != nil {
		writeJSON(response, http.StatusConflict, errorResponse{Code: errorArchitectureInvalid})
		return
	}

	snapshot, err := h.architecture.LoadAccepted(request.Context(), inspection.StoreID)
	if err != nil {
		writeArchitectureLoadError(response, err)
		return
	}
	h.publishSnapshot(snapshot)

	writeJSON(response, http.StatusOK, architectureResponse{
		SourceRoot:     inspection.SourceRoot,
		ProjectName:    inspection.ProjectName,
		State:          "empty",
		Revision:       snapshot.Revision(),
		ComponentCount: snapshot.ComponentCount(),
	})
}

type architectureResponse struct {
	SourceRoot     string `json:"source_root"`
	ProjectName    string `json:"project_name"`
	State          string `json:"state"`
	Revision       string `json:"revision"`
	ComponentCount int    `json:"component_count"`
}

func (h *Handler) initializeProject(response http.ResponseWriter, request *http.Request) {
	if request.Header.Get("Origin") != h.expectedOrigin {
		writeJSON(response, http.StatusForbidden, errorResponse{Code: errorOriginMismatch})
		return
	}

	request.Body = http.MaxBytesReader(response, request.Body, maxRequestBody)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	var payload openProjectRequest
	if err := decoder.Decode(&payload); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorLookupFailed})
		return
	}
	if err := ensureJSONEnd(decoder); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorLookupFailed})
		return
	}

	inspection, err := projects.Inspect(request.Context(), h.db, payload.SourceRoot)
	if err != nil {
		writeProjectError(response, err)
		return
	}
	if err := h.architecture.ValidateSourceIsolation(inspection.SourceRoot); err != nil {
		writeJSON(response, http.StatusInternalServerError, errorResponse{Code: errorSetupIncomplete})
		return
	}
	h.setupMutex.Lock()
	defer h.setupMutex.Unlock()

	storeID := inspection.StoreID
	if !inspection.Known {
		proposedStoreID := uuid.NewString()
		storeID, err = associations.GetOrCreate(request.Context(), h.db, inspection.SourceRoot, proposedStoreID)
		if err != nil {
			writeJSON(response, http.StatusInternalServerError, errorResponse{Code: errorLookupFailed})
			return
		}
	}

	snapshot, err := h.architecture.InitializeOrLoad(
		request.Context(), storeID, inspection.ProjectName, inspection.SourceRoot,
	)
	if err != nil {
		switch {
		case errors.Is(err, architecture.ErrUnsupported):
			writeJSON(response, http.StatusUnprocessableEntity, errorResponse{Code: errorArchitectureUnsupported})
		case errors.Is(err, architecture.ErrInvalid):
			writeJSON(response, http.StatusConflict, errorResponse{Code: errorArchitectureInvalid})
		default:
			writeJSON(response, http.StatusInternalServerError, errorResponse{Code: errorSetupIncomplete})
		}
		return
	}

	h.publishSnapshot(snapshot)
	writeJSON(response, http.StatusOK, architectureResponse{
		SourceRoot:     inspection.SourceRoot,
		ProjectName:    inspection.ProjectName,
		State:          "empty",
		Revision:       snapshot.Revision(),
		ComponentCount: snapshot.ComponentCount(),
	})
}

func (h *Handler) publishSnapshot(snapshot architecture.Snapshot) {
	h.snapshotMutex.Lock()
	h.loadedSnapshot = &snapshot
	h.snapshotMutex.Unlock()
}

func writeArchitectureLoadError(response http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, architecture.ErrUnavailable):
		writeJSON(response, http.StatusConflict, errorResponse{Code: errorArchitectureUnavailable})
	case errors.Is(err, architecture.ErrUnsupported):
		writeJSON(response, http.StatusUnprocessableEntity, errorResponse{Code: errorArchitectureUnsupported})
	default:
		writeJSON(response, http.StatusConflict, errorResponse{Code: errorArchitectureInvalid})
	}
}

func writeProjectError(response http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, projects.ErrPathRequired):
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorPathRequired})
	case errors.Is(err, projects.ErrPathRelative):
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorPathRelative})
	case errors.Is(err, projects.ErrPathMissing):
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorPathMissing})
	case errors.Is(err, projects.ErrPathNotDir):
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorPathNotDir})
	default:
		writeJSON(response, http.StatusInternalServerError, errorResponse{Code: errorLookupFailed})
	}
}

func (h *Handler) staticFiles() http.Handler {
	files := http.FileServer(http.Dir(h.uiDirectory))
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.URL.Path == "/" {
			indexPath := filepath.Join(h.uiDirectory, "index.html")
			if _, err := os.Stat(indexPath); err != nil {
				http.Error(response, "WorkBraid browser UI is not built", http.StatusServiceUnavailable)
				return
			}
		}
		files.ServeHTTP(response, request)
	})
}

func ensureJSONEnd(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		if err == nil {
			return fmt.Errorf("unexpected extra JSON value")
		}
		return err
	}
	return nil
}

func writeJSON(response http.ResponseWriter, status int, value any) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(value)
}
