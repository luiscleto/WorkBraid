# Post-Gate Architecture Phase 1 plan

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Roadmap: `docs/architecture-post-gate-roadmap.md`

Exact planning baseline: `8ac46febd67c57e286e914c9a4e3ea08fcf22ded`

Target: Candidate-aware Review changes workbench on portable Architecture format v1

Architecture or product changes discovered during implementation require explicit human approval rather than silent changes to this plan or its baselines.

## Increment shape

Implement Phase 1 as one cohesive increment.

The existing backend already constructs and validates one complete candidate, retains its immutable candidate snapshot, binds review to the exact base commit, candidate tree, and pending generation, and uses that binding for confirmation. The useful product increment is to expose and present the exact bound base/candidate review coherently. Backend projection, visual comparison, snapshot switching, diff focus, and the small review-specific workspace polish do not create independently useful stopping points on their own.

Do not split map styling, diff coloring, validation-row treatment, or clear/deselect into artificial tickets. The eventual execution packet should use one implementation worker, one fresh independent reviewer, integration, and one real human checkpoint.

## Objective and user-visible outcome

`Review changes` becomes one candidate-aware workspace rather than only a raw diff pane.

After a complete pending Architecture validates, the human sees the exact reviewed candidate as the primary map and can switch the entire review workspace between:

- **With changes** — the exact immutable candidate snapshot bound to confirmation;
- **Before changes** — that review's exact immutable accepted-base snapshot.

The component index, map, selected documentation/detail, titles, and relationship topology always come from the selected snapshot together. Visual change treatment makes added and modified Architecture understandable and connects selected changes to the relevant part of the complete exact unified diff. The unified diff remains directly inspectable and final confirmation retains its existing exact binding and CAS path.

The normal Architecture workspace remains accepted-only. Invalid pending values remain under Changes in progress with actionable correction guidance and never enter this visual review.

## Implementation scope

### One existing review authority

- Extend the current reviewed response and workspace from the existing in-process review binding. Do not introduce another review object, candidate builder, parser, validation pass, graph authority, or acceptance path.
- Preserve the confirmation binding exactly as `(base commit, candidate tree, pending generation)`. The browser continues to return those exact reviewed values on confirmation, and the backend continues to reject any mismatch before authority work.
- Use the pending change set's exact base snapshot for **Before changes** and the existing validated `Candidate.Snapshot()` for **With changes**. Do not reload live accepted state to populate either side.
- Reuse the existing snapshot-to-browser projection for both sides so component IDs, titles, filenames/context, Markdown body source, and relationships have one interpretation. Refactor only enough to avoid duplicating that projection logic.
- Return visual-review data only while the current review binding still matches the current pending generation and candidate tree. Pending mutation, discard, refresh, stale-base detection, project switching, or successful acceptance continues to invalidate or consume review exactly as it does now.
- If external authority moves after review, preserve the current stale-review behavior. Never replace **Before changes** with the newer accepted revision or relabel the bound base as current.
- A failed visual renderer does not alter backend review validity. Candidate validation and the exact unified diff remain available for review and confirmation.

### Snapshot-unified review workspace

- Keep `Review changes` as one contextual task within the existing map-centered workbench. Do not introduce a separate visual-review route, review dashboard, or second diff workflow.
- Make **With changes** the initial/primary view and provide one compact **With changes** / **Before changes** toggle.
- On every toggle, switch the component index, active map topology, titles, selected documentation/detail, and resolved relationships from one bound snapshot to the other as one UI state transition.
- Selection remains component-identity based. Preserve the selection across the toggle only when that component exists in the selected snapshot. For a candidate-only component viewed under **Before changes**, do not leak candidate documentation into the base view; clear the component detail or show a restrained review-context note that the component is only present with the changes.
- Keep review-delta annotations distinct from active snapshot topology. In particular, a ghosted removed relationship on **With changes** is a comparison annotation derived from the bound base/candidate pair, not a relationship in the candidate snapshot.
- Provide clear/deselect for the contextual review focus and ordinary selected documentation where the current selection would otherwise trap the pane. Respect the existing dirty-editor navigation guard whenever clearing or changing context would replace unsent local editor values.
- Keep exact review details progressively disclosed. The Git identities need not dominate the visual task, but the exact base, candidate tree, and generation remain inspectable.

### Visual comparison from the two bound snapshots

