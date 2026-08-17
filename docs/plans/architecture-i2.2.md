# Architecture I2.2 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plan: `docs/plans/architecture-increment-2.md`

Completed prerequisite: `docs/plans/architecture-i2.1.md`

Work item: I2.2 — Structured component authoring and backend-owned pending changes

Exact completed-I2.1 planning base: `6b115142144a11ea3615302a9bc4002f6aad0397`

## Execution base

This proposed packet is intentionally uncommitted and authorizes no implementation. After human approval, commit the approved packet on top of the exact completed-I2.1 planning base above. That docs-inclusive packet commit becomes the exact worker base and must be recorded by the dispatcher before any worker starts.

The worker must start from that one exact clean packet commit, not directly from `6b115142144a11ea3615302a9bc4002f6aad0397`, because the worker base must contain this approved packet and every approved document it is instructed to read. Before changing code, the worker verifies:

- `HEAD` equals the dispatcher-provided docs-inclusive worker-base SHA;
- the worktree is clean;
- this packet records Status Approved;
- the Increment 2 plan records Status Approved;
- the completed I2.1 record records human checkpoint PASS.

Dispatch exactly one implementation worker. After the worker completes, use one fresh independent reviewer who did not implement I2.2. Do not begin I2.3 until I2.2 is integrated, independently reviewed, checked through the real application, and explicitly accepted by the human.

## Objective

Through the real WorkBraid application, a human can add a component and edit an accepted component using structured **Title** and **Description** controls. Submitted changes coexist in one backend-owned pending Architecture change set based on the exact loaded accepted revision.

The backend constructs and structurally validates the complete candidate Architecture, while `refs/heads/accepted`, its committed tree, and the loaded accepted snapshot remain unchanged. Browser reload retrieves and continues the same backend-held changes only while that backend process remains alive.

I2.2 does not review, commit, or accept those changes.

## Worker brief

