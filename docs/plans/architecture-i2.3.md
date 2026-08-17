# Architecture I2.3 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plan: `docs/plans/architecture-increment-2.md`

Completed prerequisites: `docs/plans/architecture-i2.1.md` and `docs/plans/architecture-i2.2.md`

Work item: I2.3 — Exact diff review and stale-base-protected accepted advancement

Exact completed-I2.2 planning base: `ae0f19a41c35952d90ad9bec8f299005ab0ee5e6`

## Execution base

This proposed packet is intentionally uncommitted and authorizes no implementation. After human approval, commit the approved packet on top of the exact completed-I2.2 planning base above. That docs-inclusive packet commit becomes the exact worker base and must be recorded by the dispatcher before implementation starts.

The worker must start from that one exact clean packet commit, not directly from `ae0f19a41c35952d90ad9bec8f299005ab0ee5e6`, because the worker base must contain this approved packet and every approved document it is instructed to read. Before changing code, the worker verifies:

- `HEAD` equals the dispatcher-provided docs-inclusive worker-base SHA;
- the worktree is clean;
- this packet records Status Approved;
- the Increment 2 plan records Status Approved;
- the completed I2.1 and I2.2 records both record human checkpoint PASS.

Dispatch exactly one implementation worker. After the worker completes, use one fresh independent reviewer who did not implement I2.3. Increment 3 must not begin until I2.3 is integrated, independently reviewed, checked through the real application, and explicitly accepted by the human.

## Objective

A human can take one valid backend-held I2.2 change set, inspect the complete exact canonical diff relative to its exact accepted base, and deliberately update accepted Architecture.

The backend commits exactly the candidate that was reviewed, advances only `refs/heads/accepted` with compare-and-swap protection, consumes the pending change only after that ref advancement succeeds, and publishes the already-validated successor snapshot. A stale base never overwrites newer accepted Architecture.

I2.2 may quietly retain incomplete or structurally invalid authored values. I2.3 is the point where candidate invalidity becomes actionable: attempting to review an invalid candidate must explain in product language what needs correction before Architecture can be updated, expose no confirm action, and leave the pending changes intact.

## Worker brief

