# WorkBraid UI v0

Status: approved product direction  
This is not a component library or token system.

## Voice

The UI is for a person at a desk, not an API log. Headings are status. Body is one short sentence. Errors say what to do next.

Write as if the reader is tired and non-technical. Prefer what a thing is. Mention what it is not only when a real confusion exists. Trim pasted paths.

Do not pipe backend sentinel strings into the page. Map each failure to one operator sentence that says what to do. Do not claim something is absent when you only failed to look it up.

## Terminology

Say **folder**, **project**, **linked**, **architecture**.

Internal names stay off the screen. Do not show implementation words (source root, association, inspect, canonical, snapshot, payload, origin, and whatever the current internals are called).

## What is on screen

Show only actions and state that exist now. Do not add disabled future controls, placeholder panels, empty queues, or explanatory chrome for features that are not implemented.

Progressively disclose machinery. Paths, IDs, Git revisions, and raw errors are first-class when the current task needs them. Otherwise they belong in details or inspection, not on every surface.

## Visual direction

A **drafting table**: one surface, hairline structure, warm paper, almost no radius or shadow, one accent. Typography does the hierarchy. Not sage SaaS mint, not a green theme, not three stacked tiles.

- Use a deliberately chosen, actually loaded display face and body face with a distinct editorial or technical character. Generic product-SaaS typography or a system-only stack is not acceptable.
- Mono only for paths and IDs, and only where those objects belong.
- Hide empty result chrome until there is something to show.
- Almost no motion: focus and state appearing. No hero animations, no gradient mesh, no purple.
- Screens that share a product must look like one product.
- The architecture map is a 2D drawing unless a later approved visual spec says otherwise.

## Architecture workspace

Project opening and setup are entry states, not permanent workspace chrome. Once a project is open, the opening sheet is gone and WorkBraid shows a map-centered Architecture workbench.

On a normal desktop viewport, the workbench has:

- a compact component index for navigation;
- the accepted Architecture map as the primary canvas;
- one contextual working pane for the current task: accepted component documentation or structured authoring.

The component index and map are projections of the same exact accepted Architecture revision. Pending title changes do not alter either surface before acceptance, and pending new components do not appear in them. Pending components remain reachable through **Changes in progress**.

The component index is not a management or dashboard surface. It selects components by stable identity and primarily shows their titles, plus only the minimal component-creation affordance needed. When titles collide, show the minimum filename or shortened-ID context needed to disambiguate them. Do not make IDs or paths general index chrome, and do not add status columns, per-component management controls, filters, or speculative controls.

Selecting a component from the map or index focuses the same accepted component and shows its documentation in the working pane. Add/Edit uses that pane for structured component and relationship authoring. The accepted map does not preview pending topology.

**Changes in progress** is a compact visible workspace affordance. It reuses the working area for pending editing, review, and acceptance rather than becoming another permanent region. Exact diff review may temporarily expand into more of the workspace when the task requires it.

### Review changes

**Review changes** remains one task combining visual review and the complete exact unified diff. It is available only after the complete candidate validates. Invalid work remains under Changes in progress with concise, actionable guidance.

The candidate view is the primary review canvas. A compact toggle switches the entire review workspace between **With changes** and **Before changes**:

- **With changes** shows the exact immutable reviewed candidate;
- **Before changes** shows that review's exact bound base, not newly observed accepted Architecture.

The component index, map, selected documentation/detail, titles, and relationship topology always switch together. Never show one snapshot's map beside another snapshot's index or documentation. If external authority moves after review, mark the review stale through the existing product language; do not relabel its bound base as current.

In the candidate view:

- unchanged topology is subdued;
- added components and relationships are visibly distinct;
- changed existing components remain indicated when only their Title, Description, or documentation changed;
- removed relationship facts are visibly distinct, such as ghosted or dashed;
- selecting a changed component or relationship focuses its review context and the relevant region of the exact unified diff.

The raw unified diff remains directly inspectable in the same Review changes surface. Basic added/removed line coloring may improve readability, but it does not become a semantic or rendered-Markdown diff. If the visual map fails to render, say so clearly and retain the validated candidate and complete unified diff review path.

Automatic review layout should be deterministic and stable-ID-aware, keeping unchanged components as stable as practical between Before changes and With changes. No review coordinates are canonical or persisted.

Validation-bearing rows in Changes in progress visibly indicate which component needs attention. Fix affordances must look actionable, and opening one highlights and focuses the exact affected relationship control. The contextual pane also provides a clear/deselect action where selection would otherwise trap the current document or task.

Pending work whose accepted base is stale remains visible and read-only through **Changes in progress**. It cannot be reviewed or accepted. The human may discard that whole non-canonical change set so new work can begin from current accepted Architecture; discard is not partial editing, reconciliation, or undo.

The application frame keeps the current project and Architecture context visible, with compact actions for explicit refresh and opening another project. Do not permanently display a positive current/accepted status merely because it exists. Make stale or non-current state conspicuous when relevant; otherwise let the workspace stay quiet.

The same surfaces may collapse into one-at-a-time views on narrower layouts. Mobile-specific interaction remains deferred.

## Map references

These images are tone and information-design references for a later map, not the first-slice widget set and not a 3D assignment:

- [System map](ui-v0-ref-system-map.jpg)
- [Loop map](ui-v0-ref-loop-map.jpg)

An approved screenshot of the live product can be added here once a screen matches this direction.
