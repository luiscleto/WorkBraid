# Post-Gate Architecture Phase 1 execution packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Roadmap: `docs/architecture-post-gate-roadmap.md`

Approved phase plan: `docs/plans/architecture-post-gate-phase-1.md`

Exact planning prerequisite: `baaa5c94da4602a57d97290e0ca440fd67886b5c`

Worker base: to be recorded after this packet is approved and committed on top of the exact planning prerequisite

Target: One cohesive candidate-aware Review changes workbench increment

Architecture or product changes discovered during implementation require explicit human approval rather than silent changes to this packet, its plan, or its baselines.

## Execution discipline

After human approval:

1. Mark this packet Approved and commit it alone on top of exact planning prerequisite `baaa5c94da4602a57d97290e0ca440fd67886b5c`.
2. Record that clean docs-inclusive commit as the exact worker base.
3. Dispatch exactly one implementation worker from that base.
4. Send the complete committed implementation through one fresh independent reviewer who did not implement it.
5. Integrate only after the review has no actionable findings.
6. Run the bounded ordinary checks once from the clean integrated tree.
7. Perform the real human checkpoint.
8. Record provenance and the explicit human result separately.

Do not split visual projection, map styling, diff presentation, validation polish, or clear/deselect into separate workers or tickets. Stop after Phase 1; do not begin Diagram design or implementation.

## Exact worker brief

