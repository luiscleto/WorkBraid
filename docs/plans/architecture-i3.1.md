# Architecture I3.1 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plans: `docs/plans/architecture-gate-1.md` and `docs/plans/architecture-increment-3.md`

Completed prerequisite: Architecture Increment 2, including the completed `docs/plans/architecture-i2.3.md` record

Work item: I3.1 — Accepted Architecture workbench, map, and safe documentation

Exact Increment 3 planning base before this I3.1 refinement: `cb3ac738b705a4a2e68b18604d4f4648d086e923`

## Execution base

This approved packet must be committed together with the approved `docs/plans/architecture-increment-3.md` I3.1-discard refinement on top of the exact clean base above. That resulting docs-inclusive commit becomes the exact worker base and must be reported before dispatch. No implementation may start from the pre-packet base.

The worker must start from that one exact clean packet commit, not directly from `cb3ac738b705a4a2e68b18604d4f4648d086e923`, because the worker base must contain this approved packet and every approved document it is instructed to read. Before changing code, the worker verifies:

- `HEAD` equals the dispatcher-provided docs-inclusive worker-base SHA;
- the worktree is clean;
- this packet records Status Approved;
- `docs/plans/architecture-increment-3.md` records Status Approved;
- `docs/plans/architecture-i2.3.md` records I2.3 complete with human checkpoint PASS.

Dispatch exactly one implementation worker. After it completes, use one fresh independent reviewer who did not implement I3.1. Do not begin I3.2 until I3.1 is integrated, independently reviewed, checked through the real application, and explicitly accepted by the human.

## Objective

Replace the transitional vertically appended Increment 1–2 interface, once a project is open, with the approved map-centered Architecture workbench.

The workbench projects one exact immutable accepted snapshot through:

- a compact component index used only for navigation and the minimal creation affordance;
- an interactive accepted-state map;
- a contextual working pane for accepted component documentation, structured Add/Edit, or Changes in progress and review.

The index, map, accepted documentation, and relationship resolution must all come from the existing accepted-snapshot loader. Pending components, pending title changes, and pending topology remain outside the index and map until successful accepted advancement. Accepted component Markdown is rendered safely without execution or automatic remote/local resource access.

I3.1 also establishes the already-approved whole-set **Discard changes** operation so pending work cannot be silently lost or stranded when leaving a one-project workspace. It does not add relationship authoring or accepted refresh. It displays relationships already present in a valid accepted snapshot and preserves every established Increment 1–2 authoring, review, CAS, stale-state, restart, origin-protection, and source-isolation invariant.

## Bounded implementation choices

- Use the parent-plan-approved Cytoscape.js projection for the accepted map. Integrate it concretely into the Architecture workspace; do not create a generic graph engine, graph provider, renderer interface, or reusable visualization framework.
- Use one concrete React Markdown pipeline implementing CommonMark plus tables, task lists, strikethrough, and autolinking. `react-markdown` with `remark-gfm` is the recommended bounded choice, but only if the implementation explicitly transforms or renders raw HTML and resource-producing syntax to satisfy the approved contract below.
- Do not enable active/raw-HTML rendering such as `rehype-raw`, `dangerouslySetInnerHTML`, or an equivalent HTML execution path.
- Do not rely on Markdown-library defaults for images, embeds, raw HTML, URL handling, or resource access. The application must explicitly control those nodes and prove the required behavior.
- Track ordinary source dependencies and lockfile changes only. Do not commit `node_modules`, production build output, generated test artifacts, or a new framework/tooling layer.

If the chosen concrete Markdown pipeline cannot present raw HTML as literal inert content, prevent resource-triggering syntax from loading remote/local content, retain the approved Markdown features, and avoid authored execution without changing product semantics, stop and bring the renderer choice or semantic conflict to the human. Do not silently omit raw HTML, activate it, weaken resource isolation, or redefine the Markdown contract.

## Worker brief

