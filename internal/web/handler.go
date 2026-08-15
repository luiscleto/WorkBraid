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

	"workbraid/internal/projects"
)

const maxRequestBody = 64 << 10

type Handler struct {
	db             *sql.DB
	expectedOrigin string
	uiDirectory    string
}

func NewHandler(db *sql.DB, expectedOrigin, uiDirectory string) http.Handler {
	handler := &Handler{
		db:             db,
		expectedOrigin: expectedOrigin,
		uiDirectory:    uiDirectory,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/projects/open", handler.openProject)
	mux.Handle("/", handler.staticFiles())
	return mux
}

type openProjectRequest struct {
	SourceRoot string `json:"source_root"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func (h *Handler) openProject(response http.ResponseWriter, request *http.Request) {
	if request.Header.Get("Origin") != h.expectedOrigin {
		writeJSON(response, http.StatusForbidden, errorResponse{Error: "request origin is not allowed"})
		return
	}

	request.Body = http.MaxBytesReader(response, request.Body, maxRequestBody)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	var payload openProjectRequest
	if err := decoder.Decode(&payload); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Error: "request body must be valid JSON"})
		return
	}
	if err := ensureJSONEnd(decoder); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Error: "request body must contain one JSON object"})
		return
	}

	inspection, err := projects.Inspect(request.Context(), h.db, payload.SourceRoot)
	if err != nil {
		switch {
		case errors.Is(err, projects.ErrPathRequired),
			errors.Is(err, projects.ErrPathRelative),
			errors.Is(err, projects.ErrPathMissing),
			errors.Is(err, projects.ErrPathNotDir):
			writeJSON(response, http.StatusBadRequest, errorResponse{Error: err.Error()})
		default:
			writeJSON(response, http.StatusInternalServerError, errorResponse{Error: "WorkBraid could not inspect this project"})
		}
		return
	}

	writeJSON(response, http.StatusOK, inspection)
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