Before editing, verify the exact clean worker base and read completely:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/architecture-post-gate-roadmap.md`;
- `docs/plans/architecture-post-gate-phase-1.md`;
- this packet;
- completed `docs/plans/architecture-i2.3.md`, `docs/plans/architecture-i3.1.md`, `docs/plans/architecture-i3.2.md`, and `docs/plans/architecture-i3.3.md` for the existing candidate/review/workspace authority paths;
- completed `docs/plans/architecture-increment-4.md` for final Gate provenance and non-gating boundaries.

Treat those documents as authoritative. Do not edit approved Architecture, UI, roadmap, historical plan, or packet documents. If a required behavior conflicts with those documents or requires a new product/domain decision, stop and report it.

Implement only the approved candidate-aware Review changes increment through the existing production paths.

### Backend review projection

- Keep `pendingChangeSet.review` / `reviewBinding` as the one in-process review binding. Do not add a parallel review state machine, persisted review, or second confirmation token.
- Keep successful review construction exactly where it is: construct the complete candidate once through `Manager.ConstructCandidate`, validate it through the existing loader, create the exact tree diff, and bind the result to exact base revision, candidate tree, and pending generation.
- Use `pending.baseSnapshot` as the **Before changes** snapshot and the existing bound `review.candidate.Snapshot()` as the **With changes** snapshot. Do not resolve `accepted`, reread Git, or reconstruct either snapshot for response presentation.
- Extract/reuse one concrete snapshot-to-response projection for both review sides and ordinary accepted responses. Do not add a map-specific loader, browser Markdown/frontmatter parser, or generic projection framework.
- Extend only the current review response with the two bound snapshot projections and their review-presentation delta. Do not duplicate Architecture state outside the existing pending/review lifetime.
- Return that visual review only when the existing review base/tree/generation still matches the pending generation and candidate tree. Existing mutation, discard, refresh, project switch, stale, and acceptance invalidation remain authoritative.
- Under the existing concrete application state lock, atomically verify that the `(base commit, candidate tree, pending generation)` review binding is still current and capture every immutable value needed to produce that visual review response: both snapshots/projections, diff, binding, and comparison data. Response construction must not observe one part before an invalidating operation and another part afterward.
- Expensive JSON/HTTP serialization may and preferably should occur after releasing the lock once that coherent immutable presentation has been captured. Do not introduce a review transaction framework, event system, second review object, or new state-machine abstraction.
- Keep the accept request and backend checks unchanged in meaning: confirmation submits the displayed exact base/tree/generation, and only that existing binding can proceed.

### Concrete visual delta

Add one small concrete comparison over the two immutable snapshots; do not introduce a reusable semantic-diff engine.

- Match components by stable component ID.
- Classify a candidate component as `added` when its ID is absent from the base.
- Classify an existing component as `content changed` only when its structured Title differs or its exact Markdown body/Description bytes differ.
- A relationship-only edit does not classify its source component as content changed.
- Do not classify formatting-only H1 spelling, filename, frontmatter serialization, mode, metadata, or other canonical-byte differences as node content changes. The complete exact unified diff remains the evidence for every canonical byte change.
- If component content and relationships both change, retain both the component and edge treatments.
- Compare relationship facts as a multiset of exact `(source ID, target ID, label)` values with multiplicity.
- Pair equal facts up to the minimum count. Mark candidate surplus occurrences added and base surplus occurrences removed.
- Treat target or label edits as removed plus added facts.
- Preserve exact labels, including valid whitespace and Unicode. Do not normalize comparison values.
- Do not add relationship IDs. Any occurrence keys are deterministic projection-only values and never enter canonical state, pending authoring, confirmation, or Architecture semantics.
- Do not add component deletion or removed-component presentation.

The comparison result should contain only what the browser needs to present status and associate a selected change with its source component/path. Keep names and data structures concrete to this review feature.

### Review workspace

- Recompose the current `ChangesTask` reviewed state into one review workspace using the existing application frame and workbench, not a new page or vertically appended dashboard.
- Make **With changes** primary and add the approved compact **With changes** / **Before changes** toggle.
- Use one selected-review-side state. From it, derive the active index, map, component title, selected Markdown documentation/detail, and relationship topology together.
- Continue to select components by stable ID. When a candidate-only selection is absent under **Before changes**, show no candidate document as base content. Clear the component selection/detail or present a restrained “only present with changes” review-context note.
- Keep review comparison annotations separate from active topology. A removed relationship may be drawn over the candidate view as a clearly removed review annotation, but it must not be returned or treated as an active candidate relationship.
- Preserve the existing exact review details and Update architecture action. Do not hide the canonical diff behind a separate workflow.
- Add clear/deselect for selected accepted documentation and review focus. Route any action that would replace dirty local editor values through the existing Keep editing / Leave without keeping guard.
- Preserve stale-review product behavior. If authority moves, do not fetch or substitute a new **Before changes** side; use the current stale result and disable acceptance as already approved.

### Map projection and failure boundary

- Extend the existing `ArchitectureMap` projection rather than adding another graph implementation.
- Accept the active bound snapshot plus supplied review statuses/annotations and expose selected component/relationship review context without making the browser an Architecture parser.
- Visually subdue unchanged topology; distinguish added nodes/edges, content-changed nodes, and removed relationship annotations using shape/line/text as well as color.
- Keep cycles, disconnected components, duplicate titles, exact labels, and parallel relationship multiplicity visible and independently focusable where the facts are distinguishable.
- Add a bounded map-initialization/render failure boundary. A Cytoscape/canvas failure displays one concise product-language message inside the visual region and leaves the exact diff, review details, and Update architecture action functional.
- Do not add a production fault-injection switch. Frontend tests may use their existing module boundary; integrated validation may make canvas unavailable in a separately controlled browser context.

### Deterministic transient layout

- Replace random/reload-sensitive review positioning with a deterministic stable-ID-aware layout input.
- Calculate one transient position basis for the bound base/candidate pair so unchanged IDs use the same coordinates across the toggle as far as practical. Using the union of review component IDs solely to calculate positions is allowed; it is not combined Architecture topology.
- Prefer the existing Cytoscape dependency and a small concrete deterministic position/layout function. Add another layout dependency only if the existing library cannot meet the approved behavior and report that need before broadening the implementation.
- Browser-session reuse of already rendered base positions is optional. Correct review behavior must not depend on those positions being retained.
- Do not write coordinates to Git, backend state, SQLite, local storage, or any other persistence. Do not create Diagram or layout-domain types.
- Keep pan, zoom, fit, and selection transient.

### Exact diff presentation and focus

- Retain the complete exact presented unified diff string already generated by the controlled Git path.
- Add one concrete raw-diff presentation component that splits the string into display lines without changing its text.
- Apply basic added, removed, header, and context styling. Preserve newline markers and escaped non-printing notation.
- Add stable DOM anchors for canonical file sections/hunks. A component selection focuses its canonical file; a relationship selection focuses its source component's frontmatter file/hunk.
- Do not synthesize a different diff, parse Markdown semantically, render Markdown before/after, or add code syntax highlighting.
- Keep diff focus keyboard accessible and make change meaning understandable without color alone.

### Validation and contextual polish

- Use the existing `validation_item`, relationship position, relationship field, and review blocker supplied by the backend.
- Mark the owning Changes-in-progress row visibly only after review makes the invalid value actionable.
- Make **Fix relationship** an obvious link/button using established product styling.
- Opening it focuses the exact target or label control and applies visible plus accessible invalid guidance. Do not create browser validation authority or aggregate multiple errors.
- Preserve quiet `Untitled component` and incomplete relationship work before review.
- Add clear/deselect to the contextual pane and review selection without URL state, history, autosave, or draft persistence.
- Make only bounded desktop/narrow-pane adjustments required by this combined review task. Preserve current safe Markdown rendering, dirty-editor navigation, discard, project switching, Refresh, and application-frame behavior.

### Scope and repository integrity

- Preserve the loopback same-origin boundary and expected-origin checks. No new mutation endpoint should be required for review presentation.
- Do not modify the user's source repository.
- Do not add SQLite Architecture projection or operational writes for visual review.
- Do not edit or rewrite approved docs, historical plans, Gate evidence, or the existing Gate smoke merely to describe this implementation.
- Do not commit build output, dependencies directories, databases, screenshots, or temporary browser/runtime artifacts.
- Follow the repository's runner-owned asynchronous test rule. Never implement parameterized browser cases as a manual render/unmount/mock-reset loop.

## Worker acceptance criteria

The implementation is ready for independent review only when:

- successful review still creates one existing base/tree/generation binding and confirmation still checks that exact binding;
- current-binding verification and visual-response capture occur atomically under the existing synchronization boundary, producing one coherent immutable generation across concurrent invalidation;
- review response projections are derived from `pending.baseSnapshot` and the existing candidate snapshot with no ref reload or second parser;
- invalid pending state exposes no visual review;
- **With changes** and **Before changes** atomically switch index, map, selected documentation/detail, titles, and relationship topology;
- the bound base is never replaced by live accepted Architecture;
- component and relationship classification implements the exact approved rules, including relationship-only versus documentation-only evidence;
- no relationship IDs or removed-component behavior exists;
- selecting visual changes focuses review context and the relevant unchanged exact-diff region;
- basic diff coloring preserves complete raw diff text;
- deterministic positions prevent gratuitous base/candidate reshuffling and remain wholly unpersisted;
- a map render failure leaves exact diff review and deliberate confirmation available;
- validation rows, Fix affordance, exact field focus, clear/deselect, and dirty-editor protection work coherently;
- normal accepted workspace projections remain unchanged before CAS;
- successful CAS, stale review, Refresh, discard, project switching, safe Markdown, restart reconstruction, source isolation, and SQLite behavior do not regress;
- all approved exclusions hold and the worktree is clean after one conventional implementation commit.

## Required automated evidence

### Architecture/backend with real Git

Use real temporary bare stores and the production handler path to prove:

- one exact accepted base and existing complete candidate supply both review projections and the unchanged confirmation binding;
- added component and added/removed/changed relationship facts compare with exact-label multiplicity;
- a relationship-only edit changes edge facts without content-changing the source node;
- a Description-only edit content-changes the node;
- a Title-only edit content-changes the node;
- a combined content/relationship edit receives both treatments;
- duplicate identical relationships pair only by multiplicity;
- invalid candidate review retains pending/validation location and supplies no visual review;
- pending mutation invalidates both visual review and old confirmation;
- a bounded race between visual-review response capture and either pending mutation or whole-set discard yields only one coherent outcome: the captured response belongs wholly to one current binding/generation or no review is returned; the invalidated binding cannot become confirmable;
- external authority advancement uses existing stale behavior without replacing the bound base;
- review projection makes no ref/object, source-repository, or logical SQLite mutation.

Keep this as one bounded comparison matrix, not a general semantic-diff test framework.

### Frontend

Use separate runner-owned cases to prove:

- candidate-primary entry and atomic full-workspace toggle;
- identity-consistent index/map/detail selection, including duplicate titles;
- candidate-only selection cannot leak detail into Before changes;
- unchanged, added, content-changed, and removed-relationship treatments and accessible labels;
- relationship-only versus documentation-only versus combined visual classification;
- exact multiset occurrences and projection-only edge keys;
- visual selection focuses the expected raw-diff file/hunk;
- raw diff text remains complete under basic line coloring;
- deterministic layout inputs/positions stay stable across repeated projection and toggle;
- Cytoscape initialization failure leaves diff, review details, and Update architecture usable;
- owning-row validation mark, obvious Fix action, exact field focus/error styling, clear/deselect, and dirty-editor guard;
- mutation/stale responses remove or disable the old visual confirmation exactly with existing rules;
- normal accepted map/index remain unaffected by pending review state.

Run only the ordinary documented frontend test command. No raw `vitest`, `npx vitest`, alternate manual loops, repeated shell invocations, or unattended test retries.

### Integrated production-browser evidence

Reuse the existing real Go/browser/Git/SQLite/temporary-source setup and Playwright dependency. Add one bounded Phase 1 production scenario or equivalent focused scenario; do not turn the historical Gate smoke into a generic harness or replay Gate initialization matrices.

The scenario should:

- use a real component-bearing accepted revision and create the multi-change candidate through the built UI;
- verify accepted workspace isolation before review;
- enter Review changes, toggle both snapshots, inspect visual statuses, navigate identity-consistent context and raw diff, and accept through the existing path;
- stop and start a genuinely fresh Go process and reconstruct the exact accepted result;
- leave source Git/files exact and SQLite operational-only;
- clean every child process/runtime on pass and failure.

A separate controlled browser context may make canvas unavailable before page code runs to prove visual failure degradation without production fault injection.

### Ordinary checks

Run once from the clean worker tree:

- `git diff --check`;
- `go test ./... -count=1`;
- `go test -race ./... -count=1`;
- `go vet ./...`;
- `go mod verify`;
- `npm test` from `frontend/`;
- `npm run build` from `frontend/`;
- the one bounded production-browser Phase 1 scenario.

If a test or child process grows abnormally or fails to terminate, stop it immediately and report the test defect. Do not raise machine limits, add permanent throttling, start raw Vitest, or run manual browser lifecycle loops.

## Fresh independent reviewer brief

The reviewer receives the exact docs-inclusive worker base, committed worker head, complete diff, this packet, and worker evidence. Review in a fresh isolated worktree:

1. **Authority:** one candidate construction, one pair of bound snapshots, one base/tree/generation review binding, and one existing confirmation/CAS path.
2. **Atomic capture:** current-binding verification and immutable visual-response capture share the existing concrete state lock; concurrent mutation, discard, refresh, switch, or acceptance invalidation cannot produce a mixed-generation response, and existing confirmation checks remain the final authority guard.
3. **Snapshot unity:** each toggle side supplies its own index, active topology, titles, selected detail, and relationships without cross-snapshot leakage or live-accepted substitution.
4. **Visual classification:** component content means only structured Title or exact body; relationship-only changes remain edge-only; combined changes show both; relationship multiset comparison is exact and multiplicity-aware.
5. **No invented identity:** no relationship IDs, removed-component model, generic semantic diff, Diagram object, or persistent coordinate state.
6. **Diff integrity:** complete exact text remains inspectable; styling/focus does not alter evidence.
7. **Layout:** deterministic transient positions are stable-ID-aware and unpersisted; no hidden backend/local-storage/SQLite authority.
8. **Failure degradation:** map failure is clear and does not block exact-diff review or acceptance.
9. **Workspace:** validation localization, visible Fix, exact field focus, clear/deselect, dirty-editor protection, accepted-only normal map, and drafting-table composition remain coherent.
10. **Regression:** stale review, mutation invalidation, CAS success boundary, Refresh, discard/project switching, safe Markdown, restart, source isolation, and SQLite operational boundary hold.
11. **Scope and QA:** no post-Phase-1 features, broad framework, manual async loops, committed artifacts, approved-doc edits, or test-resource anomaly.

Run each ordinary check once through its documented command and the bounded production-browser scenario once. Report actionable findings and residual human-only risks. Any material finding returns to the same bounded worker, then receives a fresh rereview.

## Integration procedure

After a clear independent review:

1. verify the main worktree is clean at the exact packet-inclusive worker base;
2. integrate the exact reviewed implementation commit without rewriting it;
3. verify the integrated head matches the reviewed tree;
4. rerun `git diff --check` and the ordinary checks once;
5. start one fresh real human-checkpoint runtime;
6. stop before any Diagram work.

If integration differs from the reviewed tree or a check regresses, stop and return the exact difference through bounded correction and fresh review.

## Real human checkpoint

Use the built browser UI served by the real Go process, real compatible Git executable, a real private bare Architecture repository, real filesystem, real SQLite association, and an unchanged throwaway source repository.

Begin with an accepted Architecture containing several connected components and enough parallel/cyclic topology to judge the map. Record its exact accepted revision. Through structured authoring, create one pending multi-change candidate containing:

- a new component and a relationship to it;
- one removed relationship;
- one target or label change, producing removed plus added relationship facts;
- parallel relationship multiplicity;
- one relationship-only edit on a component whose Title/body remain unchanged;
- one documentation-only edit;
- optionally one component with both content and relationship changes to verify combined treatment.

Checkpoint:

1. Before review, verify the normal accepted index, map, documentation, and relationships remain exact.
2. Make one relationship invalid, Keep change, and attempt Review changes. Verify the owning Changes-in-progress row is marked, Fix is visibly actionable, the exact field receives focus/error guidance, and no visual review appears. Correct it normally.
3. Enter Review changes and record the exact base revision, candidate tree, and generation.
4. Verify **With changes** is primary. Confirm the new component/edges, removed relationship annotation, changed target/label, exact parallel multiplicity, relationship-only source node without a false content mark, documentation-only content mark, and any combined treatment.
5. Toggle to **Before changes**. Verify index, map, selected documentation/detail, titles, and relationships all switch to the bound base together. Candidate-only documentation must not leak into this view.
6. Toggle repeatedly and verify unchanged components remain stable rather than being gratuitously rearranged.
7. Select representative changed nodes and edges from the map/index. Verify identity-consistent context and focus of the corresponding canonical diff file/hunk.
8. Inspect the complete unified diff and verify readable added/removed coloring has not replaced, truncated, semantically rewritten, or rendered the raw diff.
9. Use clear/deselect and verify a neutral contextual pane; separately verify dirty editor navigation still requires Keep editing or Leave without keeping.
10. In a separately controlled browser context with canvas made unavailable before application code runs, reopen the same backend-held review. Verify the map fails clearly while the complete diff, exact review details, and Update architecture action remain usable. Do not add or use a production fault switch.
11. Return to the normal browser context and deliberately Update architecture. Verify the existing exact binding/CAS path succeeds and the normal accepted index, map, documentation, relationships, and revision advance together.
12. Completely stop WorkBraid, start a genuinely new process with the same application-data directory, reopen, and verify exact reconstruction.
13. Create and review one second small change, then externally advance `refs/heads/accepted` before confirmation. Verify existing stale behavior prevents acceptance and never substitutes the newer revision into the review's bound Before changes side.
14. Verify the source repository remains exact and SQLite contains no Architecture, review, graph, diff, or layout projection.

Keep the checkpoint proportional and focused on review composition. Do not replay store initialization, every corruption classification, or the complete Gate 1 matrix.

## Explicit stop and exclusions

Stop after the human explicitly accepts or rejects this Phase 1 increment. Do not prepare or begin the Diagram design decision from this packet.

Do not introduce:

- a pending/draft overlay on the normal accepted workspace map;
- Diagram objects, Diagram files, format v2, or migration;
- canonical, backend, SQLite, local-storage, or other persisted coordinates;
- manual layout or graphical editing;
- a generic graph, semantic-diff, validation, navigation, review, or workflow framework;
- another parser, candidate builder, reviewed candidate, confirmation path, or acceptance authority;
- persisted/project-scoped pending work;
- URL-backed workspace restoration;
- syntax highlighting or rendered/semantic Markdown diff;
- dedicated themed-scrollbar work;
- component deletion or removed-component ghosts;
- relationship IDs, taxonomy, lifecycle, or ordering semantics;
- proposal/history/revert/reconciliation behavior;
- post-Phase-1 Diagram membership, hierarchy, boundary, schema, migration, kind, layout, routing, or renderer decisions;
- Planning, Agent Control, another vertical, authentication, remote access, multi-user behavior, or mobile-specific UX.

## Execution result

Status: Complete — human checkpoint **PASS** on 2026-08-20

- Exact Phase 1 documentation baseline: `8ac46febd67c57e286e914c9a4e3ea08fcf22ded`.
- Approved Phase 1 plan: `baaa5c94da4602a57d97290e0ca440fd67886b5c`.
- Approved docs-inclusive worker base and execution-packet commit: `15fd00ed0595280ebf4d87b8ba8094d1500bd390`.
- Initial implementation: `73152908bd510c40cc927ec92b07962bc5d46321`.
- Final integrated implementation after independently reviewed correctness and human-checkpoint presentation corrections: `cd5871fe82c962e7e6439c9939055d30c4eb5ebd`.
- Independent review: the first review found a dirty-editor response race, incomplete focus mapping for Git-quoted filenames, and incorrect diff-line classification. Corrections at `43b44906370209a64bafd4b3f451a138a399deb7` and `383401f282b959d673bcce9a7093c661e9505307` received a fresh final review with no actionable findings. Human-checkpoint feedback then produced bounded frontend-only corrections `ac804f43689464f0dfb274a82369cd2bf4e6e454` for review-pane containment and semantic selection emphasis, and `cd5871fe82c962e7e6439c9939055d30c4eb5ebd` to restore the normal accepted-map selection treatment without changing review colors. Each correction received a fresh independent PASS.
- Automated validation: PASS for `git diff --check`, uncached full Go tests, full race-enabled Go tests, Go vet, module verification, 70 ordinary frontend tests, the production frontend build, and the single bounded Phase 1 production-browser scenario. The scenario passed in approximately five seconds and proved real Go/browser/Git/SQLite/source behavior plus fresh-process reconstruction. Frontend-only checkpoint corrections reran the ordinary frontend suite and production build without abnormal resource use. The established approximately 826 kB production-chunk warning remains non-blocking.

### Human checkpoint evidence

- Runtime root: `/tmp/workbraid-gate1-human.pDIBeR`; source repository: `/tmp/workbraid-gate1-human.pDIBeR/source-project`; application-data directory: `/tmp/workbraid-gate1-human.pDIBeR/app-data`.
- Starting accepted revision: `059adbc3fa484193fe07d223f42601c35c64546c`.
- The human authored one complete candidate through structured controls containing new component `Queue`, a pending-new relationship target, removal of the original `Gateway --calls--> Worker` fact, two parallel `Gateway --calls--> Queue` facts, `Worker --observes--> Queue`, a relationship-only Gateway/Worker change, and a documentation-only Records change. Pending work did not alter the normal accepted index, map, documentation, or topology.
- Validation composition: a whitespace-only relationship label blocked review, marked the owning Worker change, exposed the actionable relationship fix, focused the exact field, retained the complete pending set, and left accepted Architecture unchanged. Normal correction restored a valid candidate.
- Exact accepted review binding: base `059adbc3fa484193fe07d223f42601c35c64546c`, candidate tree `75bd63cb8a892d439c310dadf2a1fe003a5f7044`, and pending generation `5`.
- Candidate-aware review: PASS. **With changes** and **Before changes** switched index, map, selected documentation, titles, and relationships as snapshot-unified projections of the bound candidate and base. Candidate-only Queue never leaked into the base side. Stable-ID layout remained stable across repeated toggles. Relationship-only nodes were not falsely content-marked; Records was content-marked for its exact Description change; added and removed relationship facts and parallel multiplicity remained distinct. On the base side, the content-change and removed-relationship annotations intentionally showed the delta over exact base topology.
- Review interaction: PASS. Map/index selection remained identity-consistent, changed nodes and relationship facts focused the corresponding exact raw-diff region, clear/deselect returned the contextual pane to its neutral state, and dirty-editor navigation preserved unsent values through **Keep editing**. The complete unified diff retained exact text while presenting basic added/removed coloring.
- Controlled map failure: PASS in a separate browser context with canvas disabled before application code loaded. WorkBraid reported that the map could not be shown while the complete diff, review details, and enabled **Update architecture** action remained available. No production fault switch was added.
- Human presentation corrections: PASS. The raw diff is larger, vertically resizable, and contained; Review details no longer sits under Technical details; visual-change controls clear **Fit map**; selected review facts retain their semantic added/removed/content colors; the normal accepted map retains its established mustard/darker selection treatment.
- Deliberate acceptance advanced `refs/heads/accepted` to `f011cb93c79b51e603101164ec24419b5a009894`, whose exact tree is the reviewed candidate tree `75bd63cb8a892d439c310dadf2a1fe003a5f7044`. Index, map, documentation, relationships, and revision advanced together.
- Restart reconstruction: PASS. The first Go process stopped completely. A genuinely new process using the same application-data directory reopened exact revision `f011cb93c79b51e603101164ec24419b5a009894` with Queue, documentation, identities, relationships, and topology reconstructed from canonical Git.
- Stale-review regression: a second documentation candidate was reviewed against base `f011cb93c79b51e603101164ec24419b5a009894`, candidate tree `b5446e156ba6dcf4a0515e71f80350bd7fd5af2c`, generation `1`. Real Git atomically advanced `accepted` to valid external successor `af362762c941f0c092459cf78111d9acad1f7edc`, with sole parent `f011cb93c79b51e603101164ec24419b5a009894` and retained valid tree `75bd63cb8a892d439c310dadf2a1fe003a5f7044`. Confirmation failed stale; the pending change remained visible/read-only against its original base; WorkBraid did not overwrite external authority or relabel it as the review's bound Before snapshot.
- Source isolation: PASS. Final source HEAD remains `2c65ee6972b175d2658ff31889f4a2a8da705424`; status remains exactly `?? local-note.txt`; tracked index entries remain ordinary `100644`; SHA-256 values remain `edc7de93d3265bd3a624d306328dd1c991486e3794410c0f3e166271a82226a6` for `README.md`, `26456cc7c16307e596c3d76e4803834d7bf89a00afbbf485ea33e27431eff2de` for `settings.txt`, and `6eadd84d703216d704df2496921ea58d97014bb29a5007666bb8c9f47a9ed9bb` for untracked `local-note.txt`.
- SQLite isolation: PASS. The database contains only `source_architecture_associations(normalized_source_root, store_id)` and its one expected source-root/store-ID row. It contains no Architecture, component, relationship, review, graph, diff, layout, pending, or history projection.
- Human checkpoint result: **PASS**.
- Scope: no pending/draft overlay on the normal accepted workspace map, Diagram model, format evolution, persisted layout, graphical editing, persisted pending work, URL restoration, syntax highlighting, rendered/semantic Markdown diff, themed-scrollbar project, component deletion, relationship identity, other vertical, or post-Phase-1 Diagram decision entered this increment.

Phase 1 is complete. Stop here; Diagram design and implementation remain unstarted.