- Components match only by stable component ID.
- Mark a candidate component as added when its ID is absent from the base snapshot.
- Mark an existing component as content-changed only when its structured Title or exact Markdown body/Description differs between the base and candidate snapshots. A documentation-only change therefore marks the component even when its title and topology are unchanged.
- A relationship-only change does not mark its source component as content-changed. Relationship additions, removals, target changes, and label changes use only the relationship-multiset delta. If component content and relationships both change, show both visual treatments.
- Content-changed is review-presentation classification only. Do not add formatting-only, filename, metadata, or generic semantic-diff classifications. The complete exact unified diff remains the review evidence for every canonical byte change.
- Do not add component deletion, removed-component state, ghosts, or UI.
- Compare relationship facts as a multiset of `(source component ID, target component ID, exact relationship label)`, including multiplicity.
- Pair equal relationship facts only up to the minimum multiplicity present in both snapshots. Candidate surplus facts are added; base surplus facts are removed.
- Treat a changed target or label as one removed relationship fact and one added relationship fact. Identical parallel facts remain semantically indistinguishable.
- Do not introduce relationship IDs. Deterministic projection-only edge keys may distinguish rendered occurrences but remain browser/presentation data and never enter Architecture state or confirmation.
- Supply change classifications from the backend's exact snapshots or another concrete backend-owned comparison over those snapshots. The browser may turn that supplied review projection into Cytoscape elements, styling, and selection behavior; it must not parse canonical Markdown/frontmatter or create a competing Architecture graph interpretation.
- In **With changes**, visually subdue unchanged topology, accent added components and relationships, mark changed existing components even when only documentation changed, and render removed relationship facts distinctly, such as dashed/ghosted comparison annotations.
- Keep cycles, disconnected components, parallel labels, and exact-label whitespace fidelity representable.

### Review context and exact diff

- Keep the complete presented unified diff bytes from the existing controlled Git tree diff. Do not replace, normalize, truncate, or rewrite that evidence.
- Present the raw diff inside the same Review changes task, either alongside the canvas when space permits or as a clearly reachable review region within that workspace.
- Split the presented diff into display lines only for basic styling and navigation. Color added and removed lines and keep headers/context readable. Do not add syntax highlighting, a semantic diff, or rendered Markdown before/after comparison.
- Associate a changed component with its canonical component file section. Associate a changed relationship with its source component's frontmatter section. Selecting a visual change scrolls/focuses the closest relevant file or hunk in the exact unified diff without manufacturing different diff content.
- Preserve accessibility: visual color is not the only change indicator; selected/added/changed/removed states have textual or structural labels, and diff focus is keyboard reachable.
- If Cytoscape or its canvas cannot render, show a concise product-language failure in the visual region while keeping the complete diff, review details, and **Update architecture** path usable.

### Deterministic non-canonical layout

- Replace the current random/reload-sensitive review layout with deterministic, stable-ID-aware automatic positioning.
- Use one deterministic layout basis for the bound base/candidate pair so unchanged component IDs occupy the same positions across **Before changes** and **With changes** as far as the graph permits.
- A union of the bound review component IDs may be used solely to calculate transient review positions; it is not a third snapshot or combined Architecture topology.
- Reusing transient positions from an already rendered accepted/base map within the current browser session is allowed as an optimization.
- Keep positions, viewport, selection, and layout entirely in browser memory. Do not add canonical coordinates, Diagram state, backend layout state, SQLite layout state, local-storage persistence, or a correctness dependency on retained positions.
- Keep pan, zoom, and fit usable. Toggle and selection must not make the map jump needlessly or lose the human's place without reason.

### Review-related workspace polish

- Visibly mark a Changes-in-progress row that owns the current validation blocker. Use the existing backend validation component/relationship location rather than inventing browser validation semantics or an aggregate validation engine.
- Make **Fix relationship** and other available corrective actions look and behave as actions, not passive text.
- When the existing validation location identifies a relationship target or label, opening the fix action focuses that exact control and gives it a visible error treatment plus associated accessible guidance.
- Keep the existing quiet treatment of incomplete pending authoring before review. The stronger row/control indication appears when review has made the validation problem actionable.
- Add contextual clear/deselect without creating URL state, history state, or another workspace navigation framework.
- Make only the bounded pane/layout changes needed for the map, selected review context, and exact diff to remain usable together on a normal desktop viewport. Preserve the drafting-table direction and existing narrow structural fallback.
- Dedicated themed-scrollbar work is out of scope; incidental styling needed by a changed review pane is acceptable.

## Architecture invariants exercised

- The reviewed candidate is the one complete validated candidate used by confirmation.
- Review remains bound to one exact base commit, candidate tree, and pending generation.
- The base side is historical review evidence, not live accepted authority.
- Index, map, documentation/detail, titles, and relationships always project one selected immutable review snapshot together.
- Invalid pending state cannot become a reviewed visual candidate.
- Component identity controls matching and selection; filenames and titles remain presentation.
- Relationships retain source-owned semantic facts, exact labels, multiplicity, no IDs, and no ordering meaning.
- The exact canonical unified diff remains complete review evidence; visual review is assistive.
- The normal workspace map remains an exact accepted-snapshot projection and never gains a pending/draft overlay.
- Layout and review selection remain non-canonical disposable UI state.
- Existing reviewed-binding invalidation, stale-base protection, CAS authority, post-CAS success boundary, source isolation, and SQLite boundaries remain unchanged.

