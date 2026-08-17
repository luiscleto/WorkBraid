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
	"strings"
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
	stateMutex     sync.Mutex
	loadedSnapshot *architecture.Snapshot
	loadedProject  *loadedProject
	pending        *pendingChangeSet
}

type loadedProject struct {
	sourceRoot  string
	projectName string
}

type pendingChangeSet struct {
	storeID        string
	baseRevision   string
	changes        []architecture.ComponentChange
	candidate      *architecture.Candidate
	validationCode string
	validationItem string
}

func NewHandler(db *sql.DB, expectedOrigin, uiDirectory, dataDirectory string) http.Handler {
	_, mux := newHandler(db, expectedOrigin, uiDirectory, dataDirectory)
	return mux
}

func newHandler(db *sql.DB, expectedOrigin, uiDirectory, dataDirectory string) (*Handler, http.Handler) {
	handler := &Handler{
		db:             db,
		expectedOrigin: expectedOrigin,
		uiDirectory:    uiDirectory,
		architecture:   architecture.NewManager(dataDirectory),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/projects/open", handler.openProject)
	mux.HandleFunc("POST /api/projects/initialize", handler.initializeProject)
	mux.HandleFunc("POST /api/architecture/components/add", handler.addComponent)
	mux.HandleFunc("POST /api/architecture/components/edit", handler.editComponent)
	mux.Handle("/", handler.staticFiles())
	return handler, mux
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
	errorArchitectureNotOpen     = "architecture_not_open"
	errorChangesElsewhere        = "changes_elsewhere"
	errorComponentNotFound       = "component_not_found"
	errorChangeFailed            = "change_failed"
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
	h.publishSnapshot(inspection.SourceRoot, inspection.ProjectName, snapshot)
	writeJSON(response, http.StatusOK, h.currentArchitectureResponse())
}

type architectureResponse struct {
	SourceRoot      string              `json:"source_root"`
	ProjectName     string              `json:"project_name"`
	State           string              `json:"state"`
	Revision        string              `json:"revision"`
	ComponentCount  int                 `json:"component_count"`
	ComponentTitles []string            `json:"component_titles"`
	Components      []componentResponse `json:"components"`
	Changes         *changesResponse    `json:"changes,omitempty"`
}

type componentResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type pendingComponentResponse struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	New         bool   `json:"new"`
}

type changesResponse struct {
	Components     []pendingComponentResponse `json:"components"`
	Valid          bool                       `json:"valid"`
	ValidationCode string                     `json:"validation_code,omitempty"`
	ValidationItem string                     `json:"validation_item,omitempty"`
}

func responseForSnapshot(sourceRoot, projectName string, snapshot architecture.Snapshot, pending *pendingChangeSet) architectureResponse {
	state := "ready"
	if snapshot.ComponentCount() == 0 {
		state = "empty"
	}
	accepted := snapshot.AuthoringComponents()
	components := make([]componentResponse, len(accepted))
	for index, component := range accepted {
		components[index] = componentResponse{ID: component.ID, Title: component.Title, Description: component.Description}
	}
	result := architectureResponse{
		SourceRoot:      sourceRoot,
		ProjectName:     projectName,
		State:           state,
		Revision:        snapshot.Revision(),
		ComponentCount:  snapshot.ComponentCount(),
		ComponentTitles: snapshot.ComponentTitles(),
		Components:      components,
	}
	if pending != nil && pending.storeID == snapshot.StoreID() && pending.baseRevision == snapshot.Revision() {
		changes := make([]pendingComponentResponse, len(pending.changes))
		for index, change := range pending.changes {
			changes[index] = pendingComponentResponse{ID: change.ID, Title: change.Title, Description: change.Description, New: change.New}
		}
		result.Changes = &changesResponse{
			Components:     changes,
			Valid:          pending.candidate != nil,
			ValidationCode: pending.validationCode,
			ValidationItem: pending.validationItem,
		}
	}
	return result
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

	h.publishSnapshot(inspection.SourceRoot, inspection.ProjectName, snapshot)
	writeJSON(response, http.StatusOK, h.currentArchitectureResponse())
}

func (h *Handler) publishSnapshot(sourceRoot, projectName string, snapshot architecture.Snapshot) {
	h.stateMutex.Lock()
	h.loadedSnapshot = &snapshot
	h.loadedProject = &loadedProject{sourceRoot: sourceRoot, projectName: projectName}
	h.stateMutex.Unlock()
}

func (h *Handler) currentArchitectureResponse() architectureResponse {
	h.stateMutex.Lock()
	defer h.stateMutex.Unlock()
	if h.loadedSnapshot == nil || h.loadedProject == nil {
		return architectureResponse{}
	}
	return responseForSnapshot(h.loadedProject.sourceRoot, h.loadedProject.projectName, *h.loadedSnapshot, h.pending)
}