Read these approved documents completely before changing code:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-2.md`;
- the completed `docs/plans/architecture-i2.1.md` execution record;
- the completed `docs/plans/architecture-i2.2.md` execution record;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, planning, packet, or completion documents. If implementation exposes an Architecture conflict or materially important missing decision, stop and report it rather than silently changing authority, review, or failure semantics.

Extend the integrated I2.2 application with one review-and-accept vertical slice:

- reuse I2.2's one concrete candidate construction, complete structural-validation, and immutable candidate-snapshot path unchanged; do not add a review serializer, commit serializer, second parser, frontend candidate builder, or alternate validation path;
- retain the one backend-held pending change set bound to its exact private Architecture store and exact accepted base revision;
- add a deliberate **Review changes** operation for a pending change set. Do not show review/accept controls when no changes are in progress;
- when review is requested, construct and validate the complete candidate through the shared I2.2 path before producing a diff or enabling confirmation;
- if candidate validation fails, keep the invalid values quietly in Changes in progress, show a concise product-language blocking message at the review boundary, and expose no final confirmation. For an empty normalized Title, tell the person to add a title to the untitled component before Architecture can be updated. Do not expose parser, YAML, frontmatter, UUID, tree, blob, ref, snapshot, canonical, or Git-error terminology;
- keep review-boundary validation proportional to the approved structural contract. Do not add live linting, prose policy, or another validation framework;
- generate one predictable unified diff between the exact accepted base tree and the complete validated candidate tree. Disable external diff drivers, text conversion, color, pagers, and environment-dependent presentation behavior;
- include the entire pending change set in the review diff, including new component files and canonical frontmatter. The diff is review evidence, not a canonical artifact and not a semantic diff;
- present the complete diff directly or behind one obvious expansion in a small review surface consistent with `docs/ui-v0.md`. Exact paths and canonical source are appropriate inside this deliberate technical review task, but Git mechanics must not become general UI chrome;
- use product actions such as **Review changes** and **Update architecture**, not Commit, CAS, ref, or candidate-tree language in the normal flow;
- bind every successful review concretely to the exact accepted base commit, exact candidate tree ID, and current in-process pending-change generation/version. Final confirmation may accept only when all three still match; it must never silently rebuild or commit a different pending state;
- increment the small concrete pending generation whenever that in-process change set mutates. Any mutation after review invalidates the binding and requires a new review before confirmation. Keep this as one local in-memory mechanism, not a generic review/version, approval, or optimistic-concurrency framework;
- on final confirmation, while holding the concrete application state needed to prevent competing local pending mutations, verify the reviewed base/tree/generation binding, then explicitly re-observe `refs/heads/accepted` before creating a successor commit;
- if this pre-commit observation already shows `accepted` differs from the reviewed base, stop as stale without creating a WorkBraid successor commit. If it still equals the base, create the successor and then perform the mandatory atomic compare-and-swap; a race at that final CAS may leave an unreferenced successor commit, which remains non-canonical;
- if `accepted` no longer equals the base, classify the operation as stale from explicit ref observation, leave the externally advanced ref untouched, preserve the in-process pending change set, invalidate the old review, and report in product language that the changes are out of date. Mark the previously loaded base snapshot stale/non-current rather than continuing to present it as accepted; do not load an unvalidated fallback, merge, rebase, reconcile, retry-overwrite, or fall back;
- for a current base, create exactly one successor commit whose tree is the reviewed candidate tree and whose sole parent is the exact base. Supply the bounded commit identity/message and relevant Git configuration explicitly rather than relying on global user configuration;
- atomically advance `refs/heads/accepted` from the expected base to that successor using real Git compare-and-swap behavior;
- classify ref-update failure through explicit follow-up ref/object observation, never by parsing localized Git stderr. Commit or object creation without successful ref advancement remains non-canonical;
- treat successful atomic ref advancement as the acceptance success boundary. Immediately after success, the successor is canonical and the old pending change must be marked committed/consumed before any fallible in-memory publication or response work can make it appear retryable;
- after successful CAS, publish the already-validated candidate snapshot under the successor commit identity and show the updated accepted component inventory. Do not parse or reconstruct a different post-commit snapshot for the success path;
- if publication or HTTP/UI response delivery fails after CAS, never restore or offer the consumed pending change as uncommitted. Recover current application state by loading the revision named by `accepted`; provide product language that does not invite a duplicate update. Restart/reopen remains the independent reconstruction proof;
- on validation, diff generation, commit creation, or ref-update failure before successful CAS, leave the prior accepted revision authoritative and preserve the pending change set in the running backend. Only failures that are actually safe to retry may be presented that way;
- after success, make the exact successor revision and its complete parent diff deliberately inspectable without making SHA/Git history dominant UI chrome;
- retain expected-origin enforcement, bounded inputs, fixed non-shell Git invocations, no permissive CORS behavior, and source-repository isolation for every new operation;
- leave the user's source repository untouched.

Exact endpoint organization, representation of the small in-memory `(base commit, candidate tree ID, pending generation)` review binding, temporary-index arrangement, Git plumbing command sequence, bounded commit author/message spelling, and review-panel/dialog markup are implementation choices. They must preserve the exact reviewed-tree/commit-tree identity, CAS authority, and success boundary above without adding generic command, workflow, versioning, or approval infrastructure.

## Required focused validation

Use the real compatible Git executable, real temporary bare private repositories, real filesystem state, and real temporary SQLite databases. Do not introduce fake Git, fake CAS, a mock accepted ref, or a test-only alternate commit path.

### Review and invalid-candidate boundary

- Start with the completed I2.2 multi-file pending change set and prove **Review changes** calls the same candidate construction/validation path already used during authoring.
- For a valid candidate, prove the reviewed tree identity and immutable candidate snapshot exactly match I2.2's candidate result.
- Generate the complete unified base-tree-to-candidate-tree diff and prove it contains every changed/new canonical file and frontmatter change while unchanged paths retain their exact base entries/blobs.
- Prove predictable output with external diff/text conversion/color/pager behavior disabled. Do not pin the rendered bytes as canonical state.
- Retain a whitespace-only/empty normalized Title quietly during I2.2 editing. On **Review changes**, prove no diff confirmation is offered and the UI says, in concise product language, what must be corrected before Architecture can be updated. The pending change and prior accepted state remain intact through browser reload against the same backend.
- Correct the invalid component, review again, and prove the complete valid multi-file candidate becomes reviewable.
- Change pending authored state after a successful review and prove its generation advances, the reviewed base/tree/generation binding no longer matches, and the previous review cannot confirm or commit the newly changed/unreviewed candidate; a fresh review is required.

### Successful accepted advancement

- From a valid reviewed candidate, create one real successor commit with the reviewed candidate tree and exact base as sole parent.
- Prove the commit identity/message configuration is controlled and does not invoke signing, hooks, editor, pager, external diff behavior, or user-global presentation configuration.
- Atomically advance only `refs/heads/accepted` from the expected base to the successor and prove that successful update is the acceptance boundary.
- Prove the pending change is consumed exactly once after CAS and cannot be confirmed again to create a duplicate successor.
- Prove the already-validated candidate snapshot is published under the successor commit identity and the accepted UI inventory changes only after CAS succeeds.
- Prove the exact successor revision and complete parent diff remain available through deliberate technical inspection.
- Instantiate a genuinely new backend/application/database instance over the same application-data directory and prove it reconstructs the exact successor revision, component IDs, paths, Titles, exact Description bytes, relationships, and modes from `accepted`.

### Pre-CAS failure and stale behavior

- Advance `refs/heads/accepted` through ordinary Git after review but before confirmation. Prove the explicit pre-commit observation reports the change set as out of date, preserves it in the running backend, does not alter the externally advanced ref, and creates no WorkBraid successor commit.
- Deliberately race `accepted` after the successful pre-commit observation but before the final CAS. Prove CAS fails, the external successor remains authoritative, the pending change remains uncommitted, and any WorkBraid successor commit object is unreferenced and non-canonical.
- Prove a stale attempt never silently refreshes the base, rebuilds on the newer tree, merges, rebases, retries an overwrite, or presents the previously loaded base snapshot as current accepted state. It may remain available only as clearly stale, read-only reference.
- Use a bounded real-Git failure such as a real ref-lock/update failure to prove that commit-object creation without successful CAS leaves the prior accepted revision authoritative and the pending change uncommitted. Domain classification comes from observing the ref, not stderr text.
- Prove validation/diff/commit failures before CAS preserve the prior accepted state and pending change without manufacturing repair machinery.
- Confirm unreferenced candidate/commit objects have no authority and are never presented as accepted.

### Post-CAS publication failure

- Add one focused deterministic test seam at the concrete publication boundary, not a production fault-injection endpoint or generic recovery framework.
- Force publication/response work to fail only after a successful CAS and prove `accepted` remains at the successor, the pending change is already consumed, and the operation is never presented as an ordinary retryable uncommitted update.
- Prove repeating the old confirmation cannot create another commit or advance `accepted` again.
- Prove reloading the revision named by `accepted` restores current application state, and a genuinely fresh backend reconstructs the same successor independently.

### HTTP, frontend, authority, and isolation

- Exercise review, invalid-review blocking, pending-change-after-review invalidation, confirmation, success, stale confirmation, pre-CAS failure, and post-CAS failure through production handlers.
- Frontend tests prove the full diff is inspectable before confirmation, invalid candidates produce actionable review-boundary guidance, success removes Changes in progress and updates accepted inventory, and stale/post-CAS outcomes use truthful product language.
- Retain expected/missing/wrong-origin and no-permissive-CORS coverage for all new mutations. Browser input must never become arbitrary Git arguments, commit metadata, ref names, or diff options.
- Record source-repository `HEAD`, tracked/untracked status, file list, and content checksums before and after success, stale failure, restart, and post-CAS recovery; prove they remain unchanged.
- Prove SQLite gains no Architecture projection, accepted authority, commit record, or persisted pending/review state.
- Run `git diff --check`, uncached full Go tests, full race tests, `go vet`, module verification, focused real-Git/HTTP tests, frontend tests, and the production frontend build.

Keep this evidence bounded. Do not build an exhaustive Git-corruption matrix, synthetic workflow engine, production fault-injection API, or general transaction/recovery state machine.

## Acceptance criteria

The implementation is ready for independent review only when:

- I2.2's single candidate construction/validation path is reused unchanged for review and commit, and the browser performs no canonical interpretation;
- invalid pending authored state remains quietly editable until **Review changes** is requested; at that boundary, structural invalidity prevents diff confirmation/acceptance and produces concise actionable product language without discarding the pending change;
- one complete exact unified diff between the pending set's exact accepted base tree and validated candidate tree is inspectable before confirmation;
- final confirmation can accept only when the reviewed exact base commit, candidate tree ID, and pending generation still match; subsequent pending mutation advances the generation, invalidates the review, and requires another one;
- successful confirmation creates one successor with the exact base as sole parent and reviewed candidate tree, then advances only `refs/heads/accepted` with compare-and-swap protection;
- successful CAS is the acceptance success boundary: the successor is canonical and the pending change is consumed exactly once before fallible publication/response work;
- the already-validated candidate snapshot is published under the successor identity, and a fresh authoritative load reconstructs the same complete accepted component state;
- the exact successor revision and parent diff are deliberately inspectable after success without general history/comparison UI;
- stale confirmation detected by the pre-commit observation creates no successor commit; stale failure at the mandatory final CAS may leave only an unreferenced non-canonical commit. Both leave externally advanced `accepted` untouched, preserve the pending change in-process, invalidate the old review, clearly mark the loaded base snapshot stale/non-current, and perform no merge/rebase/reconciliation/fallback;
- validation, diff, commit, or ref-update failure before CAS leaves previous accepted state authoritative and the pending change uncommitted;
- post-CAS publication/response failure leaves the successor authoritative, consumes the old pending change, prevents duplicate confirmation, and recovers by loading `accepted` rather than restoring draft state;
- unreferenced objects/commits remain non-canonical and Git stderr is never parsed into Architecture authority decisions;
- controlled real-Git execution, origin protection, no permissive CORS, and source-repository isolation remain intact;
- no relationship authoring, Markdown rendering, accepted map, proposal workflow, history/revert UI, cross-process pending persistence, SQLite Architecture projection, or Increment 3 work is introduced;
- focused/full Go, real-Git, HTTP, race, vet, module, frontend, production-build, and diff checks pass;
- no approved Architecture, UI, planning, packet, or completion document is edited by the worker.

## Explicit exclusions

Do not implement:

- relationship creation/editing or target selection;
- Markdown rendering, preview, navigation, remote-resource behavior, or active HTML;
- map, graph, layout, relationship visualization, selection, viewport, or source inference;
- proposal creation/review/acceptance, proposal refs/branches/worktrees, or agent approval;
- merge, rebase, reconciliation, automatic conflict handling, overwrite retry, or fallback refs/snapshots;
- pending-change persistence/recovery across backend restart, SQLite Architecture projection, or persisted review state;
- component deletion, file rename UI, manual filename choice, raw-frontmatter editing, or identity replacement;
- semantic diff, arbitrary comparisons, general history browsing, revert, rollback, undo, or redo;
- export/synchronization, reassociation, repair/reset, repository fingerprinting, or store replacement;
- authentication, multi-user behavior, public API, separately deployed services, generic permissions, or Agent Control/Planning behavior;
- generic VCS, transaction, workflow, command, review, approval, repository/service, validation, or recovery abstractions;
- Increment 3 implementation or later Gate 1 work.

## Fresh independent reviewer brief

After the implementation worker finishes, assign one reviewer who did not implement I2.3. Give the reviewer:

- exact completed-I2.2 planning base `ae0f19a41c35952d90ad9bec8f299005ab0ee5e6`;
- the dispatcher-recorded docs-inclusive I2.3 worker-base SHA;
- the complete worker diff and commit(s);
- this packet and every governing document listed in the worker brief;
- the worker's real-Git diff/CAS/restart, HTTP/frontend, failure-boundary, and source-isolation evidence.

The reviewer checks:

1. **Scope:** no relationships, rendering, map, proposals, history/revert, reconciliation, persisted drafts/reviews, generic workflow/recovery machinery, or Increment 3 work entered the diff.
2. **Single candidate path:** review and commit use I2.2's exact candidate tree and immutable validated snapshot; no second serializer/parser/validator or browser reconstruction exists.
3. **Review integrity:** the complete diff is base tree versus candidate tree; successful review records the exact base commit, candidate tree ID, and pending generation; confirmation requires all three to match, and pending mutation advances the generation and invalidates review.
4. **Actionable validation boundary:** quiet invalid pending state becomes a blocking, concise product-language error only when review is requested; no confirm action or partial diff can bypass complete validation.
5. **Commit integrity:** successor tree equals reviewed tree, sole parent equals exact base, Git execution is controlled, and commit/object creation alone has no authority.
6. **CAS authority:** confirmation observes `accepted` before commit creation and stops without a successor if already stale, then still performs mandatory CAS after commit creation; only successful atomic advancement accepts the change, while a final-CAS race may leave only an unreferenced commit. Stale/ref failures are classified by explicit ref observation, preserve the right state, and never present a known-stale base snapshot as current accepted Architecture.
7. **Success boundary:** pending is consumed exactly once immediately after CAS; publication uses the already-validated snapshot; duplicate confirmation is impossible.
8. **Post-CAS failure:** successor stays canonical, no ordinary retry/uncommitted presentation occurs, and loading `accepted` plus fresh restart reconstructs it without another authority model.
9. **Product surface:** diff review and success/stale/invalid/failure language follow `ui-v0.md`; Git mechanics appear only where exact canonical review/technical inspection requires them.
10. **Evidence and isolation:** tests use real Git/filesystem/SQLite and remain bounded; source repository and operational association are unchanged; full checks pass; approved documents remain unchanged.

The reviewer reports actionable findings ordered by severity with file/line and reproduction evidence. Any material finding returns to the same I2.3 scope for correction and another fresh independent review. Increment 3 must not begin.

## Integration procedure

1. Confirm the worker started from the dispatcher-recorded docs-inclusive I2.3 worker-base SHA, used one implementation worktree, and did not edit approved documents.
2. Review the complete I2.3 diff and evidence against this packet.
3. Obtain a fresh independent review with no actionable findings.
4. Integrate only I2.3 using conventional commits; do not mix packet/provenance changes, unrelated cleanup, or Increment 3 preparation into the implementation commit.
5. From the integrated implementation tree, rerun `git diff --check`, uncached full Go tests, full race tests, `go vet`, module verification, focused real-Git/HTTP checks, frontend tests, and the production frontend build.
6. Run the two real human paths below.
7. Record the completed-I2.2 planning base, docs-inclusive I2.3 worker base, final integrated I2.3 SHA, fresh-review outcome, automated evidence, exact reviewed/base/candidate/successor revisions, stale external revision, restart result, source-isolation result, and human-checkpoint result in this packet's execution record.
8. Stop. Increment 3 requires a separate human-approved plan or execution packet and explicit go-ahead.

## Real human checkpoint

Use the built browser UI served by the real Go process, the real compatible Git executable, a real private bare Architecture repository, real SQLite association state, an isolated application-data directory, and a real throwaway source repository.

### Valid review, acceptance, and restart

1. Create a throwaway source repository with tracked and untracked files. Record its `HEAD`, status, file list, and content checksums.
2. Start WorkBraid with a fresh isolated application-data directory, initialize Architecture, and create at least two component changes in one pending change set through structured authoring.
3. First retain one whitespace-only Title. Choose **Review changes** and verify WorkBraid now explains what must be corrected before Architecture can be updated, offers no final confirmation, preserves all pending changes, and leaves accepted Architecture unchanged.
4. Correct the Title, review again, and inspect the entire exact unified diff. Verify it contains both component changes and canonical frontmatter for the new component.
5. Deliberately choose **Update architecture**. Verify Changes in progress is consumed, the accepted inventory updates, and the exact successor revision and parent diff are available through Technical details.
6. With read-only Git inspection, verify the successor tree equals the reviewed candidate tree, its sole parent is the recorded base, and `refs/heads/accepted` points to it.
7. Stop WorkBraid completely. Start a genuinely new process with the same application-data directory, reopen the project, and verify the identical accepted revision and complete component state are reconstructed with no recovered uncommitted change set.
8. Verify the source repository's recorded `HEAD`, status, files, and checksums remain unchanged.

### Stale reviewed change

9. In a separate isolated project/store or fresh process, create a valid pending change and open its complete review diff. Record its exact base, reviewed candidate tree, and current pending generation.
10. Before final confirmation, acting as an authoritative human through ordinary Git, advance `refs/heads/accepted` to a different valid linear successor.
11. Return to WorkBraid and choose **Update architecture**. Verify WorkBraid reports that the changes are out of date, does not move or overwrite the external successor, preserves the pending change in the running backend, marks its previously loaded Architecture stale/non-current, and offers no automatic merge/rebase/retry-overwrite behavior.
12. Verify with read-only Git that `accepted` remains at the external successor and, because this path was stale at the pre-commit observation, no WorkBraid successor commit was created. Automated real-Git coverage separately proves the final-CAS race may leave an unreferenced commit with no authority. Verify the source repository remains unchanged.

Record **PASS** only if invalid review is actionably blocked without losing pending work, the complete exact diff is reviewed before a successful CAS-protected accepted successor, success consumes the pending set and survives a genuine restart, stale confirmation preserves both the external authority and in-process pending work without overwrite/reconciliation, and both source repositories remain untouched.

## Stop boundary

I2.3 completes only after integration, fresh independent review, automated real-system checks, and both real human paths pass. Stop there. Do not prepare or implement Increment 3, relationships, documentation rendering, or the accepted map without explicit human approval.