Read these approved documents completely before changing code:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-3.md`;
- the completed `docs/plans/architecture-i2.3.md` record;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, planning, packet, or completion documents. If implementation exposes an Architecture/product conflict or materially important missing decision, stop and report it rather than silently changing accepted authority, workspace semantics, or rendering behavior.

Implement only this I3.1 vertical slice:

### Accepted snapshot and browser projection

- Extend the existing `architecture.Snapshot`/accepted-load response concretely with only the accepted component filename/context, exact Markdown body source, and outgoing relationship data needed by the index, map, and documentation pane.
- Preserve the existing accepted-snapshot loader as the only path that parses canonical component files, validates IDs/relationships, resolves targets, and constructs browser-facing accepted data. Do not add a map loader, documentation loader, frontend frontmatter parser, checkout reader, per-request Git reader, or SQLite Architecture projection.
- Keep one immutable snapshot revision across every accepted component title, body, filename/context, and relationship returned to the browser. Do not combine accepted data with pending candidate data to build the map or index.
- The browser may turn backend-supplied accepted components and resolved relationships into Cytoscape projection elements. It must not parse YAML/frontmatter, infer relationships from Markdown, resolve component identity from titles/filenames, or independently decide which Git revision is accepted.
- Use stable component IDs for index selection, map node identity, map-to-document navigation, and relationship endpoints. Titles and filenames are presentation, never identity.
- Generate only projection-local edge keys needed to keep multiple accepted relationships representable. They acquire no domain identity or ordering semantics and are never written to canonical state.

### Durable Architecture workspace

- Keep the existing project-opening/setup sheet as the entry state only. As soon as a project opens successfully, replace it entirely with the Architecture workspace; do not leave **Open a project**, its folder form, setup copy, or the old result sheet above or behind the workbench.
- Add a compact application frame that identifies WorkBraid, the current project, and Architecture. Provide an unobtrusive **Open another project** action that deliberately returns to the entry state only when no pending change set exists. Do not add future vertical navigation.
- Do not display a permanent positive current/accepted badge. Preserve and conspicuously present existing stale/non-current state only when it is relevant.
- On a normal desktop viewport, compose one drafting-table workbench with a compact component index, the map as primary canvas, and one contextual working pane. Use hairline structure, warm paper, deliberate typography, minimal radius/shadow, and almost no motion as required by `docs/ui-v0.md`; do not turn the regions into SaaS cards.
- Structure the regions so they can later collapse into one-at-a-time surfaces at narrower widths, but do not design mobile-specific interaction in I3.1.
- Keep the component index as navigation, not management. Show accepted component titles and selection plus only the minimal **Add component** affordance. Do not add filters, status columns, row menus, per-component management actions, sorting controls, or dashboard summaries.
- Select index entries by stable component ID. Show titles normally. Only when two or more accepted components share the same displayed title, add the minimum filename or shortened-ID context needed to distinguish those colliding entries; do not show IDs or paths on non-colliding entries.
- Project every accepted component as one titled map node and every accepted outgoing relationship as one directed labelled connection. Support disconnected components, cycles, and multiple labelled relationships between the same source and target.
- Provide automatic layout, selection, pan, zoom, and fit. Keep selection, layout, and viewport entirely transient and non-canonical; do not persist them or expose manual layout authoring.
- Selecting a component from the index or map focuses the same accepted component and shows its accepted documentation in the working pane. Selection must remain identity-based when titles collide.
- For zero accepted components, present a restrained actual empty-Architecture state and the existing creation action. Do not create fake nodes, placeholder panels, disabled future controls, or a component dashboard.
- Keep **Add component** and **Edit component** in the contextual working pane. A successful **Keep change** retains the established backend pending-change behavior and returns to a useful workspace state rather than appending an editor below the map.
- Keep **Changes in progress** as a compact visible workspace affordance. Opening it reuses the contextual working area for pending entries, editing, review, and acceptance. The exact diff may temporarily use more workspace width, but it must not become another permanent column or a vertically appended old screen.
- Add one deliberate destructive **Discard changes** action inside the Changes-in-progress task. Require an explicit human confirmation before clearing the whole set; do not make row deletion, editor cancellation, navigation, or project opening imply discard.
- Implement discard through the same concrete backend-owned pending-state boundary used for mutation/review. Atomically clear the entire pending change set and any reviewed base/tree/generation binding from the application's perspective so a concurrent local request cannot expose a partially discarded set or retain a confirmable review.
- Discard must not invoke Git or modify Git refs/objects, accepted Architecture, source files, logical SQLite state, persisted Architecture state, or the loaded accepted snapshot. It clears only in-process non-canonical pending/review state. After success, new pending work may bind to the exact loaded accepted revision.
- Make project switching authoritative at the backend boundary as well as clear in the browser. While pending work is bound to the loaded project, an attempt to open a different project must leave the current workspace/snapshot/pending set intact and return a bounded product-level outcome telling the human to keep working or discard the changes. The browser must not first abandon the current workspace and discover the conflict afterward.
- Make the no-pending eligibility check and loaded-project switch atomic with respect to pending mutation and discard through the same small concrete backend state-synchronization boundary. A concurrent **Keep change** cannot create old-project pending work after project switching has observed no pending but before the switch completes. If mutation wins, switching is refused with the current project and pending set intact; if switching wins, the old-project mutation is refused rather than creating hidden/stranded work. Do not introduce a general workspace, transaction, or concurrency framework.
- After explicit discard succeeds, **Open another project** may return to the entry state and the next project may load normally. Do not retain a hidden old-project pending set or create multiple loaded/pending project contexts.
- Protect transient dirty editor values before any workbench navigation that would replace their Title/Description editor. If map selection, index selection, opening Changes in progress, or **Open another project** would replace an editor whose latest local values have not been submitted with **Keep change**, require an explicit choice between **Keep editing** and **Leave without keeping**. Choosing to leave discards only those unsent browser-local field values and then continues to the applicable backend project/pending checks; it must not clear or alter backend-held Changes in progress.
- Keep this dirty-editor guard local and concrete. Do not autosave, submit implicitly, persist browser drafts, add undo/redo, or create another draft/navigation-state model. Existing explicit editor cancellation may continue to discard its local fields as the action already states.
- Preserve existing invalid-pending, exact review binding, CAS success boundary, ambiguous-response, stale pending, and restart behavior. I3.3 later reuses this same discard operation when explicit refresh makes pending work stale; it does not introduce another discard path.
- Do not show a pending new component in the accepted index or map. Do not update an accepted index/map title from a pending Title edit. Do not project any pending relationship/topology change. Pending work remains reachable through Changes in progress.
- After the existing successful CAS path publishes its already-validated successor snapshot, rebuild the index, map, and accepted documentation from that one successor snapshot together. Do not reparse canonical files in the browser or add a second post-commit load path.
- Do not show an explicit **Refresh** action in I3.1; explicit external accepted refresh and its new behavior belong to I3.3. Preserve current open/reopen and WorkBraid-mediated accepted-transition semantics.

### Safe accepted documentation

- Display the selected component's accepted structured Title separately and render only the exact accepted Markdown body source already retained by the snapshot. The browser does not parse canonical frontmatter or the canonical H1.
- Support only the approved UTF-8 CommonMark behavior plus tables, task lists, strikethrough, and autolinking. Do not claim full GitHub rendering compatibility.
- Render raw HTML source as literal visible inert content. It must not become DOM elements, be interpreted as active HTML, or disappear silently. In particular, authored `<script>`, `<img>`, `<iframe>`, `<object>`, `<embed>`, `<svg>`, event-handler attributes, style blocks, and similar raw HTML remain text rather than active nodes.
- Render fenced code as presentation-only. Mermaid, executable blocks, includes, directives, and similar syntax receive no special behavior and execute nothing.
- Explicitly intercept Markdown image and other embed/resource-producing syntax before it can create a browser element or URL-bearing attribute that automatically fetches remote or local content. Present an inert textual representation sufficient to preserve human-readable authored meaning; do not render active `img`, `video`, `audio`, `iframe`, `object`, `embed`, `source`, or equivalent resource-loading elements from authored Markdown.
- Do not use `dangerouslySetInnerHTML`, active raw-HTML plugins, browser-side HTML parsing of authored strings, executable URI schemes, or implicit library URL/resource behavior.
- Normal documentation links may be exposed as links only when navigation occurs through deliberate user action. Merely selecting or rendering a component must not follow a link, open a file, or issue a network request. Markdown links never create Architecture relationships.
- Rendering must not rewrite the canonical Markdown body or feed transformed rendering output back into authoring/candidate state.

### Existing security, authority, and scope

- Keep the loopback-only same-origin application boundary, exact expected-origin checks on mutations, no permissive CORS, fixed backend inputs, and source-project non-interference.
- Treat discard as a state-changing same-origin operation with the same expected/missing/wrong-origin protection as existing Architecture mutations. Do not expose arbitrary store/project selectors or a public draft-management endpoint.
- Do not modify the user's source repository or use it as an Architecture rendering/resource root.
- Do not introduce a generic API, public endpoint surface, separately deployed frontend/backend, authentication, plugin system, provider layer, or other vertical.
- Follow the repository QA rule for parameterized asynchronous browser scenarios: each case is runner-owned rather than a manual render/unmount/mock-restoration loop.

Exact React component boundaries, CSS grid/flex details, transient pane-selection representation, projection element shape, automatic-layout tuning, and the inert textual presentation of resource syntax are bounded implementation details. They must remain within the approved product semantics above.

## Required focused validation

Use the real compatible Git executable, real temporary bare private repositories, real filesystem state, real temporary SQLite databases, production HTTP handlers, and the built browser UI where the checkpoint requires them. Do not add fake Git, a test-only accepted loader, browser frontmatter fixtures that bypass backend semantics, or another graph source.

Keep the matrix bounded to representative accepted, pending-isolation, renderer-safety, and regression cases. Do not build an exhaustive Markdown/security fuzzing system or synthetic workflow framework.

### Accepted snapshot and graph projection

- Load one real accepted revision containing disconnected components, duplicate titles, a cycle, and at least two differently labelled relationships between the same source and target.
- Prove the backend's one existing accepted loader supplies the exact revision, stable component IDs, filenames/context, body bytes, and resolved outgoing relationships used by the browser response.
- Prove every index item, map node, map edge, and selected documentation body belongs to that same exact revision; no pending/candidate or other-revision value is mixed in.
- Prove duplicate-title components remain independently selectable by stable ID from both index and map. Only colliding index entries receive disambiguation context; ordinary entries expose no general ID/path chrome.
- Prove cycles, disconnected components, and parallel labelled relationships remain present and inspectable. Projection edge keys do not enter Architecture state.
- Prove an empty accepted Architecture remains usable without fake graph content or speculative controls.

### Accepted versus pending presentation

- From a component-bearing accepted snapshot, keep a pending Title edit and a pending new component through the existing production handler path.
- Prove the accepted index/map retain the old accepted title and omit the pending new component, while Changes in progress exposes both pending changes for continued work.
- Prove opening accepted documentation still shows accepted Title/body rather than pending Description content unless the human deliberately enters the pending editing task.
- Prove existing review/acceptance advances index, map, and documentation only after successful CAS publishes the successor snapshot. Pre-CAS failure and stale pending behavior remain unchanged.

### Whole-set discard and project switching

- Create a multi-component pending change set and a valid reviewed-candidate binding through production handlers. Record the loaded accepted revision/snapshot, complete Git ref/object state, source-repository state, SQLite logical rows, and pending/review state.
- Invoke **Discard changes** through the expected-origin production path. Prove the entire pending set and review binding disappear atomically, the old confirmation cannot be accepted, and no partial component change remains.
- Prove discard makes no Git invocation or Git ref/object change, leaves the loaded accepted snapshot/revision exact, changes no source file, and performs no logical SQLite mutation or persisted Architecture-state mutation.
- Prove a new pending change can then bind to the same exact loaded accepted revision.
- While pending work exists, attempt to open a second real associated project through the production handler and browser flow. Prove the current project/snapshot/pending set remains intact and the UI asks the human to keep working or discard; it does not navigate away, load the other project, silently discard, or strand hidden work.
- Race a production-path old-project **Keep change** against opening another project. Prove exactly one state transition wins under the existing concrete synchronization boundary: mutation-first keeps the current project and rejects the switch, while switch-first loads the other project and rejects the old-project mutation. Neither ordering creates hidden old-project pending state or two loaded/pending contexts.
- After deliberate discard, prove **Open another project** returns to the entry state and the second project can load normally without carrying any first-project pending/review state.
- Cover expected, missing, and wrong Origin for discard. Keep this one concrete operation; do not add partial discard, undo/redo, multiple pending sets, persistence, merge/rebase/reconciliation, or general draft lifecycle machinery.

### Safe Markdown rendering

- Cover representative CommonMark prose, headings within the body, links, fenced code, tables, task lists, strikethrough, and autolinking.
- Prove raw HTML is visibly presented as literal inert text and creates no active HTML nodes. Include representative script, image, iframe/embed/object, SVG, event-attribute, and style source without turning this into an exhaustive sanitizer suite.
- Prove fenced code and Mermaid/directive-like syntax are presentation-only and cause no execution or special rendering behavior.
- Prove Markdown inline and reference-style images, remote URLs, local/file-like paths, and representative resource/embed syntax create no automatically loading browser elements and issue no network or file request merely from render, selection, or workspace navigation.
- Prove links do not navigate or request resources until deliberate user action and executable URI schemes do not become executable links.
- Verify the implementation's protection comes from explicit node/URL/resource handling under WorkBraid control rather than an unverified renderer default.
- Prove rendering leaves exact canonical Markdown and candidate authoring source unchanged.

Use a bounded request-observation fixture where helpful: point authored remote-resource syntax at a local sentinel HTTP endpoint and prove opening/selecting the documentation produces zero requests. Do not require internet access or a broad browser-security harness.

### Workspace and regression behavior

- Frontend tests prove entry/setup remains the existing opening sheet, while successful open completely removes that sheet/form and shows the application frame and workbench.
- Prove **Open another project** deliberately returns to the entry state when no pending work exists. With pending work, prove it stays in the current workspace and explains that the human must keep working or discard the whole set; after deliberate discard it may leave normally.
- In separate runner-owned frontend cases, make the Title/Description editor locally dirty and attempt map selection, index selection, opening Changes in progress, and opening another project. Prove each replacement asks the human to **Keep editing** or **Leave without keeping**; keeping retains the editor and values, while leaving drops only unsent browser fields and continues the requested navigation without mutating backend Changes in progress.
- Prove index/map selection drives one contextual documentation pane, Add/Edit reuses that pane, Changes in progress reuses the working area, and review expansion does not restore the old vertical stack.
- Prove no permanent positive current/accepted badge, future vertical navigation, disabled refresh control, dashboard, relationship editor, or placeholder management chrome appears.
- Preserve representative I1/I2 frontend and production-handler behavior for opening, setup, empty Architecture, Add/Edit, browser reload against the same backend, invalid review, successful accepted update, ambiguous post-CAS response, stale read-only pending work, and reopening after restart.
- Record source-repository `HEAD`, tracked/untracked status, file list, and content checksums before and after opening, viewing/rendering, pending authoring, successful existing acceptance, and restart; prove they remain unchanged.
- Prove SQLite gains no Architecture projection, selection, layout, documentation, or map state.

### Required checks

Before handoff, run:

- `git diff --check`;
- focused real-Git Architecture and production-handler tests;
- uncached full Go tests;
- full Go race tests where applicable to the touched backend paths;
- `go vet ./...`;
- `go mod verify`;
- the repository's ordinary frontend test command, following the `AGENTS.md` runner-owned parameterization rule;
- the production frontend build.

Do not add permanent artificial resource limits or alternate QA commands. If a test exhibits runaway resource behavior, stop it, preserve evidence, and diagnose the test structure rather than repeatedly rerunning it or weakening the suite.

## Acceptance criteria

The implementation is ready for independent review only when:

- successful project open replaces the opening sheet with the approved map-centered Architecture workbench;
- the compact index, map, accepted documentation, and resolved relationships all derive from one exact immutable accepted snapshot loaded through the existing accepted loader;
- the component index remains title-based navigation with stable-ID selection, collision-only disambiguation, the minimal creation affordance, and no management/dashboard chrome;
- every accepted component and relationship is projected, including disconnected nodes, cycles, and multiple labelled relationships between one source and target;
- selecting an index entry or map node focuses the same accepted documentation by component identity;
- Add/Edit and Changes in progress reuse the contextual working area, and complete diff review may expand without recreating the vertically appended Increment 1–2 page;
- pending new components, pending titles, and pending topology do not affect accepted index/map/documentation before successful acceptance;
- safe rendering supports only the approved Markdown behavior, presents raw HTML literally and inertly, executes no authored content, performs no automatic remote/local resource access, and never rewrites canonical source;
- Markdown image/embed/resource behavior is explicitly controlled by WorkBraid and proven rather than inherited from library defaults;
- whole-set discard atomically removes only backend-held pending/review state, invokes no Git authority change, preserves the loaded accepted snapshot/source/SQLite state, and permits new pending work from that loaded revision;
- project-switch eligibility and transition are atomic with pending mutation/discard, so switching never silently discards or strands pending work and cannot race an old-project Keep change into hidden state;
- dirty Title/Description values receive an explicit keep-editing/leave-without-keeping choice before replacing editor navigation; leaving affects only unsent browser-local values and never backend Changes in progress;
- existing accepted review/CAS/publication, invalid pending, ambiguous result, stale pending, restart reconstruction, same-origin protection, and source isolation remain intact;
- no relationship authoring, explicit refresh, draft-map behavior, persisted layout, dashboard, future-vertical UI, or other I3.2/I3.3 work is introduced;
- focused/full Go, real-Git, HTTP, race, vet, module, frontend, production-build, and diff checks pass;
- no approved Architecture, UI, planning, packet, or completion document is edited by the worker.

## Explicit exclusions

Do not implement:

- outgoing-relationship creation, editing, removal, or target-selection controls;
- explicit accepted refresh, watcher, polling, fallback, repair, or reload workflow beyond existing open/reopen and WorkBraid-mediated accepted publication;
- partial discard, merge, rebase, reconciliation, multiple pending sets, autosave, browser-local draft persistence, undo/redo, persisted drafts, or a general draft lifecycle;
- graphical component or relationship editing or draft topology/title preview in the accepted map/index;
- manual or persisted map layout, grouping, hierarchy, filtering, search, overlays, or source inference;
- component deletion, filename changes, raw-frontmatter editing, or identity replacement;
- remote/embedded resource fetching or a broader remote-media policy;
- general component-management/dashboard UI, history/revert/semantic diff, export/synchronization, proposals, Planning/Agent-Control navigation, authentication, remote access, multi-user behavior, or mobile-specific UX;
- generic graph/renderer/navigation/security frameworks or Increment 4 gate assembly.

## Fresh independent reviewer brief

After the worker produces one conventional implementation commit from the exact worker base, assign one fresh reviewer who did not implement I3.1. The reviewer must read:

- `AGENTS.md`;
- every governing baseline and plan listed in the worker brief;
- this packet;
- the complete worker-base-to-implementation diff;
- the worker's focused/full validation and real-system evidence.

The reviewer checks:

1. **Scope:** only the approved whole-set discard needed for workspace exit entered I3.1; no relationship authoring, explicit refresh, partial/general draft lifecycle, draft map, persisted layout, dashboard, future vertical, or other I3.2/I3.3 behavior entered the diff.
2. **Single accepted source:** the existing accepted loader constructs all index/map/documentation/relationship data at one exact revision; there is no frontend canonical parser, alternate Git reader, checkout dependency, or SQLite projection.
3. **Accepted-only projection:** index/map/documentation use accepted snapshot values only; pending titles/components/topology remain isolated until successful accepted publication.
4. **Identity navigation:** stable IDs bind index/map/detail selection; duplicate-title context appears only for collisions and IDs/paths are not general chrome.
5. **Workspace composition:** successful open removes the old opening sheet; map/index/contextual pane form one drafting-table tool; Add/Edit and Changes reuse the working area rather than appending screens; dirty-editor replacement requires the approved local keep/leave choice.
6. **Map fidelity:** every accepted node/relationship is representable, including disconnected components, cycles, and parallel labels; projection keys/layout/viewport remain non-canonical.
7. **Rendering contract:** approved Markdown features work; raw HTML source is literal and inert; authored code/syntax does not execute; image/embed/resource syntax cannot trigger automatic remote/local access; links require deliberate action; canonical source is not rewritten.
8. **Explicit protection:** renderer safety is enforced by WorkBraid-controlled node/URL/resource behavior, not assumptions about library defaults. No active raw-HTML or `dangerouslySetInnerHTML` path exists.
9. **Regression and authority:** existing review/CAS success boundary, stale/ambiguous behavior, restart reconstruction, origin protection, and source-repository isolation remain intact.
10. **Discard and exit integrity:** discard atomically clears the one backend pending set and review only, performs no Git/source/SQLite/accepted-snapshot mutation, and project-switch eligibility is atomic with pending mutation/discard so no concurrent old-project work can be hidden or stranded.
11. **Code shape:** changes are concrete and Architecture-owned without generic graph, renderer, navigation, draft-lifecycle, provider, repository, or security abstractions.

The reviewer independently reruns proportionate focused checks and inspects the built UI behavior. Any violation of accepted-snapshot unity, resource isolation, raw-HTML inertness, pending-map separation, or an accepted I1/I2 workflow is actionable and blocks the human checkpoint.

The reviewer edits no files. It reports findings with severity, exact file/line evidence, reproduction evidence, and any remaining human-checkpoint risks. If there are actionable findings, return the work to the same implementation worker for bounded correction, then use a fresh rereview before integration.

## Integration procedure

After a no-actionable-findings review:

1. Verify the implementation commit is a descendant of the exact packet/worker-base SHA and the implementation worktree is clean.
2. Integrate only the reviewed implementation commit(s) onto the main worktree without rewriting the approved Architecture/UI/planning/packet documents.
3. Verify the integrated diff exactly matches the reviewed worker-base-to-head implementation diff.
4. Rerun `git diff --check`, focused real-Git/backend/frontend rendering and workspace tests, uncached full Go tests, applicable race tests, Go vet, module verification, the ordinary frontend test command, and the production frontend build.
5. Confirm no dependency directory, build output, database, temporary fixture, screenshot, or other generated artifact is staged.
6. Start the real Go process with the built UI, real Git executable, isolated application-data directory, real SQLite association state, private bare Architecture store, and throwaway source repository for the human checkpoint.

Do not begin I3.2 while integration checks or the real human checkpoint remain incomplete.

## Real human checkpoint

Use the built UI served by the real loopback Go process, a real compatible Git executable, a real private bare Architecture repository, real filesystem and SQLite association state, an isolated application-data directory, and real throwaway source repositories.

1. Create two throwaway source repositories with tracked and untracked files. Record each repository's `HEAD`, status, file list, and content checksums.
2. Through WorkBraid, open the project and initialize Architecture if needed. As an authoritative human using ordinary Git against the private store, advance `refs/heads/accepted` to one deliberately prepared valid fixture revision containing:
   - an ordinary uniquely titled component;
   - two duplicate-title components with distinct identities/filenames;
   - a disconnected component;
   - a cycle and two differently labelled relationships between one source and target;
   - Markdown body examples for the approved extensions, raw HTML, fenced/Mermaid-like syntax, normal links, and remote/local image/resource syntax.
3. Stop and reopen WorkBraid as needed to load that exact accepted fixture through the production accepted loader. Record its exact revision.
4. Verify that successful project open completely replaces the opening sheet with the application frame and map-centered workbench. Confirm the current project is compactly identified. Exercise **Open another project** while no pending work exists, verify it returns deliberately to the entry state, then reopen the first project for the remaining checks.
5. Verify the component index is compact navigation: ordinary entries show titles only, duplicate-title entries show only enough filename/short-ID context to distinguish them, and there is no dashboard/management chrome.
6. Verify every accepted component and relationship appears in the map, including the disconnected node, cycle, and both parallel labels. Exercise node selection, index selection, pan, zoom, and fit. Confirm duplicate-title selection focuses the correct stable component documentation.
7. Read each representative documentation body. Confirm tables, task lists, strikethrough, autolinks, and fenced code render; raw HTML source is visibly literal and inert; Mermaid-like syntax does not execute; and no active HTML/resource element is created.
8. Run a local sentinel HTTP endpoint for the fixture's remote image/resource URLs. Confirm opening the workspace, switching selected components, and rendering documentation produces zero sentinel requests. Confirm local/file-like image/resource syntax does not read or display local content. Follow no link unless deliberately validating ordinary link navigation.
9. Through existing authoring, keep one pending Title edit to an accepted component and add one pending new component. Confirm the accepted index/map keep the old accepted title and omit the new component, while both pending changes remain reachable through **Changes in progress**.
10. Before keeping another editor change, alter its local Title or Description and exercise representative map/index/Changes navigation plus **Open another project**. Verify WorkBraid asks whether to keep editing or leave without keeping; keeping preserves the local fields/editor, while leaving drops only those unsent fields and does not alter the already backend-held pending set.
11. Open an exact review for the backend-held pending set. Record the accepted revision/snapshot, Git refs/objects, source-repository state, and SQLite logical state. Attempt **Open another project** and verify WorkBraid stays in the current workspace with the pending set/review intact and explains that the changes must be kept or discarded. Automated concurrency evidence separately proves the project-switch transition cannot race an old-project **Keep change** into hidden pending state.
12. Use the deliberate whole-set **Discard changes** action. Verify the pending set and review disappear, the recorded accepted snapshot and Git refs/objects remain exact, source files and SQLite logical state remain unchanged, and the old confirmation is unavailable. Begin one new pending change and verify it is based on the same loaded accepted revision, then discard it, return to the project-opening state, and successfully open the second project without carrying any first-project pending/review state.
13. Reopen the first project. Confirm Add/Edit and Changes in progress use the contextual working area rather than appearing beneath a persistent Open-project sheet or as vertically appended feature sections. Keep and review one valid pending change; confirm the exact review may use more workspace width without becoming permanent dashboard chrome.
14. Deliberately accept that valid pending change through the existing review/update flow. Verify the index, map, and accepted documentation advance together only after success and the exact successor revision remains inspectable.
15. Stop WorkBraid completely. Start a genuinely new process using the same application-data directory, reopen the project, and verify the identical accepted revision, component identities, documentation, and map reconstruct.
16. Verify both source repositories retain their original `HEAD`, status, files, and checksums, and no Architecture projection/layout/documentation or discarded-pending state was added to SQLite.

Record **PASS** only if the real application uses one exact accepted snapshot for index/map/documentation, pending work never leaks into accepted projections, raw HTML is literal/inert, authored resource syntax causes no automatic remote/local access, the workspace replaces rather than appends to the opening flow, dirty browser values cannot be replaced without the explicit keep/leave choice, project switching cannot race or strand pending work, whole-set discard changes only in-process pending/review state, existing acceptance/restart works, and both source repositories remain untouched.

## Execution result

Status: Complete — human checkpoint **PASS** on 2026-08-18

- Exact Increment 3 planning baseline: `cb3ac738b705a4a2e68b18604d4f4648d086e923`.
- Approved docs-inclusive I3.1 worker base and execution-packet commit: `a867366fccd9eabfaad86f69475bb7af5e65cbd3`.
- Initial I3.1 implementation: `a813c3d361a1329322188d4e6603c4ce11faa5f2`.
- Final integrated I3.1 implementation, including independently reviewed human-checkpoint corrections: `0969c42a6f127fc0e2a7b4948abe550060f4feb5`.
- Independent review: the first review found that a blocked project open after browser reload stranded the existing pending workspace behind a generic path error. After correction, a fresh review found that **Add component** could bypass the dirty-editor leave guard. Both were corrected, and a final fresh review of `a867366fccd9eabfaad86f69475bb7af5e65cbd3..cab896647c65e81902a45dd9b732abcfc399d271` reported no actionable findings. Human-checkpoint layout and action-feedback corrections were each independently reviewed in built-browser paths with no actionable findings.
- Automated validation: PASS for `git diff --check`, module verification, uncached full Go tests, full race-enabled Go tests, Go vet, focused real-Git/HTTP/workspace/concurrency tests, 44 frontend tests, and the production frontend build. Frontend runs completed normally in approximately five seconds with no resource anomaly. The production build retains a non-blocking approximately 804 kB minified single-chunk warning; no speculative code splitting entered I3.1.
- Accepted-snapshot and workspace evidence: PASS. The accepted fixture at `d251ba6fb5a94a1b178e31cb3156366e264746c9` loaded five stable components, two duplicate titles, a disconnected component, a cycle, and parallel labelled relationships through the existing accepted loader. Index, map, documentation, and relationship navigation stayed pinned to that accepted revision while pending title and new-component changes remained available only through **Changes in progress**.
- Safe-rendering evidence: PASS. Approved Markdown features rendered; raw HTML and Mermaid-like syntax remained literal/inert or presentation-only; remote and local resource syntax created no active resource content. A local sentinel recorded zero requests throughout workspace opening, selection, rendering, authoring, discard, acceptance, and restart.
- Pending/discard/switch evidence: PASS. Dirty editor navigation required the explicit keep/leave choice. A reviewed multi-component pending set remained isolated from accepted projections. Blocked project switching retained the current project, pending set, and review with visible product-language feedback. Deliberate whole-set discard removed pending/review state only, and project switching succeeded afterward. Automated race evidence proved switch eligibility is atomic with pending mutation/discard.
- Human-checkpoint corrections: long documentation now scrolls inside the contextual pane without displacing the map or covering **Technical details**; the empty workspace has no background-only global scroll; blocked-switch feedback stays visible and is locally dismissible; and the destructive discard action uses a clear, compact confirmation dialog. These corrections changed no Architecture authority or workflow semantics.
- Acceptance and restart evidence: PASS. Human acceptance advanced `refs/heads/accepted` to `8dc04f4fcd0312801fe2ebe346c898e40d4224f5`. A genuinely new WorkBraid process using the same application-data directory reconstructed that exact revision, all five component identities, documentation, relationships, and map data from canonical Git state.
- Source and SQLite isolation: PASS. Project alpha retained exact HEAD `ba08d1ac15f4d86771107bd9f12192cca89c3017`; project beta retained exact HEAD `1a774f89b98cfe4993b76f23d94b3f29d2beb6c3`. Both retained their original tracked/untracked status, file lists, and checksums. SQLite still contained only the two operational source-root-to-store-ID associations and no Architecture projection, documentation, selection, map, layout, or discarded-pending state.
- Non-gating future planning candidates observed during the checkpoint: URL-backed workspace restoration; themed scrollbars; more stable automatic layout; syntax highlighting; richer or optional isometric map presentation; pending new/edited/deleted component overlays; highlighted or rendered Markdown diffs; and project-scoped persistent pending work that permits switching projects without discard. These observations are not approved Architecture behavior or I3.1 scope.
- Scope: no relationship authoring, explicit accepted refresh, draft topology projection, persisted/manual layout, grouping, source inference, reconciliation, multiple or persisted pending sets, semantic diff, export, Planning/Agent-Control UI, or I3.2/I3.3 implementation entered I3.1.

## Stop boundary

I3.1 completes only after integration, fresh independent review, automated real-system checks, and the real human checkpoint pass and are recorded. Stop there. Do not prepare or implement I3.2 relationship authoring until the human explicitly accepts I3.1.