Read these approved documents completely before changing code:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-2.md`;
- the completed `docs/plans/architecture-i2.1.md` execution record;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, planning, packet, or completion documents. If implementation exposes an Architecture conflict or materially important missing decision, stop and report it rather than silently changing the contract or inventing behavior.

Extend the integrated I2.1 application with one authoring vertical slice:

- preserve I2.1's existing accepted-snapshot loader as the sole interpretation of accepted Architecture; do not add a parallel component reader in the authoring path, browser, or tests;
- add one concrete in-process pending Architecture change set, owned by the backend and bound to exactly one private Architecture store ID and the exact accepted revision from which it was started;
- represent that change set as a collection of component-file additions and replacements so one set can coherently affect multiple Architecture files, even if the first UI edits one component at a time;
- make mutation of that one backend-held change set concurrency-safe and atomic from the application's perspective: concurrent HTTP requests must not lose one another's changes or expose a partially updated pending set or candidate; do not introduce multi-user behavior or a general concurrency framework;
- never infer pending state from browser-local state alone, apply it to another store or base, or persist it as accepted Architecture;
- add the minimum backend operations needed to read accepted component values for structured authoring, add a component, edit an accepted component, and retrieve the current backend-held changes after a browser reload;
- keep transient unsent field edits in the browser if useful, but treat a change as recoverable within the running process only after the backend has received and retained it;
- keep cross-process pending-change persistence explicitly absent: stopping the backend may lose the pending change set, and the UI must not claim otherwise;
- provide structured **Title** and **Description** authoring. The canonical H1 remains Markdown source, while the structured Title is its plain human-readable inline-text projection: resolve escapes/entities; discard emphasis, strong, and strikethrough formatting while retaining their text; retain code-span text and visible link text without destinations; and retain raw HTML as literal inert text;
- trim leading and trailing whitespace from a submitted/projected Title before retaining it in the pending change set, and require the normalized Title to be non-empty. Serialize structured Title text into the H1 with whatever escaping/encoding is needed so the shared authoritative parser yields the same normalized Title; do not introduce a metadata field or separate title encoding;
- for an existing component, preserve the complete H1 bytes when a Description-only edit is submitted or when the normalized submitted Title is unchanged. When the normalized Title changes, replace the complete canonical H1 block without attempting to preserve inline Markdown formatting that the structured editor does not expose; preserve the existing ATX/Setext heading form unless that would conflict with the round-trip invariant. A Description edit replaces the exact Markdown body source following the H1. Neither operation changes the component ID or outgoing relationships;
- when editing an accepted component, preserve its component ID, canonical filename/path, outgoing relationship declarations, and regular-file mode;
- preserve the complete existing frontmatter block byte-for-byte for every Title or Description edit. I2.2 has no operation that changes frontmatter;
- for a Title-only edit, preserve the Markdown body bytes exactly. For a Description-only edit, preserve the complete H1 block exactly;
- do not rename an existing component file when its title changes;
- when adding a component, generate one opaque stable UUID and one human-readable creation-time direct `components/*.md` filename, with bounded collision handling against the complete candidate tree;
- serialize a new component as one ordinary `100644` blob with minimal closed v1 frontmatter, an ATX H1, the authored Description body, and no outgoing relationships;
- do not give filename choice, identity replacement, raw-frontmatter editing, or relationship authoring to the browser;
- construct the complete candidate from the pending change set's exact accepted base tree, not from checkout state, browser state, the current filesystem, or SQLite;
- reuse each unchanged base-tree entry and blob exactly. Serialize only changed or created canonical files; preserve the existing regular-file mode of an edited component and use `100644` for a new component;
- preserve the manifest and every untouched component exactly, including paths, blob identities, modes, and source bytes;
- run complete candidate structural validation using the same Architecture-owned component parsing and snapshot-construction semantics introduced by I2.1, including manifest/store identity, closed tree shape, component IDs, UTF-8, H1 titles, relationship declarations, and target resolution across the complete candidate;
- introduce exactly one candidate construction and validation path. The same concrete path supplies every I2.2 candidate result and is the path I2.3 will later reuse for review and commit; do not create separate preview-candidate, form-validation, or future commit-candidate interpretations;
- on successful validation, retain the complete immutable candidate snapshot pinned to the candidate tree and the exact accepted base, without publishing it as the loaded accepted snapshot;
- on validation failure, retain the submitted pending authored values and validation result in the backend so the human can correct them. Do not discard the change set, partially publish a candidate snapshot, or alter accepted Architecture;
- distinguish accepted components from **Changes in progress** in the UI. Pending changes may project their current Title and Description, but must not be presented as accepted;
- use short product-language validation feedback that tells the person what to correct. Do not pipe parser, YAML, Git, UUID, filename, blob, tree, ref, snapshot, canonical, store, or base-revision terminology into normal UI;
- keep the I2.1 component inventory compact and transitional. Add only the controls and in-progress state necessary for this authoring task; do not create a component dashboard or map precursor;
- retain expected-origin enforcement, no permissive CORS behavior, bounded request bodies, and backend ownership for every new read/mutation operation;
- leave the user's source repository untouched;
- leave `refs/heads/accepted`, the accepted commit/tree, and the currently loaded accepted snapshot exactly unchanged for the entire increment. Candidate blobs or trees created by real Git plumbing remain non-canonical and must not be referenced as accepted.

Exact endpoint organization, Go package/helper layout, in-memory value shapes, creation-time filename slug/collision algorithm, candidate temporary-index/plumbing sequence, minimal new-component frontmatter spelling, and authoring-form composition are bounded implementation details. They must not alter the portable v1 store contract, introduce another Architecture interpretation, or pre-design I2.3.

## Required focused validation

Use the real compatible Git executable, real temporary bare repositories, real filesystem state, and real temporary SQLite databases. Do not introduce fake Git, a fake candidate authority, checkout-based canonical state, or browser-side Markdown/frontmatter parsing.

### Accepted-component editing

- Start from a valid component-bearing accepted revision loaded through the existing I2.1 path. Include an accepted component with relationship frontmatter, a nontrivial Description body, an arbitrary filename unrelated to its title, and one existing `100755` regular-file mode.
- Load bounded accepted ATX/Setext headings containing escapes, entities, emphasis/strong/strikethrough, code spans, visible link text with destinations, and raw HTML. Prove the shared authoritative parser produces the approved human-readable Title projection, including literal inert raw-HTML text.
- Submit Title-only edits to accepted ATX-H1 and Setext-H1 components using representative Markdown punctuation, entities, code/link-like text, and leading/trailing whitespace. Prove the backend retains the normalized plain Title and the candidate snapshot yields that exact Title; the complete H1 is replaced only when the normalized Title changes; existing heading form is preserved unless round-trip correctness requires otherwise; and the complete frontmatter, exact body bytes, ID, filename, relationships, and regular-file mode are preserved.
- Submit a Description-only edit and prove it replaces the body following the H1 while preserving the complete frontmatter and H1 blocks byte-for-byte, plus the ID, filename, relationships, and regular-file mode.
- Submit an unchanged normalized Title and prove the existing H1 block remains byte-for-byte exact even when its source contains inline Markdown formatting.
- Prove a title change does not rename the component file and that neither edit changes or reorders relationships.
- Prove accepted authoring values originate from the loaded accepted snapshot/its exact accepted tree rather than a second parser or browser reconstruction.

### New components and multi-file pending state

- Add a component through the production backend path and prove it receives a valid generated UUID, a collision-safe creation-time direct `.md` path, minimal closed v1 frontmatter, an ATX H1, the submitted Description body, no outgoing relationships, and mode `100644`.
- Include a bounded filename-collision case without turning filename generation into a naming subsystem.
- Accumulate an accepted-component replacement and a new-component addition in one pending change set, then construct and validate one complete candidate containing both.
- Prove the pending set is bound to the exact store and accepted base. A request made against a different project/store or mismatched loaded base cannot read, mutate, or apply it.
- Prove additional edits update the same multi-file pending set rather than creating one draft per component.
- Send bounded concurrent mutations through the production handler and prove they are applied atomically to the same pending change set without a lost component change or any observable partially constructed candidate. Keep this a focused local-process concurrency test, not multi-user infrastructure.

### One candidate path and exact preservation

- Build the candidate from the exact accepted base tree with real Git plumbing or equivalent real-Git object operations; do not use a working checkout as authority.
- Compare tree entries and blob IDs to prove the manifest and every untouched component are reused exactly.
- Prove only edited and new component sources are serialized, an edited regular mode is preserved, and a new component uses `100644`.
- Validate the complete candidate through the single Architecture-owned construction/validation path and prove it yields one immutable candidate snapshot containing accepted unchanged components plus all pending additions/replacements.
- Prove the same path is used for each candidate-producing backend operation; no preview-only serializer/validator or I2.3-specific alternate path exists.
- Keep validation bounded to the approved v1 structural contract. Do not add prose linting, filename semantics, relationship taxonomy, or a generic schema/validation framework.

### Validation failure and browser reload

- Submit a blank or whitespace-only Title through the production operation as the representative structurally invalid authored value. Prove the backend retains the submitted pending change and useful validation result while producing no valid candidate snapshot from that invalid state.
- Correct the invalid value and prove the same pending change set again produces a complete valid candidate containing all accumulated changes.
- Instantiate/reload a fresh browser client against the same still-running backend and prove it retrieves the backend-held accepted authoring context, pending Title/Description values, and validation state.
- Prove browser reload does not recreate the change set from browser storage and does not claim persistence across backend restart.
- Frontend tests cover Add component, accepted-component editing, Changes in progress, invalid feedback, correction, and same-process reload continuation in language consistent with `docs/ui-v0.md`.

### Authority, local-web, and source-isolation evidence

- Record `refs/heads/accepted`, its exact commit/tree, the loaded accepted snapshot identity/content, and accepted component source before authoring. Prove all remain exact and unchanged after valid submissions, invalid submissions, correction, candidate construction, and browser reload.
- Prove I2.2 creates no successor commit, updates no ref, and exposes no review/commit/accept action. Unreferenced candidate objects, if created, do not become accepted state.
- Record the throwaway source repository's `HEAD`, tracked/untracked status, file list, and content checksums before and after the complete flow; prove they are unchanged.
- Prove no SQLite Architecture projection or pending persistence is introduced. Normal operational association state does not logically change merely because components are authored.
- Retain expected/missing/wrong-origin and no-permissive-CORS coverage for every new browser mutation.
- Run focused uncached Go tests, race tests where applicable, `go vet`, module verification, frontend tests, the production frontend build, and `git diff --check`.

Keep validation proportional. Do not build exhaustive filename/YAML/Markdown matrices, a synthetic candidate conformance system, production fault injection, or I2.3 commit scaffolding.

## Acceptance criteria

The implementation is ready for independent review only when:

- one concurrency-safe backend-owned, in-process pending Architecture change set is bound to one exact store and exact accepted base revision, can coherently contain multiple component additions/replacements, and cannot expose partial mutation or lose concurrent HTTP changes;
- the browser provides structured Title and Description authoring for adding a component and editing an accepted component, while normal UI clearly distinguishes accepted Architecture from Changes in progress;
- the structured Title is the approved plain human-readable inline-text projection of the canonical Markdown H1, submitted/projected Titles are trimmed and non-empty, and canonical serialization parses back to the exact normalized Title without a second encoding or metadata field;
- an unchanged normalized Title or Description-only edit preserves the complete existing H1 bytes; a changed Title replaces the H1 without preserving unexposed inline formatting, preserves ATX/Setext form unless round-trip correctness conflicts, and preserves exact body bytes; neither Title nor Description editing changes ID or relationships;
- every existing-component edit preserves the complete frontmatter block byte-for-byte, plus the accepted component's filename, ID, outgoing relationships, unrelated source, and existing regular-file mode; title changes never rename files;
- a new component receives a generated opaque UUID, collision-safe creation-time direct `.md` filename, minimal closed v1 frontmatter, ATX H1, no relationships, and `100644` mode;
- one complete candidate is constructed from the exact accepted base, reusing every unchanged entry/blob exactly and serializing only changed or new canonical files;
- one Architecture-owned candidate construction/validation path validates the complete result and constructs an immutable candidate snapshot; no separate preview and future-commit semantics exist;
- invalid authored state remains in the backend-held pending change set with useful product-language feedback, accepted state remains untouched, and correction restores a complete valid candidate;
- browser reload against the same running backend retrieves and continues the same submitted pending changes; cross-process recovery is neither implemented nor implied;
- `refs/heads/accepted`, its commit/tree, and the loaded accepted snapshot remain completely unchanged, with no accepted successor commit or ref mutation;
- the accepted-snapshot loader from I2.1 remains the sole accepted-state interpretation path and the browser independently parses no canonical Markdown/frontmatter;
- the source repository remains untouched, expected-origin protection remains effective, and no SQLite Architecture projection/pending persistence is introduced;
- the UI remains a compact WorkBraid authoring surface consistent with `docs/ui-v0.md`, without internal storage/Git terms or component-management/map chrome;
- focused Go, real-Git, HTTP, frontend, production-build, race where applicable, vet, module, and diff checks pass;
- no approved Architecture, UI, planning, packet, or completion document was edited by the worker.

## Explicit exclusions

Do not implement:

- unified diff generation, display, or review;
- successor commit creation or any advancement of `refs/heads/accepted`;
- commit confirmation, acceptance-success handling, pending-change consumption, or post-CAS publication behavior;
- stale-base compare-and-swap handling, reconciliation, automatic rebasing, merging, or overwriting; retaining the exact base identity needed by I2.3 is the only stale-base preparation in scope;
- relationship creation/editing controls, target selection, taxonomy, or graph interaction;
- Markdown rendering, preview, active HTML, remote-resource behavior, or documentation navigation;
- map, graph, layout, selection, viewport, or relationship visualization behavior;
- component deletion, file rename UI, manual filename choice, identity replacement, or raw-frontmatter editing;
- cross-process pending persistence/recovery, a draft database/schema, multiple simultaneous project workspaces, or a general draft lifecycle;
- accepted refresh/reload UI, externally advanced-state reconciliation, repair, reset, reassociation, export/synchronization, proposals, branches/worktrees, history, comparison, or revert;
- SQLite Architecture projection or persisted component/candidate index;
- generic VCS, document, parser, validation, repository/service, persistence, command, undo, or future-vertical abstractions;
- I2.3 implementation or Increment 3 behavior.

## Fresh independent reviewer brief

After the implementation worker finishes, assign one reviewer who did not implement I2.2. Give the reviewer:

- exact completed-I2.1 planning base `6b115142144a11ea3615302a9bc4002f6aad0397`;
- the dispatcher-recorded docs-inclusive I2.2 worker-base SHA;
- the complete worker diff and commit(s);
- this packet and every governing document listed in the worker brief;
- the worker's real-Git candidate, HTTP/frontend, authority, reload, and source-isolation evidence.

The reviewer checks:

1. **Scope:** no diff review, commit/ref mutation, CAS behavior, relationship UI, rendering, map, deletion/rename, cross-process persistence, generic recovery, I2.3, or Increment 3 work entered the diff.
2. **Accepted authority:** I2.1's loader remains the sole accepted-state interpretation, and accepted ref/tree/snapshot remain unchanged throughout authoring and validation.
3. **Pending ownership:** one backend-held change set is bound to the exact store and exact accepted base, supports multiple component changes, survives validation failure and browser reload in-process, cannot leak across projects/bases, and mutates atomically without lost concurrent HTTP changes or partially visible candidates.
4. **Authored semantics:** the shared parser projects H1 inline Markdown to the approved human-readable Title, including literal inert raw HTML; submitted Titles normalize boundary whitespace and round-trip exactly through canonical serialization; unchanged Titles and Description-only edits preserve H1 bytes; changed Titles preserve ATX/Setext form unless round-trip correctness conflicts and do not preserve unexposed inline formatting; the complete frontmatter, exact unaffected body, ID, path, relationships, unrelated source, and file mode remain preserved; title edits do not rename.
5. **Creation semantics:** new IDs are generated and stable, filenames are direct and collision-safe at creation time, source is closed v1 with ATX H1/no relationships, and mode is `100644`.
6. **Candidate integrity:** construction starts from the exact base, reuses unchanged entries/blobs exactly, changes only intended canonical files, and validates the complete candidate before yielding an immutable candidate snapshot.
7. **Single candidate path:** production has one concrete candidate construction/validation interpretation suitable for I2.3 reuse, not parallel preview/commit or browser/backend semantics.
8. **Failure behavior:** invalid authored values and useful validation feedback remain backend-held; no partial candidate is published, accepted state does not change, correction restores a valid complete candidate, and no retry is mislabeled as accepted.
9. **Product surface:** the UI follows `ui-v0.md`, uses component/Title/Description/Changes in progress language, and does not expose frontmatter, UUIDs, filenames, blobs, trees, refs, snapshots, canonical state, or base SHAs in the normal flow.
10. **Boundaries and evidence:** origin/CORS protection and source isolation hold; no SQLite Architecture state appears; real Git/filesystem/SQLite and same-process browser-reload evidence is bounded and green; approved documents remain unchanged.

The reviewer reports actionable findings ordered by severity with file/line evidence. Any material finding returns to the same I2.2 scope for correction and another fresh independent review. Do not begin I2.3.

## Integration procedure

1. Confirm the worker started from the dispatcher-recorded docs-inclusive I2.2 worker-base SHA, used one implementation worktree, and did not edit approved documents.
2. Review the complete I2.2 diff and worker evidence against this packet.
3. Obtain a fresh independent review with no actionable findings.
4. Integrate only I2.2 using conventional commits; do not mix packet/provenance changes, unrelated cleanup, I2.3 preparation, or Increment 3 work into the implementation commit.
5. From the integrated implementation tree, rerun `git diff --check`, uncached Go tests, race tests where applicable, `go vet`, module verification, frontend tests, and the production frontend build.
6. Run the bounded real-Git/HTTP/same-process reload checks and the real human checkpoint below.
7. Record the exact completed-I2.1 planning base, docs-inclusive I2.2 worker base, integrated I2.2 SHA, fresh-review outcome, automated evidence, candidate evidence, accepted-authority evidence, source-isolation result, and human-checkpoint result in this packet's execution record.
8. Stop. I2.3 requires a separate human-approved execution packet and explicit go-ahead.

## Real human checkpoint

Use the built browser UI served by the real Go process, the real compatible Git executable, a real private bare Architecture repository, real SQLite association state, an isolated application-data directory, and a real throwaway source repository. Keep the backend process running throughout the authoring/reload checkpoint; cross-process pending recovery is not under test.

1. Create a throwaway source repository with tracked and untracked files. Record its `HEAD`, status, file list, and content checksums.
2. Start WorkBraid with a fresh isolated application-data directory, initialize the project's empty Architecture, and record the bootstrap accepted revision.
3. Stop WorkBraid. Acting as an authoritative human through ordinary Git, advance `refs/heads/accepted` to a valid v1 accepted revision containing at least two components. Give one component an arbitrary filename and an outgoing relationship so preservation can be verified. Record the exact accepted ref, commit/tree, component blobs/modes, and canonical sources.
4. Start a genuinely new WorkBraid process, open the project through the built UI, and verify I2.1 reconstructs the exact accepted revision and component inventory before any edits.
5. Through structured controls, edit one accepted component's Title and Description, including a Title with representative Markdown punctuation and surrounding whitespace. Verify the UI retains the normalized plain Title, presents it as a change in progress, keeps its accepted identity/relationship implicitly intact, preserves the component's existing ATX or Setext heading form unless round-trip correctness requires otherwise, and does not present the accepted inventory/revision as updated.
6. Add one new component with a Title and Description. Verify both the accepted-component edit and new component coexist in the same Changes in progress surface.
7. Reload the browser page without stopping the backend. Reopen the same project if the normal application flow requires it, and verify WorkBraid retrieves and continues both backend-held changes with their authored values.
8. Submit a blank or whitespace-only Title. Verify useful product-language feedback appears and neither existing pending change is discarded. Reload once more against the same backend and verify the invalid authored value and changes remain available for correction.
9. Correct the Title and verify the complete pending candidate becomes valid again with both component changes still present.
10. Using read-only technical inspection, prove `refs/heads/accepted`, its exact commit/tree and accepted component blobs, and the loaded accepted snapshot revision/content remain identical to the values recorded before authoring. Confirm no successor commit/ref was created and no review/commit/accept action is present.
11. Verify the source repository's `HEAD`, tracked/untracked status, files, and content checksums remain unchanged. Verify the operational association did not logically change and no SQLite Architecture/pending projection was created.

Record **PASS** only if the edit and addition coexist in one backend-owned exact-base change set, browser reload retrieves them from the still-running backend, invalid input remains correctable without loss, correction restores one structurally valid complete candidate, accepted Git and the loaded accepted snapshot remain exact and unchanged, the source repository remains untouched, and the UI stays within the approved product language and I2.2 scope.

## Stop boundary

I2.2 completes only after integration, fresh independent review, automated real-system checks, and the real human checkpoint pass. Stop there. Do not prepare or implement I2.3, diff review, commit/ref advancement, relationship authoring, Markdown rendering, or map behavior without explicit human approval.
