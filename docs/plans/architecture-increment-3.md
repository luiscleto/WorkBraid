# Architecture Increment 3 plan

Status: Approved
Architecture baseline: `docs/architecture-v0.md`
UI baseline: `docs/ui-v0.md`
Parent plan: `docs/plans/architecture-gate-1.md`
Prerequisite: Architecture Increment 2 complete; final I2.3 completion record is in `docs/plans/architecture-i2.3.md`
Target: Relationships, safe documentation, the accepted-state map, and explicit accepted refresh

Architecture or product changes discovered during implementation require explicit human approval rather than silent changes to this plan or its baselines.

## Objective and boundary

Increment 3 turns the transitional Increment 1–2 interface into the approved map-centered Architecture workbench. A human can navigate accepted components through a compact index and interactive map, read their safely rendered documentation, author explicit outgoing relationships through structured controls, deliberately accept those changes through the existing review/commit flow, and explicitly refresh externally advanced accepted Architecture.

The component index, map, accepted documentation, and relationship resolution are projections of one immutable snapshot at one exact accepted revision. Pending title changes and newly created pending components do not appear in the index or map before acceptance. Pending relationship changes do not alter accepted topology. All pending work remains reachable through **Changes in progress**.

The existing accepted-snapshot loader remains the sole interpretation path for accepted Architecture. The existing pending candidate construction, validation, review binding, commit creation, and accepted-ref compare-and-swap path remain the sole direct-human acceptance path. The browser renders and interacts with snapshot data supplied by the backend; it does not parse canonical frontmatter, infer relationships, resolve accepted authority, or construct a competing graph model from Git/filesystem state.

Implementation remains sequential with concurrency one. Each item receives a separate approved execution packet, one implementation worker, fresh independent review, integration, and a real human checkpoint before the next item begins.

## I3.1 — Accepted Architecture workbench, map, and safe documentation

### User-visible outcome

After a project is opened, the project-opening sheet is replaced by the durable Architecture workbench:

- a compact application frame identifies the current project and Architecture, offers an unobtrusive way to open another project, and stays quiet unless stale/non-current state needs attention;
- a compact component index provides title-based navigation and the minimal **Add component** affordance;
- the accepted Architecture map is the main canvas;
- one contextual working pane shows the selected component's accepted documentation or the existing structured authoring task;
- a compact **Changes in progress** affordance opens pending editing and review in the working area rather than adding another permanent region.

The opening/setup experience is a separate entry state and is no longer visible above an open workspace. Selecting an accepted component in either the index or map selects the same stable component identity and displays its accepted documentation. If Changes in progress exists, leaving for another project requires the human either to keep working in the current workspace or explicitly discard the entire pending change set first.

### Implementation scope

- Recompose the existing browser flow into the approved workspace without changing established project opening, setup, authoring, review, acceptance, stale-base, or source-isolation semantics.
- Extend the existing accepted-snapshot response only with the accepted relationship and Markdown-body information needed by the map and documentation surface. Do not expose canonical frontmatter as a browser-owned model.
- Keep the component index deliberately compact and bind selection to stable component identity. Show titles normally; only when titles collide, show the minimum filename or shortened-ID context needed to disambiguate them. Do not make IDs or paths general index chrome, and do not add filters, status columns, row actions, component-management chrome, or a dashboard.
- Project every accepted component into one titled map node and every accepted outgoing relationship into a directed labelled connection. Use projection-only edge keys where needed so parallel relationships remain distinct without gaining domain IDs.
- Use automatic layout and provide selection, pan, zoom, and fit as UI behavior. Selection, viewport, and layout remain non-canonical and need no persistence.
- Keep cycles and multiple labelled relationships between the same source and target representable and inspectable. Do not assign relationship order any domain meaning or prescribe a portable parallel-edge rendering convention.
- Render accepted component Markdown using only the approved UTF-8 CommonMark behavior plus tables, task lists, strikethrough, and autolinking.
- Treat raw HTML as literal inert content rather than active HTML. Fenced code remains presentation-only; Mermaid, directives, includes, executable blocks, and similar syntax receive no special behavior.
- Make the browser renderer explicitly prevent Markdown image, embed, and resource syntax from causing automatic remote or local resource access; do not rely on renderer-library defaults for this boundary. Rendering also never executes authored content. Normal links may be followed only by deliberate user action. Markdown links never create Architecture relationships.
- Make the right working pane contextual: accepted documentation when reading, and the existing Title/Description component editor when adding or editing. Do not create a separate component-management page.
- Keep **Changes in progress** compact in the workspace frame or navigation. Opening it reuses the working area; complete diff review may temporarily take more workspace width.
- Add one deliberate whole-set **Discard changes** action within the Changes-in-progress task. It clears the backend-held pending set and any reviewed-candidate state without modifying Git refs or objects, accepted Architecture, source files, SQLite Architecture state, or the loaded accepted snapshot.
- If pending work exists, **Open another project** must not leave the current workspace, silently discard the pending set, or strand it behind another loaded project. Direct the human to continue working or deliberately discard the whole set; only then may the application return to the project-opening state.
- Keep discard intentionally whole-set. Do not add partial discard, undo/redo, multiple pending sets, persistence, merge, rebase, reconciliation, or a general draft lifecycle.
- Ensure the index and map always use accepted titles and accepted topology from the same snapshot. Pending title edits do not rename their nodes/index entries, and pending new components do not appear there before acceptance.
- For an empty accepted Architecture, show a restrained real empty state with the existing creation action rather than fake nodes, placeholder panels, or disabled future controls.
- Structure the desktop workbench so its regions can later collapse into one-at-a-time surfaces at narrower widths, without designing mobile-specific interaction now.

