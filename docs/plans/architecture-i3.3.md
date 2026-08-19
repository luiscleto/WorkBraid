# Architecture I3.3 execution packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`  
UI baseline: `docs/ui-v0.md`  
Parent plan: `docs/plans/architecture-increment-3.md`  
Prerequisite: completed I3.2 record at `3f67b161b1f14a0a2ae5c62a0b0e5a54d346e5c4`  
Exact planning baseline for this proposal: `3f67b161b1f14a0a2ae5c62a0b0e5a54d346e5c4`  
Exact docs-inclusive worker base: to be pinned to the approved packet commit before dispatch

Architecture or product changes discovered during implementation require explicit human approval rather than silent changes to this packet or the approved baselines.

## Objective

Implement **I3.3 — Explicit accepted refresh and non-current state**.

A human can explicitly ask WorkBraid to re-observe the private Architecture store's authoritative accepted revision. WorkBraid either quietly confirms the already loaded revision, atomically adopts one completely validated replacement snapshot, or truthfully retains the previous valid projection as read-only reference when current accepted state is known to be unavailable or invalid. A refresh attempt that cannot determine current authority is reported as a failed check rather than fabricated evidence that the loaded revision is stale.

This item completes Increment 3. It does not assemble the complete Gate 1 workflow or begin Increment 4.

## Execution model