## Acceptance criteria

- A valid reviewed multi-file candidate opens one Review changes workspace with **With changes** selected and the complete exact unified diff directly reachable.
- The review response and confirmation still carry the exact same base commit, candidate tree, and pending generation; no extra reviewed candidate or confirmation path exists.
- **Before changes** shows only the exact bound base snapshot. **With changes** shows only the exact reviewed candidate snapshot.
- Toggling changes the index, map, selected documentation/detail, titles, and relationship topology together without mixed-snapshot content.
- Candidate-only components disappear from the base index/map, and their candidate documentation is not shown in the base view.
- Added components and relationships, changed existing components, and removed relationship facts are visually distinct without relying only on color.
- A documentation-only component edit marks the node content-changed, while a relationship-only edit changes the visual edge facts without falsely marking its source node content-changed. If both occur, both treatments appear.
- Relationship comparison preserves exact labels and multiplicity. A target/label edit appears as removed plus added, and no relationship ID enters any response as domain state or canonical file.
- Selecting a changed component or relationship focuses its review context and the relevant exact-diff file/hunk while leaving the unified diff content complete and unchanged.
- A review pair produces deterministic stable-ID-aware positions; unchanged nodes do not gratuitously rearrange when toggling.
- A clearly failed map render leaves the diff, review details, and deliberate acceptance action usable.
- Validation-bearing pending rows and exact relationship controls receive visible, accessible guidance, and Fix is visibly actionable.
- Clear/deselect returns the contextual pane to a useful neutral state and does not bypass dirty-editor protection.
- Pending work and visual review do not alter the normal accepted map/index/documentation before successful CAS.
- Existing mutation invalidation, stale review, confirmation binding, successful acceptance, refresh, discard, project switching, restart reconstruction, safe Markdown rendering, source isolation, and SQLite behavior do not regress.
- No portable-format, canonical-store, dependency-driven semantic, or Diagram decision enters the implementation.

## Real validation

### Focused backend and real-Git evidence

Use real temporary bare Architecture repositories and the existing candidate/review production path.

- Construct one accepted base and one multi-file candidate containing an added component, an added relationship to that component, a removed relationship fact, a target or label edit, parallel identical and differently labelled relationships, and a documentation-only component edit.
- Prove review exposes the exact base snapshot already held by the pending set and the exact existing candidate snapshot, with the existing `(base commit, candidate tree, generation)` binding unchanged.
- Prove the component and relationship delta observes stable IDs, exact labels, and multiset multiplicity. Cover the changed-target/label remove-plus-add rule, a relationship-only edit that does not mark the source node content-changed, a documentation-only edit that does, and a combined edit that receives both treatments.
- Prove invalid candidate construction retains pending state and validation location but returns no reviewed snapshots or visual-review data.
- Mutate the pending set after review and prove the old visual review and old confirmation binding are invalid together.
- Externally advance accepted after review and prove existing stale handling does not replace the review's bound base with newly observed Architecture or permit stale confirmation.
- Prove response construction and comparison make no accepted-ref/object mutation, no source-repository change, and no logical SQLite mutation.

### Focused frontend evidence

- Prove **With changes** is primary and the compact toggle atomically switches index, map elements, selected documentation/detail, titles, and relationships between the supplied bound projections.
- Cover a selected component present in both snapshots and a candidate-only component that cannot leak its detail into **Before changes**.
- Cover visual classes/accessible labels for unchanged, added, content-changed, and removed relationship comparison annotations. Include a relationship-only edit without a content-changed source node, a documentation-only component change, a combined content/relationship change, and parallel relationship multiplicity.
- Prove map/index/diff selection stays bound by stable component identity when titles collide.
- Prove selecting a node or edge focuses the associated review context and exact diff section.
- Prove raw diff line presentation preserves all content while adding only basic added/removed/context styling.
- Make Cytoscape fail through the test-owned module boundary and prove the clear visual failure leaves complete diff and confirmation available. Do not add production fault-injection controls.
- Prove deterministic review layout inputs/positions remain stable across repeat construction and base/candidate toggling without persistence.
- Prove row-level validation indication, visibly actionable Fix, exact relationship focus/error guidance, clear/deselect, and the dirty-editor guard.
- Preserve separate runner-owned asynchronous cases; do not recreate the prior manual test-loop/OOM defect pattern.

### Integrated browser evidence

Use the production frontend build served by the real loopback Go process, real Git executable, real filesystem, and real SQLite association state. Keep automated browser evidence bounded to the coherent review path rather than replaying Gate 1.