Exact browser component boundaries, map-library integration details already bounded by the parent plan, renderer-library wiring, and transient selection behavior are implementation details. They must not create another accepted-state authority or broaden Markdown semantics.

### Architecture invariants exercised

- Map topology, accepted titles, accepted documentation, and relationship resolution come from one immutable snapshot at one exact accepted commit.
- The map and component index project accepted Architecture only; pending topology and pending component identity remain outside them until acceptance.
- Component identity, not title or filename, binds index selection, map selection, and documentation.
- Multiple relationships and cycles are valid; relationships have meaningful direction and free-text labels but no stable IDs or ordered semantics.
- Markdown rendering is inert, does not rewrite canonical source, does not infer Architecture relationships, and performs no automatic arbitrary network/file access.
- Project opening is not permanent workspace chrome, and stale/non-current state is conspicuous only when relevant.
- Explicit discard affects only non-canonical backend-held pending/review state; accepted and operational authorities remain unchanged.
- Layout, selection, viewport, and index order remain non-canonical UI state.

### Acceptance criteria

- Opening a linked project replaces the opening sheet with the Architecture workbench. With no pending work, opening another project deliberately returns to the entry state; with pending work, it remains in the current workspace until the human continues or explicitly discards the whole pending set.
- The compact index and map contain exactly the components from the loaded accepted revision and use their accepted titles.
- Duplicate titles remain independently selectable by stable identity; only colliding entries receive minimal filename or shortened-ID disambiguation context.
- The map contains every accepted relationship, including cycles and multiple independently inspectable labels between the same source and target.
- Selecting the same component through the index or map focuses the same accepted documentation in the contextual pane.
- Accepted Markdown renders tables, task lists, strikethrough, autolinks, and fenced code as approved.
- Raw HTML remains visibly inert, executable/special block syntax does not run, and authored content causes no automatic arbitrary remote or local resource access.
- The existing Add/Edit and Changes-in-progress tasks are reachable through the contextual workspace without being appended below the map or becoming permanent dashboard regions.
- Pending new components and pending title changes remain visible through Changes in progress but do not alter the index or map.
- **Discard changes** clears the entire pending set and reviewed-candidate state, leaves Git refs/objects, accepted Architecture, source files, SQLite Architecture state, and the loaded accepted snapshot exact, and then permits leaving the workspace or beginning new work from the loaded accepted revision.
- Empty Architecture remains usable and has no fake map content or speculative chrome.
- Existing accepted review/commit, restart, stale handling, and source-repository isolation continue to work unchanged.

### Real validation

Focused backend tests use real temporary bare repositories to load exact accepted snapshots containing empty Architecture, disconnected components, duplicate titles, cycles, and parallel labelled relationships. They prove the browser-facing snapshot data corresponds to the exact loaded commit and that no second Git/frontmatter interpretation path exists.

