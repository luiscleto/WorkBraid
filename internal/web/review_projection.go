package web

import (
	"fmt"
	"path/filepath"

	"workbraid/internal/architecture"
)

type snapshotProjectionResponse struct {
	Revision        string              `json:"revision"`
	ComponentCount  int                 `json:"component_count"`
	ComponentTitles []string            `json:"component_titles"`
	Components      []componentResponse `json:"components"`
}

type reviewComparisonResponse struct {
	Components    []reviewComponentChangeResponse    `json:"components"`
	Relationships []reviewRelationshipChangeResponse `json:"relationships"`
}

type reviewComponentChangeResponse struct {
	ComponentID string `json:"component_id"`
	Status      string `json:"status"`
	Path        string `json:"path"`
}

type reviewRelationshipChangeResponse struct {
	Key        string `json:"key"`
	BeforeKey  string `json:"before_key,omitempty"`
	SourceID   string `json:"source_id"`
	TargetID   string `json:"target_id"`
	Label      string `json:"label"`
	Status     string `json:"status"`
	Path       string `json:"path"`
	Occurrence int    `json:"occurrence"`
}

type reviewRelationshipFact struct {
	sourceID string
	targetID string
	label    string
}

func projectSnapshot(snapshot architecture.Snapshot, relationshipKeyPrefix string) snapshotProjectionResponse {
	authored := snapshot.AuthoringComponents()
	components := make([]componentResponse, len(authored))
	for componentIndex, component := range authored {
		relationships := make([]relationshipResponse, len(component.Relationships))
		for relationshipIndex, relationship := range component.Relationships {
			relationships[relationshipIndex] = relationshipResponse{
				TargetID: relationship.TargetID,
				Label:    relationship.Label,
			}
			if relationshipKeyPrefix != "" {
				relationships[relationshipIndex].ProjectionKey = reviewRelationshipProjectionKey(
					relationshipKeyPrefix, component.ID, relationshipIndex,
				)
			}
		}
		components[componentIndex] = componentResponse{
			ID: component.ID, Title: component.Title, Description: component.Description,
			Filename: component.Filename, Relationships: relationships,
		}
	}
	return snapshotProjectionResponse{
		Revision:        snapshot.Revision(),
		ComponentCount:  snapshot.ComponentCount(),
		ComponentTitles: snapshot.ComponentTitles(),
		Components:      components,
	}
}

// captureReviewPresentation projects and compares one immutable bound pair.
// Callers hold Handler.stateMutex while verifying the review binding and
// invoking this function, so every returned value belongs to one generation.
func captureReviewPresentation(base, candidate architecture.Snapshot) (snapshotProjectionResponse, snapshotProjectionResponse, reviewComparisonResponse) {
	before := projectSnapshot(base, "before")
	withChanges := projectSnapshot(candidate, "with")
	return before, withChanges, compareReviewProjections(before.Components, withChanges.Components)
}

// compareReviewProjections is deliberately concrete to the Review changes
// presentation. It is not a canonical or reusable semantic diff.
func compareReviewProjections(before, withChanges []componentResponse) reviewComparisonResponse {
	beforeByID := make(map[string]componentResponse, len(before))
	for _, component := range before {
		beforeByID[component.ID] = component
	}

	componentChanges := make([]reviewComponentChangeResponse, 0)
	for _, component := range withChanges {
		base, exists := beforeByID[component.ID]
		status := ""
		switch {
		case !exists:
			status = "added"
		case base.Title != component.Title || base.Description != component.Description:
			status = "content_changed"
		}
		if status != "" {
			componentChanges = append(componentChanges, reviewComponentChangeResponse{
				ComponentID: component.ID,
				Status:      status,
				Path:        canonicalComponentPath(component.Filename),
			})
		}
	}

	beforeCounts := relationshipFactCounts(before)
	withCounts := relationshipFactCounts(withChanges)
	relationshipChanges := make([]reviewRelationshipChangeResponse, 0)
	for _, component := range withChanges {
		seen := make(map[reviewRelationshipFact]int)
		for _, relationship := range component.Relationships {
			fact := reviewRelationshipFact{sourceID: component.ID, targetID: relationship.TargetID, label: relationship.Label}
			seen[fact]++
			if seen[fact] <= beforeCounts[fact] {
				continue
			}
			relationshipChanges = append(relationshipChanges, reviewRelationshipChangeResponse{
				Key: relationship.ProjectionKey, SourceID: component.ID, TargetID: relationship.TargetID,
				Label: relationship.Label, Status: "added", Path: canonicalComponentPath(component.Filename),
				Occurrence: seen[fact],
			})
		}
	}
	for _, component := range before {
		seen := make(map[reviewRelationshipFact]int)
		for relationshipIndex, relationship := range component.Relationships {
			fact := reviewRelationshipFact{sourceID: component.ID, targetID: relationship.TargetID, label: relationship.Label}
			seen[fact]++
			if seen[fact] <= withCounts[fact] {
				continue
			}
			relationshipChanges = append(relationshipChanges, reviewRelationshipChangeResponse{
				Key:       reviewRelationshipProjectionKey("removed", component.ID, relationshipIndex),
				BeforeKey: relationship.ProjectionKey, SourceID: component.ID, TargetID: relationship.TargetID,
				Label: relationship.Label, Status: "removed", Path: canonicalComponentPath(component.Filename),
				Occurrence: seen[fact],
			})
		}
	}

	return reviewComparisonResponse{Components: componentChanges, Relationships: relationshipChanges}
}

func relationshipFactCounts(components []componentResponse) map[reviewRelationshipFact]int {
	counts := make(map[reviewRelationshipFact]int)
	for _, component := range components {
		for _, relationship := range component.Relationships {
			counts[reviewRelationshipFact{sourceID: component.ID, targetID: relationship.TargetID, label: relationship.Label}]++
		}
	}
	return counts
}

func reviewRelationshipProjectionKey(side, sourceID string, relationshipIndex int) string {
	return fmt.Sprintf("review:%s:%s:%d", side, sourceID, relationshipIndex)
}

func canonicalComponentPath(filename string) string {
	return filepath.ToSlash(filepath.Join("components", filename))
}