- Open a real accepted Architecture, author the representative multi-change candidate through structured controls, and verify the normal accepted workspace remains exact before review and acceptance.
- Review through the real endpoint and built workspace, toggle both exact snapshots, navigate map/index/documentation and exact diff, then deliberately accept through the existing confirmation/CAS path.
- In a separate controlled browser context, make the canvas unavailable at browser startup and prove the same validated review retains its exact diff and confirmation path without adding a production test switch.
- Confirm successful acceptance publishes the already-validated candidate snapshot and normal accepted workspace together, then restart and reconstruct the exact accepted result.

Run the ordinary repository checks once through documented commands. If a frontend test process grows abnormally or does not terminate, stop it and treat that as a test defect; do not add manual render loops, alternate raw Vitest commands, or machine-wide limits.

## Real human checkpoint

Use the built UI, real Go backend, real Git, real filesystem, and real SQLite state with one existing component-bearing Architecture. Record the accepted revision and create one coherent pending candidate containing:

- a new component and relationship to it;
- one removed relationship fact;
- one relationship target or label change;
- parallel relationship multiplicity sufficient to inspect matching;
- a documentation-only edit to an existing component.

Then prove:

1. Before review, the normal accepted index, map, documentation, and relationship topology remain unchanged.
2. One deliberately invalid relationship attempt remains under Changes in progress, marks the owning row, exposes an obvious Fix action, focuses/highlights the exact field, and produces no visual review. Correct it through the normal editor.
3. Review details retain the exact recorded base commit, candidate tree, and generation.
4. **With changes** displays the complete candidate projection and visibly distinguishes the required added/changed/removed facts, including the documentation-only component.
5. **Before changes** displays the exact bound base across index, map, selected documentation/detail, titles, and relationships. It does not show live accepted data or candidate-only documentation.
6. Repeated toggling does not gratuitously rearrange unchanged components, and selection remains identity-consistent between map, index, detail, and diff focus.
7. Selecting representative changed components and relationships leads to their review context and relevant region of the complete exact unified diff. Added/removed coloring improves readability without replacing raw diff evidence.
8. Clear/deselect returns the contextual pane to a neutral state and dirty editor values still receive the existing navigation guard.
9. With canvas rendering deliberately made unavailable in a separate controlled browser context, the visual region fails clearly while the same validated review's complete diff, exact details, and Update architecture action remain usable.
10. Deliberate Update architecture succeeds through the existing binding/CAS path, after which the normal accepted workspace advances together and a fresh backend process reconstructs the same revision.
11. For a second small reviewed change, externally advance accepted before confirmation and verify the existing stale-review behavior remains truthful; the bound base is never replaced by the newer Architecture and stale confirmation cannot overwrite authority.
12. Source-repository and SQLite isolation remain exact.

Keep evidence proportional. Reuse established setup/inspection practices rather than replaying the complete Gate 1 initialization and corruption matrix.

## Dependencies

- Architecture Gate 1 complete at `6159e706ae7be90da57fe66f4336e1c558e8b21d`.
- Approved Phase 1 documentation baseline `8ac46febd67c57e286e914c9a4e3ea08fcf22ded`.
- Existing I2.2/I2.3 candidate, validation, review binding, diff, confirmation, and CAS path.
- Existing I3 accepted-snapshot workbench, map, documentation, relationship authoring, stale/refresh behavior, discard, and project-switch behavior.

## Explicit exclusions

Do not introduce:

- a pending/draft overlay on the normal accepted workspace map;
- Diagram objects, Diagram files, or format v2;
- persisted or manual layout;
- graphical component or relationship editing;
- persisted or project-scoped pending changes;
- URL-backed workspace restoration;
- syntax highlighting;
- rendered or semantic Markdown diff;
- themed-scrollbar work beyond incidental styling required by the review layout;
- component deletion or removed-component visualization;
- relationship IDs, lifecycle, taxonomy, or ordering semantics;
- proposal review, history, revert, merge/rebase/reconciliation, or another acceptance workflow;
- Planning, Agent Control, source/runtime overlays, or another WorkBraid vertical;
- any post-Phase-1 Diagram membership, hierarchy, crossing-relationship, schema, migration, layout, kind, or renderer decision.

## Integration and completion boundary

After plan approval, prepare one exact execution packet on top of the approved docs-inclusive baseline. Dispatch one implementation worker from that clean packet-inclusive SHA. A fresh reviewer who did not implement the change reviews the complete result against the Architecture, UI, roadmap, and execution packet, then runs the bounded ordinary checks once.

Only after a clear independent review should the exact implementation be integrated and the real human checkpoint begin. A failed approved workflow freezes the increment for classification and bounded correction; any missing Architecture or product semantic returns to the human.

Phase 1 completes only after automated evidence, fresh review, integration, real restart reconstruction, and the human checkpoint explicitly pass. Stop afterward. Do not begin Diagram design or implementation from this plan.