Focused backend/frontend tests prove whole-set discard removes pending/review state without changing Git, accepted snapshot, SQLite Architecture state, or source files, and that project switching remains blocked while pending work exists. Frontend tests also cover workspace entry/exit, synchronized ID-based index/map selection, duplicate-title disambiguation without general ID/path chrome, accepted-versus-pending titles and components, contextual documentation/edit/changes tasks, empty Architecture, and safe rendering of the approved Markdown cases. Security-oriented fixtures prove the browser renderer explicitly suppresses automatic remote/local access from image, embed, and resource syntax rather than inheriting library defaults; raw HTML is inert, fenced/special syntax does not execute, and links require deliberate action.

The real human checkpoint uses the built UI served by the real Go process, a real compatible Git executable, a deliberately prepared valid private bare-store fixture, real SQLite association state, and real throwaway source repositories. Open accepted component-bearing Architecture with representative authored relationships; verify the opening sheet disappears, index/map/documentation agree at one recorded revision, parallel relationships remain inspectable, safe rendering behaves as approved, and pending component/title changes do not alter accepted projections. While pending work exists, verify opening another project is blocked without loss; deliberately discard the whole set, prove accepted Git/snapshot, SQLite, and source files remain unchanged, then open another project. Stop before I3.2.

### Dependencies

Completed Architecture Increment 2.

### Deliberately deferred

Relationship authoring, explicit external accepted refresh behavior beyond preserving the existing open/reopen semantics, partial discard, undo/redo, multiple pending sets, persisted pending work, merge/rebase/reconciliation, graphical editing, draft-topology preview, persisted/manual layout, grouping, hierarchy, map overlays, source inference, remote-media policy, general component management, and mobile-specific UX.

### Integration and human checkpoint

I3.1 receives its own approved execution packet and one implementation worker. A fresh reviewer checks the complete diff against the Architecture/UI baselines, especially snapshot unity, accepted-versus-pending projection, safe rendering, workspace composition, and absence of a frontend authority path. After integration, run focused real-Git/backend/frontend/security checks and the production build, then perform the real checkpoint above. Record exact base/implementation SHAs, review outcome, accepted fixture revision, source-isolation evidence, and human result. Do not begin I3.2 until the human explicitly accepts I3.1.

## I3.2 — Structured outgoing-relationship authoring

### User-visible outcome

In the contextual component editor, a human can inspect and edit a component's outgoing Architecture relationships using structured target and label controls. The target is presented primarily by component title and selected by stable identity; duplicate titles receive only enough context to distinguish them.

Relationship edits join the same backend-held multi-file Changes in progress as Title, Description, and new-component changes. The accepted index and map remain unchanged while those edits are pending. After the existing exact review and deliberate acceptance flow succeeds, the new accepted snapshot updates documentation and map topology together.

### Implementation scope

- Extend the existing structured component editor and single backend-held pending change set with outgoing-relationship replacement/editing for a source component. The containing component continues to imply the source ID.
- Present each relationship as a target choice and a short source-relative human-readable label. Store targets by stable component ID and labels as authored free text subject only to the approved non-empty-after-trimming structural rule.
- Offer target choices from the complete candidate context, including accepted components and already-kept pending new components. An outgoing relationship may target a pending new component in the same pending change set using that component's generated stable ID; complete-candidate validation resolves it. Neither a pending-new source nor target appears in accepted map/index topology until successful acceptance.
- Present targets primarily by title. When titles collide, show the minimum filename or shortened-ID context needed to disambiguate identity; do not make IDs or filenames normal authoring language.
- Permit cycles and multiple independently labelled relationships from one source to the same target. Do not add relationship IDs, taxonomy, hierarchy, lifecycle, or domain ordering.
- Allow the human to add, change, and remove outgoing declarations through structured controls. Component deletion remains absent.
- Preserve the component ID, filename, title H1, Markdown body, and regular-file mode when only relationships change. Title/Description-only edits continue to preserve unchanged frontmatter exactly; relationship edits rewrite only the canonical metadata that must change without introducing a general lossless-YAML subsystem.
- Reuse the one existing candidate construction and complete validation path. Target resolution runs against the complete candidate revision, never only the currently edited component or accepted snapshot.
- Reuse the existing exact diff review, reviewed binding, successor commit, and accepted-ref CAS flow unchanged. Relationship frontmatter changes appear in the complete canonical diff.
- Keep relationship authoring in the working pane. Do not add graphical edge creation/editing or make the map draft-aware.