Use one implementation worker from the exact approved docs-inclusive worker base. The worker must begin by verifying the exact clean base and reading completely:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-3.md`;
- `docs/plans/architecture-i3.1.md`;
- `docs/plans/architecture-i3.2.md`;
- this packet.

The worker may choose bounded details such as concrete endpoint spelling, internal helper names, response fields, and exact fixed Git command sequences. Those choices must not create a second accepted loader, another workspace-state authority, browser-owned Architecture semantics, or a general transaction/state-machine framework.

The worker must not edit approved Architecture, UI, planning, packet, or completion documents. If implementation reveals a conflict with an approved authority, pending-state, or product-language invariant, stop and return it for human decision.

## Exact worker brief

### One protected Refresh operation

- Add one compact **Refresh** action to the open Architecture workspace. It is not shown on project-opening/setup states.
- Treat Refresh as an application-state mutation. Use a same-origin-protected mutation request; do not implement it as a browser-only page reload, observational GET, arbitrary Git request, or permissive-CORS path.
- Require the requested project/source root to match the currently loaded project. The browser never supplies a ref, commit, store path, Git argument, or candidate snapshot.
- Execute Refresh under the same existing concrete backend synchronization boundary that owns the loaded project, loaded snapshot, pending change set, discard, project switching, review/confirmation, component/relationship mutation, and WorkBraid-mediated accepted publication.
- Refresh, **Keep change**, **Discard changes**, project switching, review/confirmation, and successful WorkBraid acceptance must not interleave into a mixed loaded/pending state. Keep this as the existing handler/application lock and concrete state, not a transaction service, workspace coordinator, event system, or generic concurrency framework.
- Preserve the existing CAS success path: when WorkBraid itself advances `refs/heads/accepted`, it directly publishes the already-validated successor snapshot and consumes the pending set at the approved CAS boundary. Do not route that success through Refresh or use Refresh as a second post-commit authority mechanism.

### Dirty browser-local editor protection

- Refresh participates in the established dirty-editor navigation guard.
- If Title, Description, or relationship controls contain unsent browser-local values, selecting **Refresh** must offer the existing explicit choice to **Keep editing** or **Leave without keeping** before replacing their accepted context.
- **Keep editing** cancels Refresh and preserves the editor exactly. **Leave without keeping** drops only those unsent browser-local values and then performs Refresh.
- Leaving does not discard, rewrite, or otherwise mutate backend-held **Changes in progress**. Do not add autosave, browser persistence, undo, or another draft model.

### Accepted-only observation and race-safe publication

Use the existing Architecture accepted-loader interpretation path and real Git executable. The refresh transition is:

1. Resolve only `refs/heads/accepted` to an exact revision `R` for the currently associated private store.
2. If the workspace is already known current at `R`, retain the existing immutable snapshot and stay quiet. Do not manufacture positive status chrome or invalidate a current pending/review binding.
3. Otherwise, read `R`'s exact committed tree and construct and structurally validate the complete immutable replacement snapshot through the same accepted parser/validator used by open/restart. Loading an exact observed revision may require a narrow concrete extension of that loader; it must not become a parallel parser or accept checkout/SQLite/browser state.
4. Verify the store ID against the operational association as existing open/restart does.
5. Re-observe `refs/heads/accepted` immediately before publication.
6. Publish the validated snapshot as current only if that observation still names `R`.

The second observation is mandatory even though backend application state is locked, because an authoritative human may change the Git ref outside WorkBraid.

If the ref changes after the first observation:

- do not publish `R` as current;
- do not automatically retry or load the later revision;
- if the final observation names the already-retained loaded revision, retain that snapshot as current and stay quiet rather than marking it stale or requiring another Refresh merely because the ref changed during the attempt;
- if the final observation names another revision and thereby proves the retained projection is no longer authoritative, retain that projection as known non-current, make any pending set based on it stale/read-only, invalidate review, and tell the human to **Refresh** once more;
- if the final observation reports that `accepted` is missing, use the same known-non-current behavior;
- if the final observation cannot determine authority, use the indeterminate Refresh-failure behavior without newly marking a previously-current projection or pending set stale;
- preserve any non-current/stale classification that was already known.

Use one narrow, concrete synchronization seam around the load/re-observe boundary only where needed to make this race deterministic in tests/checkpoint setup. It must not be a browser/API capability, production fault-injection feature, generic hook system, or alternate Git authority. All observations and loads still use the production handler and real Git executable.

Do not impose ancestry policy. A different valid supported `accepted` revision is authoritative whether it is a fast-forward, rewind, sibling/non-linear revision, or commit created outside WorkBraid. Do not inspect ancestry as an adoption gate or introduce branch-history rules.

Refresh is read-only with respect to canonical Git. It creates no commits, trees, blobs, refs, fallback pointers, or checkout state.

### Valid external accepted state

When the two observations agree on a different valid supported revision:

- atomically replace the loaded accepted revision and immutable snapshot;
- publish map nodes/edges, component index, accepted documentation, titles, and relationship resolution together from that one snapshot;
- never expose a mixture of the old and replacement projections;
- keep selection, viewport, automatic layout, and contextual pane selection disposable. Resetting or retaining them is an implementation detail and must not complicate authority or preserve an invalid identity selection.

External canonical reality does not require confirmation merely because older pending work exists. Refresh adopts the valid replacement snapshot and separately preserves that pending work as described below.

### Pending work bound to an older accepted revision

If backend-held pending work is based on the previously loaded revision and Refresh adopts a different valid accepted revision:

- retain the pending change set, its exact store ID, exact base revision, retained base snapshot/context, authored changes, candidate/validation information needed for faithful read-only inspection, and generation;
- invalidate and remove any reviewed-candidate binding or confirmation action;
- mark the pending set stale and read-only;
- do not reconstruct its candidate from the new accepted snapshot;
- do not resolve its component titles or relationship targets through the new snapshot;
- do not merge, rebase, reconcile, normalize, or otherwise reinterpret it;
- keep it reachable through **Changes in progress** while the map, index, and accepted documentation show only the new accepted snapshot.

The same stale/read-only transition is mandatory whenever Refresh conclusively establishes that the pending base's loaded accepted revision is no longer authoritative, even when no replacement snapshot can be published. This includes:

- `accepted` naming an invalid or unsupported revision;
- missing `refs/heads/accepted`;
- the final observation in the external-ref race naming another revision rather than the retained loaded revision.

In each case preserve the pending set exactly in its retained old-base context, invalidate its review, and permit only inspection plus whole-set discard. An indeterminate Refresh failure does not newly stale a pending set whose loaded base was previously considered current, because authority has not been determined. A pending set already known stale remains stale through an indeterminate failure.

The backend response must supply stale pending inspection from the retained old-base/pending candidate context. The browser must not rebuild stale Architecture meaning from new accepted data or parse canonical Markdown/frontmatter. Pending components or targets removed/renamed by the new accepted revision must remain understandable as they were in the pending set's original context.

Stale pending work cannot be edited, reviewed, or accepted. Reuse I3.1's whole-set **Discard changes** action:

- discard removes only the entire non-canonical pending set and review state;
- it changes no Git refs/objects, accepted snapshot, source files, or persisted Architecture state;
- once stale, a pending set remains stale until discarded; do not reactivate or reinterpret it automatically;
- after discard, new authoring is available only when a valid current accepted snapshot has actually been loaded.

Do not add partial discard, multiple pending sets, project-scoped draft persistence, undo/redo, merge/rebase/reconciliation, or a general pending lifecycle.

### Known non-current versus indeterminate Refresh failure

Keep the epistemic distinction small and explicit in backend state and product responses; do not turn it into a general state machine.

**Known non-current reference:** WorkBraid successfully observes that `accepted` no longer names the loaded revision, is missing, or names a revision that is structurally invalid or unsupported. Retain the previous valid snapshot only as conspicuously non-current, read-only reference:

- map/index/documentation may remain visible for reference but must not be presented as accepted/current;
- Add/Edit, **Review changes**, and **Update architecture** are unavailable;
- stale pending work remains read-only and discardable;
- any pending set based on the now-non-current loaded revision is atomically marked stale/read-only and loses its reviewed-candidate binding even though no replacement snapshot was published;
- no fallback claim, initialization, repair, reset, replacement-store action, merge, or rebase is offered.

**Refresh could not determine current state:** an operational failure prevents WorkBraid from determining what `accepted` currently names. Report that Refresh failed and invite a retry, but do not newly claim the loaded revision is definitely stale. If the workspace was already known non-current, preserve that known classification; an indeterminate retry must not make it look current again.

Representative classifications must come from explicit ref/object observations and typed domain outcomes, never localized Git stderr text. Normal UI uses product language such as architecture, changes, and Refresh—not ref, manifest, snapshot, canonical, UUID, parser, object, or Git terminology. Technical revision identities may remain in deliberate **Technical details**.

When externally invalid/unsupported/missing state is later corrected, another explicit Refresh may load and publish a valid current snapshot without backend restart. Do not automatically poll, retry, repair, or initialize.

## Architecture invariants exercised

- `refs/heads/accepted` remains the sole accepted authority; no hidden acceptance record, SQLite projection, checkout state, or browser state competes with it.
- Every current workspace projection comes from one immutable snapshot at one exact accepted revision.
- Refresh validates an exact observed revision and re-observes authority before atomically publishing it.
- External non-linear ref changes are accepted without ancestry policy when their exact state is valid and supported.
- A previous valid snapshot may remain only as visibly non-current read-only reference; it is never silent fallback accepted state.
- Pending changes remain bound to their exact base and are never silently reapplied or re-resolved against newer accepted Architecture.
- Known non-current authority and inability to determine current authority are not conflated.
- WorkBraid's own successful CAS remains the direct acceptance/publication boundary.
- Source repositories remain untouched; SQLite remains operational association state rather than Architecture authority or projection.

## Acceptance criteria

The implementation is ready for independent review only when:

- the open workspace has one compact same-origin-protected **Refresh** action and unchanged Refresh stays quiet;
- dirty Title, Description, and relationship controls use the established keep/leave guard before Refresh replaces their context;
- Refresh is serialized with all other loaded/pending/review/discard/project/acceptance mutations under the existing concrete state boundary;
- valid externally selected `accepted` revisions remain invisible before Refresh and then replace map, index, documentation, relationships, and displayed revision together from one validated snapshot;
- adoption works for a valid non-fast-forward/rewind or otherwise non-linear external ref change without ancestry gating;
- exact-revision load followed by a second ref observation prevents publication of a revision already observed to be superseded;
- if that second observation has returned to the retained loaded revision, the retained snapshot stays current and no extra Refresh is required; if it names another revision or reports a missing ref, the retained snapshot and its pending set become known non-current/stale; if observation fails, no new stale claim is invented;
- unchanged Refresh preserves the loaded snapshot and any current pending/review state without canonical or operational churn;
- valid advancement with older pending work adopts the new accepted snapshot while preserving the complete old-base pending set as stale/read-only and invalidating review;
- stale pending titles, components, and relationship targets are rendered from retained old-base/pending context, not silently resolved through the new accepted snapshot;
- whole-set discard removes stale pending/review state only and enables new authoring only after a valid current snapshot is loaded;
- invalid, unsupported, or missing observed accepted state leaves the previous projection conspicuously non-current/read-only, with no Add/Edit/review/accept/fallback/repair action;
- every conclusive non-current result invalidates review and makes pending work on the retained revision stale/read-only even when replacement publication fails;
- an operational inability to observe current accepted state reports Refresh failure without inventing a new stale claim or erasing a previously known stale claim;
- correcting external accepted state and Refreshing again recovers the current workspace without restart;
- WorkBraid-mediated CAS acceptance continues to directly publish its already-validated successor snapshot without invoking Refresh;
- restart reconstructs the final exact valid accepted revision independently;
- source repository state and SQLite logical state remain exact;
- no watcher, polling, automatic retry, fallback, repair, reset, merge/rebase/reconciliation, persisted pending state, layout persistence, history/revert, or non-gating UX/map candidate enters the diff.

## Bounded real validation

### Real-Git/backend authority tests

Use temporary real bare Architecture repositories, the real Git executable, real committed trees/refs, real filesystem state, production handlers, and real SQLite association state. Cover:

1. **Unchanged:** Refresh observes the loaded revision, returns the same snapshot quietly, preserves a valid pending/review binding if present, creates no Git objects/refs, and does not alter the loaded snapshot, pending/review state, operational association, source repository, or persisted state.
2. **Valid external change:** externally move `accepted` to a different valid revision and prove no loaded projection changes before Refresh; after Refresh, every accepted projection and revision changes together. Include one non-fast-forward/rewind or sibling revision to prove there is no ancestry gate.
3. **Pending old base:** begin multi-component/text/relationship pending work and create an exact review; externally move `accepted`; Refresh adopts the new snapshot, preserves the pending set byte/identity-for-identity against its retained base, invalidates review, and exposes it read-only with old-context titles/targets. Prove no accepted projection includes pending topology.
4. **Discard after stale:** discard that stale set and prove only pending/review state disappears; Git refs/objects, current accepted snapshot, source files, and SQLite logical state remain exact. A new pending set then binds to the current accepted revision.
5. **Invalid, unsupported, and missing accepted:** exercise one representative structurally invalid revision, one supported-tree shape with an unsupported format/version or current-implementation feature, and missing `refs/heads/accepted`. Each makes the prior valid projection known non-current/read-only without fallback or repair. With pending work and a review based on that projection, prove each conclusive result preserves the exact old-base pending context, marks it stale/read-only, and invalidates review even though no replacement snapshot publishes. Prove recovery after external correction plus Refresh.
6. **Indeterminate observation:** make the temporary private store operationally unavailable so current `accepted` cannot be determined. Prove Refresh reports failure without newly asserting stale or invalidating a previously-current pending/review set; repeat from an already-known non-current/stale state and prove that state is preserved. Do not add production fault injection to simulate this.
7. **External ref race:** deterministically change the real `accepted` ref after exact revision `R` has loaded but before the second observation. Cover separately: final authority still at `R` (publish `R`); final authority returned to the retained loaded revision (discard `R`, retain the loaded snapshot as current, and do not require another Refresh); final authority at a third revision (do not publish `R`, mark the retained projection and its pending work known non-current/stale, invalidate review, and require Refresh); missing final ref (same conclusive non-current behavior); and indeterminate final observation (do not publish `R` or newly stale previously-current state). A later explicit Refresh may adopt whichever valid revision remains authoritative.
8. **Concurrent application mutations:** proportionately race Refresh with Keep change, Discard, project leaving/opening, review/confirmation, and WorkBraid-mediated accepted publication through production handlers. Prove the existing concrete synchronization boundary yields complete before/after states only, never a mixed snapshot/pending base, lost mutation, duplicate acceptance, or stale review confirmation.
9. **CAS regression:** accept a valid WorkBraid candidate and prove the successful CAS still publishes the already-validated successor directly. Refresh is neither called nor required, and restart reconstructs the same successor.
10. **Isolation:** throughout every case, verify the source repository's HEAD/status/files/checksums remain exact and SQLite contains no Architecture snapshot, ref history, pending set, stale marker, map state, or documentation projection.

Keep the matrix bounded to these authority/state boundaries. Do not expand it into exhaustive Git corruption testing, a generic scheduler, or a synthetic state-machine QA system.

### Frontend/workspace tests

Using separate runner-owned test cases as required by `AGENTS.md`, prove:

- **Refresh** appears compactly only in the open workspace and uses the protected mutation endpoint;
- unchanged success stays quiet with no permanent positive-current status;
- dirty Title, Description, and relationship edits each trigger the established keep/leave guard; keep cancels Refresh and leave drops only unsent browser state;
- valid replacement responses switch accepted index/map/documentation/relationships/revision together;
- stale pending work is reachable through **Changes in progress**, visibly read-only, retains old-context component/target labels, and exposes only whole-set discard—not edit/review/update;
- known non-current accepted state is conspicuous and removes Add/Edit/review/update actions while retaining reference navigation;
- indeterminate Refresh failure uses distinct product language, does not claim the loaded view is stale, and does not clear an already-known non-current state;
- an external-ref race result does not present the superseded loaded candidate as current and offers another explicit Refresh;
- a race that returns authority to the retained loaded revision leaves that workspace current without an unnecessary warning or extra Refresh, while conclusive third-revision/missing outcomes stale retained pending work and indeterminate outcomes do not invent staleness;
- correcting accepted state returns to the quiet current workspace without a page/backend restart;
- selection/layout reset or retention cannot mix revisions or crash when the selected component no longer exists;
- I3.1/I3.2 workspace composition, safe Markdown rendering, relationship fidelity, dirty navigation, discard/project switching, accepted-only map semantics, and ambiguous acceptance behavior do not regress.

Run the repository's ordinary frontend command. Do not introduce manual repeated render/unmount/mock-restoration loops, alternate unbounded Vitest commands, or permanent artificial resource limits. If a frontend process grows abnormally, stop immediately and diagnose before another run.

### Required checks

Before worker handoff, run:

- `git diff --check`;
- focused real-Git accepted-loader/refresh tests;
- focused production-handler refresh/pending/concurrency/review/CAS/restart tests;
- uncached full Go tests;
- applicable race-enabled Go tests for the touched state boundary;
- `go vet ./...`;
- `go mod verify`;
- the ordinary frontend test command;
- the production frontend build.

Do not commit dependencies, build output, databases, fixture repositories, screenshots, temporary binaries, or generated checkpoint artifacts.

## Fresh independent reviewer brief

After the worker produces one conventional implementation commit from the exact docs-inclusive base, assign one fresh reviewer who did not implement I3.3. Give the reviewer the exact planning baseline, worker base, implementation head, complete diff, this packet, governing baselines, completed I3.1/I3.2 records, and worker evidence.

The reviewer checks:

1. **Authority:** only `refs/heads/accepted` determines current Architecture; Refresh does not use HEAD, checkout, SQLite, browser state, fallback refs, or hidden acceptance state.
2. **Single loader:** exact revision loading reuses the existing accepted parser/validator and store-ID verification; no alternate component/relationship interpretation exists.
3. **Race boundary:** first observation, complete exact load, and mandatory second observation are present; a real ref race cannot publish a revision already known superseded, returning authority to the retained revision keeps it current, other/missing authority creates known non-current state, indeterminate observation creates no new stale claim, and no path automatically retries.
4. **Atomic application state:** Refresh shares the existing concrete synchronization boundary with mutation/discard/switch/review/CAS and publishes complete before/after state only.
5. **Non-linear authority:** valid external rewinds/sibling revisions are adopted without ancestry or provenance policy.
6. **Pending fidelity:** old-base pending work remains exact, stale/read-only, and inspectable from retained old context whenever its base is conclusively non-current—including invalid/unsupported/missing and ref-race outcomes without replacement publication; review is invalidated and no value/relationship is re-resolved through newer state. Indeterminate failure does not newly stale previously-current work.
7. **Discard/current gating:** whole-set discard changes only pending/review state, and authoring resumes only with a valid current snapshot.
8. **Epistemic accuracy:** known non-current state and inability to determine current state are distinct; failed observation does not invent or erase knowledge.
9. **Invalid state:** invalid/unsupported/missing accepted retains prior projection only as conspicuously read-only reference with no fallback, commit, initialize, repair, reset, merge, or rebase path.
10. **CAS regression:** WorkBraid's own successful acceptance still directly publishes the validated successor at CAS and does not depend on Refresh.
11. **UI/product:** Refresh uses the dirty-editor guard, quiet current state, conspicuous non-current state, product language, accepted-only map/index/docs, and no internal Git/parser terminology in normal UI.
12. **Isolation/scope:** source and SQLite isolation hold; no watcher, polling, persisted draft/projection, reconciliation, history/layout work, generic framework, or recorded non-gating candidate enters.

Any competing authority, mixed-revision projection, stale pending reinterpretation, false current/stale claim, or regression of the accepted CAS/restart path is actionable and blocks the human checkpoint.

The reviewer edits no files. It reports findings with severity, exact file/line and reproduction evidence, and residual human-checkpoint risks. If findings exist, return them to the same implementation worker for bounded correction and use a fresh rereview before integration.

## Integration procedure

After a no-actionable-findings review:

1. Verify the implementation head is a descendant of the exact docs-inclusive worker base and the isolated worker tree is clean.
2. Integrate only the reviewed I3.3 implementation commit(s), without rewriting approved Architecture/UI/planning/packet/completion documents.
3. Verify the worker-base-to-integrated-head diff exactly matches the independently reviewed diff.
4. Rerun `git diff --check`, focused real-Git/refresh/pending/concurrency/CAS/restart checks, uncached full Go tests, applicable race tests, Go vet, module verification, the ordinary frontend suite, and the production frontend build.
5. Confirm no dependency, build, database, fixture, screenshot, temporary binary, or generated artifact is staged.
6. Start the built real application with a fresh process, isolated application-data directory, real Git executable, real private bare store, real SQLite association state, and throwaway source repository for the human checkpoint.

Do not begin Increment 4 while integration checks or the human checkpoint remain incomplete.

## Real human checkpoint

Use the built UI served by the real loopback Go process, the real Git executable, a real private bare Architecture repository, real filesystem and SQLite association state, and a throwaway source repository whose HEAD, status, file list, and checksums are recorded before the checkpoint.

1. Open or initialize a component-bearing Architecture with relationships. Record accepted revision `A`, visible component/index/map/documentation/topology, source-repository state, private-store refs/objects, and SQLite logical state.
2. Choose **Refresh** with `accepted` still at `A`. Verify the workspace stays quiet, every accepted projection remains exact, and no Git/source/SQLite or pending/review state changes.
3. Externally advance `accepted` to a different valid supported revision `B` with visibly changed components, documentation, and topology. Use an ordinary authoritative Git ref update outside WorkBraid. Verify the loaded workspace remains exactly at `A` before Refresh.
4. Choose **Refresh**. Verify revision, component index, map nodes/edges, accepted documentation, titles, and relationship resolution all switch together to exact `B`, with no positive-current banner or mixed `A`/`B` content. The fixture may use a valid rewind/sibling revision to demonstrate that no ancestry policy blocks authority.
5. Create and review a recognizable multi-component pending set against `B`, including a relationship whose target/title context will differ in the next revision. Externally move `accepted` to valid revision `C`. Choose **Refresh** and verify accepted projections adopt `C` without confirmation while the old pending set remains exact, visibly stale/read-only, and inspectable using its retained `B`/pending context. Verify it cannot be edited, reviewed, or accepted.
6. Use the existing deliberate whole-set **Discard changes** action. Verify only stale pending/review state disappears; `accepted`, the loaded `C` snapshot, Git objects, source repository, and SQLite logical state stay exact. Begin one new pending change and verify it is based on current revision `C`, then discard it for the remaining checks.
7. Externally select one invalid or unsupported accepted revision `D`. Choose **Refresh**. Verify the prior `C` projection remains visibly non-current/read-only with no Add/Edit/review/update/fallback/initialize/repair action and no claim that `C` is accepted.
8. Separately make the private store temporarily operationally unavailable and choose **Refresh** from a known current or restored state. Verify the product says it could not check Architecture rather than claiming the view is definitely out of date. Repeat or inspect from the known non-current state and confirm the known state is not erased. Restore the store without using a WorkBraid repair flow.
9. Correct `accepted` externally to valid supported revision `E` and choose **Refresh**. Verify the workspace recovers to exact current `E` without restarting the backend.
10. Exercise a deliberately controlled real-ref race: pause at the narrow load/re-observe checkpoint while Refresh has completely loaded valid revision `R`, advance real `accepted` to a different revision `S`, then release Refresh. Verify WorkBraid does not publish `R` as current, does not mix projections, reports that Architecture changed again, and requires another explicit Refresh. Refresh again and verify exact `S` is adopted if it remains authoritative. The pause is checkpoint-only synchronization around the production path, not an exposed product action or alternate Git implementation.
11. With a dirty Title, Description, and representative relationship edit in separate checks, choose **Refresh**. Verify **Keep editing** preserves the unsent fields and cancels Refresh; **Leave without keeping** drops only those browser-local values and performs Refresh without altering previously backend-held pending work.
12. Deliberately accept one valid WorkBraid pending change and verify the existing CAS path immediately publishes its validated successor without requiring Refresh. Record final accepted revision `F`.
13. Stop WorkBraid completely. Start a genuinely new process with the same application-data directory, reopen the project, and verify exact revision `F`, component identities, documentation, relationships, and topology reconstruct from canonical Git.
14. Verify the source repository retains its original HEAD, tracked/untracked status, file list, and checksums. Verify SQLite contains only intended operational association state and no Architecture snapshot, history, stale marker, pending set, map, or documentation projection.

Record **PASS** only if unchanged Refresh is quiet; valid external authority is invisible until Refresh and then adopted atomically; stale pending work remains exact/read-only in old context and is safely discardable; invalid/unsupported authority produces a conspicuous non-current reference without fallback/editing; indeterminate observation is not mislabeled stale; the controlled ref race cannot publish a known-superseded revision; WorkBraid CAS remains direct; restart reconstructs final authority; and source/SQLite isolation remains exact.

## Explicit exclusions

Do not implement:

- filesystem watchers, polling, automatic refresh, background re-observation, or automatic retry loops;
- fallback refs or previous snapshots presented as current;
- repair, reset, ref reconstruction, automatic initialization, replacement-store, merge, rebase, reconciliation, or conflict UI;
- pending-set reinterpretation, automatic unstaling, partial discard, multiple pending sets, persisted pending work, autosave, undo/redo, or general draft lifecycle;
- ancestry/fast-forward policy, history browsing, arbitrary revision comparison, semantic diff, or revert;
- graphical editing, pending topology/title overlays, component deletion, filename/identity replacement, raw-frontmatter editing, or relationship lifecycle/taxonomy;
- manual/persisted layout, grouping, overlays, source inference, isometric rendering, syntax highlighting, URL restoration, themed scrollbars, colorized/rendered diff, or any recorded non-gating UX/map candidate;
- source-repository export/synchronization, external project-management integration, Planning/Agent-Control UI, authentication, remote access, multi-user behavior, or mobile-specific UX;
- SQLite Architecture projection/eventing, generic repository/VCS/workspace/transaction/state-machine/fault-injection frameworks, or Increment 4 implementation.

## Stop boundary

I3.3 completes only after integration, fresh independent review, bounded automated real-system validation, and the real human checkpoint pass and are recorded. Stop there. Do not prepare or implement Increment 4 until the human explicitly accepts I3.3 and Architecture Increment 3 as complete.