type componentMutationRequest struct {
	SourceRoot         string `json:"source_root"`
	ComponentID        string `json:"component_id,omitempty"`
	Title              string `json:"title,omitempty"`
	Description        string `json:"description,omitempty"`
	TitleChanged       bool   `json:"title_changed,omitempty"`
	DescriptionChanged bool   `json:"description_changed,omitempty"`
}

func (h *Handler) addComponent(response http.ResponseWriter, request *http.Request) {
	payload, ok := h.decodeComponentMutation(response, request)
	if !ok {
		return
	}
	h.mutateComponent(response, request, payload, true)
}

func (h *Handler) editComponent(response http.ResponseWriter, request *http.Request) {
	payload, ok := h.decodeComponentMutation(response, request)
	if !ok {
		return
	}
	if payload.ComponentID == "" {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorComponentNotFound})
		return
	}
	h.mutateComponent(response, request, payload, false)
}

func (h *Handler) decodeComponentMutation(response http.ResponseWriter, request *http.Request) (componentMutationRequest, bool) {
	if request.Header.Get("Origin") != h.expectedOrigin {
		writeJSON(response, http.StatusForbidden, errorResponse{Code: errorOriginMismatch})
		return componentMutationRequest{}, false
	}
	request.Body = http.MaxBytesReader(response, request.Body, maxRequestBody)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	var payload componentMutationRequest
	if err := decoder.Decode(&payload); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorLookupFailed})
		return componentMutationRequest{}, false
	}
	if err := ensureJSONEnd(decoder); err != nil {
		writeJSON(response, http.StatusBadRequest, errorResponse{Code: errorLookupFailed})
		return componentMutationRequest{}, false
	}
	return payload, true
}

func (h *Handler) mutateComponent(response http.ResponseWriter, request *http.Request, payload componentMutationRequest, add bool) {
	payload.Title = strings.TrimSpace(payload.Title)
	h.stateMutex.Lock()
	defer h.stateMutex.Unlock()
	if h.loadedSnapshot == nil || h.loadedProject == nil || payload.SourceRoot != h.loadedProject.sourceRoot {
		writeJSON(response, http.StatusConflict, errorResponse{Code: errorArchitectureNotOpen})
		return
	}
	snapshot := *h.loadedSnapshot
	if h.pending != nil && (h.pending.storeID != snapshot.StoreID() || h.pending.baseRevision != snapshot.Revision()) {
		writeJSON(response, http.StatusConflict, errorResponse{Code: errorChangesElsewhere})
		return
	}
	if h.pending == nil {
		h.pending = &pendingChangeSet{storeID: snapshot.StoreID(), baseRevision: snapshot.Revision()}
	}

	var change architecture.ComponentChange
	changeIndex := -1
	if add {
		change = h.architecture.NewComponentChange(snapshot, h.pending.changes, payload.Title, payload.Description)
	} else {
		for index := range h.pending.changes {
			if h.pending.changes[index].ID == payload.ComponentID {
				change = h.pending.changes[index]
				changeIndex = index
				break
			}
		}
		if changeIndex < 0 {
			var found bool
			change, found = snapshot.ChangeForAcceptedComponent(payload.ComponentID)
			if !found {
				writeJSON(response, http.StatusNotFound, errorResponse{Code: errorComponentNotFound})
				return
			}
		}
		if payload.TitleChanged {
			change.Title = payload.Title
			change.TitleChanged = true
		}
		if payload.DescriptionChanged {
			change.Description = payload.Description
			change.DescriptionChanged = true
		}
	}
	if changeIndex >= 0 {
		h.pending.changes[changeIndex] = change
	} else {
		h.pending.changes = append(h.pending.changes, change)
	}

	candidate, err := h.architecture.ConstructCandidate(request.Context(), snapshot, h.pending.changes)
	h.pending.candidate = nil
	h.pending.validationCode = ""
	h.pending.validationItem = ""
	if err != nil {
		var componentError *architecture.ComponentValidationError
		if errors.As(err, &componentError) {
			h.pending.validationItem = componentError.ComponentID
		} else {
			h.pending.validationItem = change.ID
		}
		switch {
		case errors.Is(err, architecture.ErrTitleRequired):
			h.pending.validationCode = "title_required"
		case errors.Is(err, architecture.ErrTitleOneLine):
			h.pending.validationCode = "title_one_line"
		case errors.Is(err, architecture.ErrInvalid):
			h.pending.validationCode = "change_invalid"
		default:
			h.pending.validationCode = "change_unavailable"
			writeJSON(response, http.StatusInternalServerError, errorResponse{Code: errorChangeFailed})
			return
		}
	} else {
		h.pending.candidate = &candidate
	}
	writeJSON(response, http.StatusOK, responseForSnapshot(h.loadedProject.sourceRoot, h.loadedProject.projectName, snapshot, h.pending))
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