Exact control layout, collision-context formatting, and the projection-only UI keys used for unsaved relationship rows are bounded implementation details. They must not become portable relationship identity or schema.

### Architecture invariants exercised

- Relationships are explicit source-owned authored facts with implied source, stable target ID, meaningful direction, and free-text label.
- Targets resolve within the complete candidate revision, including coherently changed/new component files.
- Multiple relationships between the same components and cycles remain valid.
- Relationship order has no domain meaning and relationships receive no stable IDs or lifecycle.
- Pending topology has no effect on accepted map/index projections until successful accepted-ref advancement.
- Relationship changes share the existing pending candidate, validation, exact-diff, and CAS authority paths rather than introducing alternate semantics.
- Relationships are never inferred from Markdown links, source code, runtime traffic, Planning, or Agent Control.

### Acceptance criteria

- A human can add, edit, and remove outgoing relationship declarations through structured component authoring.
- Duplicate-title targets are selectable by stable identity with enough visible context to distinguish them.
- One pending change set can contain new components, component text edits, and relationships between components in the complete candidate.
- A relationship to a pending new component stores its generated stable ID, resolves against the complete candidate, and remains absent from accepted map/index topology along with its pending-new source or target until successful acceptance.
- Cycles and multiple labels between the same source and target survive candidate validation, complete diff review, accepted commit, reload, and restart.
- A blank label, malformed declaration, or unresolved target blocks review/acceptance with concise product-language guidance while preserving Changes in progress and accepted Architecture.
- Before acceptance, the accepted index and map retain their exact prior titles/nodes/edges; pending components and relationship changes remain reachable only through Changes in progress.
- After successful CAS, the already-validated accepted snapshot updates index, documentation, and map together at the successor revision.
- Relationship-only edits do not change component identity, filename, title/body bytes, or regular-file mode.
- The source repository remains untouched and SQLite gains no Architecture projection.

### Real validation

Focused real-Git/backend tests construct and validate complete candidates containing accepted and pending-new targets, duplicate titles, cycles, parallel relationships, blank labels, and unresolved IDs. They prove unchanged canonical content and regular-file modes are retained, the exact review diff contains relationship frontmatter changes, and the existing CAS/restart path reconstructs the same accepted relationships.

Focused frontend tests cover stable-ID target selection, duplicate-title disambiguation, add/change/remove controls, pending-new targets, product-language validation at the review boundary, and accepted-map isolation before acceptance.

The real human checkpoint uses the built application and real authorities. Through the structured UI, create or edit multiple components, author a cycle and at least two differently labelled relationships between one source and target, keep them in one pending change set, verify the accepted map is unchanged, inspect the complete diff, deliberately update Architecture, and verify the accepted map and documentation advance together. Restart the backend and confirm the identical revision, relationships, and topology reconstruct. Verify the source repository remains untouched. Stop before I3.3.

### Dependencies

I3.1 integrated, independently reviewed, and human-accepted.

### Deliberately deferred

Graphical relationship editing, draft topology preview, relationship IDs/lifecycle/taxonomy, relationship ordering semantics, component deletion and inbound-reference handling, persisted drafts, reconciliation, manual/persisted layout, grouping, overlays, source inference, and explicit refresh behavior beyond current accepted transitions.

### Integration and human checkpoint

I3.2 receives its own approved execution packet and one implementation worker. A fresh reviewer checks stable-identity target selection, complete-candidate resolution, exact canonical preservation, reuse of the single pending/review/CAS path, accepted-map isolation, product language, and scope exclusions. After integration, run focused real-Git/backend/frontend/race checks and the production build, then perform the real checkpoint above. Record provenance, reviewed base/candidate/successor identities, review outcome, restart/topology evidence, source isolation, and human result. Do not begin I3.3 until the human explicitly accepts I3.2.

## I3.3 — Explicit accepted refresh and non-current state

### User-visible outcome

The Architecture workspace has a compact explicit **Refresh** action. WorkBraid remains quiet when the loaded accepted revision is current. If accepted Architecture advances externally, refresh either adopts one complete valid replacement snapshot or clearly marks the existing view stale/non-current when the new revision cannot be loaded.

Refresh never silently repairs, falls back, merges, rebases, or overwrites. Pending changes remain bound to their exact base and become visibly stale when accepted Architecture has advanced; they remain reachable read-only through Changes in progress without being projected onto the accepted map. The established whole-set **Discard changes** operation remains available so stale non-canonical work can be cleared and new work can begin against the current accepted revision.

### Implementation scope

- Add one explicit workspace refresh operation that resolves only `refs/heads/accepted`, reads its exact committed tree, constructs and structurally validates the complete immutable replacement snapshot through the existing accepted loader, and publishes it only after complete success.
- Do not add a watcher, polling loop, per-read Git resolution, checkout-based loading, fallback ref, or SQLite Architecture projection.
- If `accepted` still identifies the loaded revision, retain the existing snapshot without manufacturing positive status chrome or canonical churn.
- If `accepted` identifies a different valid supported revision, atomically replace the accepted snapshot. Update the map, component index, accepted documentation, and relationship resolution together from that one revision.
- If a pending change set is based on the older revision, preserve it against its exact base, invalidate any prior review, mark it stale/read-only, and keep it reachable through Changes in progress. Do not rebase, merge, reconstruct, or apply it to the new accepted snapshot.
- Reuse I3.1's existing **Discard changes** operation for a stale pending change set. It continues to clear that entire backend-held non-canonical pending set and associated review state without modifying Git refs or objects, accepted Architecture, source files, or persisted Architecture state. Once it is discarded, new pending work may begin against the current accepted revision.
- Keep discard intentionally whole-set and irreversible within this slice. Do not add partial discard, undo/redo, multiple pending sets, merge, rebase, reconciliation, or a general draft lifecycle.
- If the externally named revision is invalid, unsupported, missing, or otherwise cannot be completely loaded, retain the previous valid snapshot only as conspicuously stale/non-current read-only reference. Do not present it as accepted state or permit direct commit from it.
- Use product language in the normal UI. Raw ref names, manifest/parser errors, object IDs, or fallback terminology belong only in deliberate technical inspection where useful.
- Keep selection, viewport, and layout as disposable UI state across refresh. Preserving or resetting them is an implementation detail and has no canonical meaning.
- Preserve the existing behavior where WorkBraid's own successful CAS directly publishes its already-validated successor snapshot; explicit refresh is for external advancement/reload, not an additional post-commit authority mechanism.

### Architecture invariants exercised

- `refs/heads/accepted` is the sole accepted authority; external authoritative advancement is recognized without a hidden competing acceptance record.
- Refresh resolves and validates one exact complete revision before switching any accepted projection.
- Map, index, documentation, and relationship resolution advance atomically as one immutable replacement snapshot.
- Invalid external state never triggers fallback or makes a previous snapshot appear current.
- Pending changes never silently move from their exact base or overwrite newer accepted Architecture.
- Explicit discard removes only a non-canonical pending change set and creates no competing accepted-state transition.
- No watcher, polling, automatic repair, reconciliation, or persisted Architecture projection is introduced.

### Acceptance criteria

- A valid external advancement is invisible until explicit refresh and is then adopted as one exact revision across map, index, documentation, and relationships.
- Refreshing when `accepted` has not changed leaves the workspace quiet and does not mutate canonical Git, associations, pending state, or source-project state.
- With an older pending change set present, valid external advancement and refresh preserve that pending set against its original base, mark it stale/read-only, invalidate confirmation, and show only the newly accepted topology in the accepted map.
- Stale pending work cannot be reviewed or accepted. **Discard changes** clears the complete stale pending set without changing Git, accepted Architecture, source files, or persisted Architecture state; afterward, new pending work can begin against the current accepted revision.
- An invalid or unsupported external advancement leaves the prior valid projection visibly stale/non-current and read-only, with no fallback claim, direct commit, automatic initialization, repair, reset, or replacement action.
- Correcting `accepted` externally and refreshing again can construct and publish a valid current replacement snapshot without restarting WorkBraid.
- A genuinely fresh backend process using the same application-data directory independently reconstructs the same valid accepted revision and workspace state.
- The source repository remains untouched and SQLite records no Architecture snapshot/history.

### Real validation

Focused real-Git/backend tests externally advance `accepted` to: the same commit, a different valid revision, a valid revision while pending work is based on the old commit, one representative invalid revision, and one unsupported revision. They prove exact-ref authority, atomic snapshot publication, stale pending preservation, no fallback, no mutation on failed load, and successful later refresh after external correction. A focused case reuses the established discard operation and proves the entire stale pending set and review state are removed atomically from the running backend, Git refs/objects and accepted snapshot remain unchanged, no Architecture state is persisted, and a new pending set can then bind to the current accepted revision.

Focused frontend tests prove explicit-only adoption, quiet unchanged refresh, synchronized map/index/document replacement, conspicuous stale/non-current presentation, read-only behavior, retained stale Changes in progress, whole-set discard, and product language without internal Git/parser terminology. No review/accept action is available for stale pending work, and discard is not presented as reconciliation or partial editing.

The real human checkpoint uses the built application and real Git/filesystem/SQLite authorities. Record the loaded revision and visible topology; advance `accepted` externally to a different valid revision and verify nothing changes before **Refresh**, then verify every accepted projection advances together afterward. Repeat with pending work based on an older revision and confirm the new accepted map loads while the pending work remains visibly stale and non-committable. Use **Discard changes**, verify accepted Git/map/documentation and source files do not change, then begin new pending work against the current accepted revision. Advance `accepted` to one representative invalid revision and verify refresh retains the previous view only as conspicuously stale/read-only with no fallback or repair action. Correct `accepted`, refresh successfully, restart WorkBraid, and verify exact reconstruction. Confirm the source repository remains untouched.

### Dependencies

I3.1 and I3.2 integrated, independently reviewed, and human-accepted.

### Deliberately deferred

Watchers, polling, automatic refresh, fallback refs/snapshots presented as current, repair/reset/reconstruction workflows, pending-change rebase/merge/reconciliation, multiple pending sets, partial discard, undo/redo, general draft lifecycle, persisted pending state, SQLite Architecture projections, history browsing, arbitrary comparisons, revert, proposals, graphical editing, manual/persisted layout, grouping, overlays, source inference, export/synchronization, and mobile-specific UX.

### Integration and human checkpoint

I3.3 receives its own approved execution packet and one implementation worker. A fresh reviewer checks accepted-only resolution, complete replacement publication, prior-snapshot stale semantics, stale pending preservation, absence of fallback/repair/reconciliation, product language, restart reconstruction, and source isolation. After integration, run focused real-Git/backend/frontend/race checks and the production build, then perform the real checkpoint above. Record exact prior/external/corrected revisions, review outcome, stale-state evidence, restart evidence, source isolation, and human result.

## Increment 3 completion boundary

Increment 3 is complete only when I3.1, I3.2, and I3.3 have each passed their own approved execution packet, integration, fresh independent review, and real human checkpoint in sequence through the built browser UI, real Go backend, real Git executable, private bare Architecture repository, filesystem, and SQLite association state.

At completion, WorkBraid can create and accept a connected Architecture through structured relationship authoring, navigate its exact accepted components and documentation through the map-centered workbench, safely render the approved Markdown subset, and explicitly adopt or truthfully reject external accepted revisions. The complete Gate 1 workflow remains Increment 4.

## Increment 3 exclusions

Do not implement:

- graphical component or relationship creation/editing;
- draft topology or pending-title preview in the accepted map/index;
- manual or persisted map layout, grouping, hierarchy, or Architecture overlays;
- relationship IDs, lifecycle, taxonomy, or domain ordering;
- component deletion, file rename, raw-frontmatter editing, or deliberate identity replacement;
- automatic source-code/runtime inference or Planning/Agent-Control integration;
- remote/embedded Markdown resource policy beyond preventing automatic access in this slice;
- persisted pending changes, reconciliation, merge, or rebase;
- automatic accepted watchers/polling or fallback/repair machinery;
- history browsing, arbitrary comparison, semantic diff, or revert;
- source-repository export/synchronization;
- general component-management dashboards, future-vertical navigation, authentication, remote access, multi-user behavior, or mobile-specific UX;
- Increment 4 gate assembly or later Architecture features.
