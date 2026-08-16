# Architecture I1.3 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

Parent execution plan: `docs/plans/architecture-increment-1.md`

Completed prerequisite: `docs/plans/architecture-i1.2.md`

Work item: I1.3 — Restart loading and explicit invalid-store behavior

## Execution base

The worker starts from one exact clean revision that contains every approved document it is instructed to read, including the completed I1.2 record and this approved packet.

That revision must be a descendant of integrated I1.2 `84db0d5170d0e24561789ce5f3571def8b779e64`. `84db0d5` is the implementation commit only. It is not the worker base.

The dispatcher records the approved planning-baseline SHA when this packet is committed and gives that SHA to the worker. The worker verifies all of the following before changing code:

- `HEAD` equals the dispatcher-provided SHA;
- the worktree is clean;
- `docs/plans/architecture-i1.2.md` records Status Complete;
- this packet records Status Approved.

After this packet is approved, dispatch exactly one implementation worker from that planning-baseline SHA. After implementation, use a fresh independent reviewer who did not implement the change. Do not begin Increment 2 until I1.3 is integrated, independently reviewed, checked through the real application, and explicitly accepted.

## Worker brief

Read these approved documents first:

- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-1.md`;
- the completed `docs/plans/architecture-i1.2.md` execution record;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, or planning documents. If implementation exposes an Architecture conflict or materially important missing decision, stop and report it rather than silently changing documents or behavior.

Extend the integrated I1.2 application with one narrow vertical slice:

- when the user opens a normalized project folder with no operational link, preserve the existing unlinked behavior and never search for or create Architecture;
- when the folder has an operational source-root → store-ID link, derive its deterministic private location and attempt a read-only load rather than calling initialization/bootstrap completion;
- resolve only `refs/heads/accepted`; `HEAD`, another ref, checkout state, SQLite content, an in-memory snapshot, and older commits are never fallback authorities;
- read the exact committed accepted tree, enforce the already-approved v1 path/object/manifest rules, verify the manifest store ID against the operational link, and construct the immutable zero-component snapshot pinned to that exact commit;
- publish the replacement loaded snapshot only after the entire load and validation succeeds;
- return the exact accepted revision through the backend and show the empty Architecture through the existing browser UI, with the revision available through deliberate technical inspection rather than dominant page chrome;
- classify the bounded associated-store outcomes needed by this increment: missing private location, missing `refs/heads/accepted`, invalid or unsupported manifest, manifest/store-ID mismatch, otherwise-valid component-bearing v1 state unsupported by the current increment, and valid empty accepted Architecture;
- keep normal reopen logically read-only: no Git repository creation, blob/tree/commit creation, ref writes, association create/change, automatic initialization, repair, reset, deletion, store replacement, or persistence of Architecture state may occur;
- do not constrain incidental SQLite/WAL/shm/journal implementation behavior; a reopen that leaves association rows and Architecture application state unchanged is read-only even if the database engine touches WAL or pager files;
- preserve the explicit I1.2 setup/retry operation for its original deliberate setup flow, but do not present setup retry as a general recovery action when a later reopen finds missing, invalid, mismatched, or unsupported accepted state;
- keep failure classification based on explicit SQLite/filesystem/ref/object observations; Git stderr remains diagnostic only and is never parsed as domain state;
- follow `docs/ui-v0.md`: normal UI speaks in project and architecture terms, maps backend classifications to short operator language, and does not expose association, store, manifest, accepted ref, canonical, snapshot, UUID, or Git-object terminology;
- do not show Repair, Reset, Create another, Rebuild, or other actions that do not exist within the approved product boundary;
- allow exact revision or identity information only behind deliberate inspection when useful, never as fallback evidence that a failed load succeeded;
- retain the existing same-origin boundary and no-permissive-CORS behavior;
- leave the user's source repository untouched.

### Restart boundary

Restart evidence must use a genuinely new backend/application instance with the same application-data directory.

The required successful sequence is:

1. normalize and open the source folder;
2. find the operational source-root → store-ID link;
3. derive the deterministic private store location;
4. resolve only `refs/heads/accepted`;
5. read its exact committed tree;
6. parse and validate the supported Architecture state;
7. verify the manifest store ID against the operational link;
8. construct a new immutable snapshot;
9. publish it only after the complete load succeeds.

The exact accepted SHA recorded before shutdown and returned after restart must match. Resetting fields, clearing a snapshot, reusing the same handler/manager/application object, or calling the same process again is not restart evidence.

Focused Go tests may create a first application instance, close its HTTP/database/application resources, and then construct an entirely new instance over the same application-data directory. In addition, the production-path smoke and human checkpoint must terminate the first Go process and start a new process.

### Bounded failure matrix

Use real SQLite/filesystem/Git fixtures to cover only:

1. an associated private store directory that is missing;
2. an associated bare repository with no `refs/heads/accepted`, while `HEAD` or another ref may identify a plausible commit to prove there is no fallback;
3. one representative unsupported or structurally invalid closed-v1 manifest state, preferably an unsupported format version or unknown key;
4. a valid manifest whose store ID does not match the operational link;
5. an otherwise-valid v1 accepted tree containing direct `components/*.md` files.

The fifth state is not malformed. Report it truthfully as unsupported by the current implementation increment. Never ignore the component files and publish an empty snapshot.

Do not expand this into exhaustive object corruption, YAML fuzzing, every path mode, every unknown key, or general Git recovery testing. Existing I1.2 parser/tree tests remain supporting evidence and should not be duplicated into a larger matrix.

All five cases belong in automated real-Git tests. The human checkpoint does not replay this matrix.

### Required focused tests

- Use the real compatible Git executable, real temporary bare repositories, real filesystem state, and real temporary SQLite databases. Do not introduce a fake Git implementation or test-only load authority.
- Prove a complete initialize → close first application instance → create new application instance → open sequence loads the same exact accepted commit and zero-component snapshot from the same application-data directory.
- Add a production-process restart smoke: start the real Go application, initialize through production HTTP paths, record the accepted revision, stop the process completely, start a new process with the same application-data directory, reopen through the production HTTP path, and verify the identical revision.
- Prove normal open of a valid associated Architecture performs no Git object/ref mutation and no logical SQLite or application-state mutation: it must not create or change associations or persist Architecture state. Incidental SQLite WAL, shm, or journal files are not a violation. The load must not depend on bare-repository `HEAD`.
- Exercise the five bounded states above through the concrete loader and production HTTP handler. For each failure, prove no snapshot is published as current and the repository, refs, objects, association rows, and missing paths remain logically unchanged.
- For missing `accepted`, point `HEAD` or another ordinary ref at a valid-looking manifest commit and prove WorkBraid still fails rather than loading it.
- Prove unsupported format/version is not interpreted using current assumptions and manifest/store-ID mismatch never changes the operational link.
- Prove direct otherwise-valid `components/*.md` produces the distinct unsupported outcome, while an empty manifest-only accepted revision still loads.
- Cover focused frontend outcomes for unlinked, valid empty Architecture, missing/unavailable Architecture, incomplete setup, invalid/mismatched state, and unsupported current-version state. Do not add non-existent recovery actions.
- Review every rendered state against `docs/ui-v0.md`; assert human-facing copy does not leak internal storage, ref, manifest, snapshot, UUID, or Git-object vocabulary.
- Retain expected/missing/wrong-origin and no-permissive-CORS coverage for the browser operation.
- Record source-repository `HEAD`, tracked/untracked status, file list, and content checksums before initialization, after shutdown, and after restart/reopen; prove all remain unchanged.

### Explicit exclusions

Do not implement:

- component parsing, component authoring, relationships, pending Architecture changes, candidate diffs, direct accepted commits beyond the existing bootstrap, or map behavior;
- repair, reset, store recreation on open, automatic bootstrap completion on open, store deletion/replacement, general recovery, or generic Git diagnosis;
- fallback to `HEAD`, another ref, an older commit, SQLite Architecture content, a prior loaded snapshot presented as current, or an unaccepted Git object;
- manual reassociation, automatic rediscovery, source fingerprinting, custom store locations, or project-repository export/synchronization;
- watchers, polling, per-read Git ref resolution, persisted Architecture projections, history/revert UI, proposals, branches/worktrees, or merge behavior;
- a generic VCS abstraction, repository/service framework, ORM, migration framework, validation framework, event bus, or future-vertical abstraction;
- Increment 2 or later Gate 1 work.

## Acceptance criteria

The implementation is ready for independent review only when:

- a completely new backend/application instance using the same application-data directory reopens the same project and publishes the exact original accepted revision as an immutable zero-component snapshot;
- normal open follows the required association → deterministic location → accepted ref → committed tree → validation → identity check → snapshot sequence;
- the snapshot is published only after complete success and failures never expose a prior or partial snapshot as current accepted Architecture;
- valid reopen is logically read-only and uses only `refs/heads/accepted`, regardless of `HEAD`, other refs, checkout state, or dangling objects;
- a missing associated private location remains missing, a missing accepted ref remains missing, and neither causes automatic initialization, Git writes, association replacement, or a recovery action in normal UI;
- the bounded unsupported/invalid manifest and store-ID mismatch states fail visibly without fallback or logical mutation;
- otherwise-valid direct component files are reported as unsupported by the current implementation, never malformed and never silently loaded as an empty Architecture;
- the browser immediately presents the valid empty Architecture on reopen and exposes its exact revision only through deliberate details;
- all visible failure states use concise project/architecture language from `docs/ui-v0.md`, disclose no internal machinery in normal UI, and offer no Repair/Reset/Create-another action;
- SQLite remains operational association state only; no persisted Architecture projection or duplicate authority is added;
- the source repository remains unchanged across initialization, full process shutdown, new-process startup, and reopen;
- focused Go, real-Git, process-restart, HTTP, frontend, production-build, vet, race where applicable, module, and diff checks pass;
- no approved Architecture, UI, execution-plan, or completion-record document was edited by the worker.

## Fresh independent reviewer brief

After the implementation worker finishes, assign a reviewer who did not implement I1.3. Give the reviewer:

- the dispatcher-recorded planning-baseline SHA used as the worker base;
- the complete worker diff;
- this packet and the approved Architecture/UI/Increment 1/I1.2 documents;
- the worker's automated, real-Git, and process-restart evidence.

The reviewer checks:

1. **Scope:** no component loading, Increment 2, authoring, pending changes, map, proposal, export, reassociation, or general recovery entered the diff.
2. **Real restart:** evidence uses a new handler/application/database instance and a fully stopped/restarted Go process, never reset in-memory state or a reused application object.
3. **Load order and publication:** the concrete path follows operational link, deterministic location, accepted-only ref resolution, exact committed tree, validation, store-ID check, immutable snapshot, then publication.
4. **Authority:** no `HEAD`, alternate ref, SQLite Architecture data, previous snapshot, dangling object, or older commit becomes fallback accepted state.
5. **Logically read-only open:** valid and failed normal opens create or change no repository, object, ref, association row, or Architecture application state. Incidental SQLite WAL/shm/journal behavior is not a defect.
6. **Bounded failures:** missing location, missing accepted, representative manifest failure, identity mismatch, and component-bearing unsupported state are truthful, distinct where product action differs, and do not trigger repair. Automated tests cover all five; the human checkpoint does not have to.
7. **Component transition:** otherwise-valid direct components are unsupported, not malformed or ignored; component parsing has not entered scope.
8. **Product language:** normal UI follows `docs/ui-v0.md`, internal terminology is absent, technical facts are progressively disclosed, and no invented recovery controls appear.
9. **Source isolation and local web boundary:** source contents/history remain unchanged, expected-origin enforcement remains, and no permissive CORS is introduced.
10. **Implementation shape:** no generic VCS/persistence/validation/recovery/service abstraction, watcher, polling, or speculative machinery appears.
11. **Evidence:** tests use real Git/filesystem/SQLite behavior, the failure matrix remains bounded, the production frontend builds, and approved documents remain unchanged.

The reviewer reports actionable findings ordered by severity with file/line evidence. Any material finding returns to the same I1.3 scope for correction and another fresh independent review. Do not begin Increment 2.

## Integration procedure

1. Confirm the worker started from the dispatcher-recorded planning-baseline SHA, used one implementation worktree, and did not edit approved documents.
2. Review the complete worker diff and evidence against this packet.
3. Obtain a fresh independent review with no actionable findings.
4. Integrate only I1.3 using conventional commits; do not mix packet/provenance changes, unrelated cleanup, or Increment 2 preparation into the implementation commits.
5. From the integrated implementation tree, rerun `git diff --check`, uncached Go tests, race tests where applicable, `go vet`, module verification, frontend tests, and the production frontend build.
6. Run the bounded real-Git/HTTP/process-restart checks and the real human checkpoint below.
7. Record the planning-baseline SHA, integrated I1.3 SHA, independent-review outcome, and human-checkpoint result in this execution record.
8. Stop. Increment 2 requires a separate human-approved execution plan and explicit go-ahead.

## Real human checkpoint

Use the built browser UI served by the real Go process, a real compatible Git executable, a real throwaway source repository, real SQLite association state, and an isolated application-data directory.

The human checkpoint validates product behavior. It does not manually replay the automated corruption matrix.

### Successful restart

This path is mandatory.

1. Create a throwaway source repository with tracked and untracked files. Record its `HEAD`, status, file list, and content checksums.
2. Start WorkBraid process A with a fresh isolated application-data directory, open the project in the browser, and explicitly initialize its empty Architecture through the integrated I1.2 flow.
3. Record the exact accepted revision shown through Technical details and verify it matches `refs/heads/accepted` in the private bare repository.
4. Stop process A completely. Do not reuse its handler, database connection, manager, or in-memory snapshot.
5. Start WorkBraid process B with the same application-data directory and built UI.
6. Open the same project folder. Verify the empty Architecture is reconstructed immediately and the displayed accepted revision exactly matches the revision recorded before shutdown.
7. Verify the source repository's `HEAD`, status, files, and checksums remain unchanged.

### Representative failures

Manually exercise only these two product-semantic cases, using separate isolated fixtures and the real application:

8. Associated store whose `refs/heads/accepted` is missing while `HEAD` or another ref points at a plausible valid commit. Opening the project must fail visibly, must not load the fallback ref as current architecture, and must offer no Repair/Reset/Create-another action.
9. Associated store whose accepted tree is otherwise-valid v1 with direct `components/*.md`. Opening the project must report that this architecture is unsupported by the current product, must not present an empty architecture, and must not parse or display those components.

After each, inspect the fixture with read-only SQLite/filesystem/Git commands and verify missing refs remain missing, existing refs/objects/association rows are unchanged, and no new private store or accepted revision was created. Verify the failure-fixture source repositories remain unchanged.

Record **PASS** only if process B reconstructs the exact original revision and both representative failures remain logically read-only and truthful through production application paths. A failure blocks Increment 2 until the violated invariant is understood and corrected.

## Execution result

Status: Complete — human checkpoint **PASS** on 2026-08-16

- Approved I1.3 planning baseline and worker base: `e554e2247f2be5939501cc57da06809086c4f63b`.
- Integrated I1.2 implementation provenance: `84db0d5170d0e24561789ce5f3571def8b779e64`.
- Integrated I1.3 implementation SHA: `186611b3d4c1d8c35484efb9d8285f95d6eef987`.
- Independent review: PASS with no actionable findings.
- Automated validation: PASS for diff checks, uncached and race-enabled Go tests, Go vet, module verification, 19 frontend tests, production frontend build, the real-process restart smoke, and the five bounded real-Git/SQLite/filesystem/HTTP failure cases.
- Human restart validation: PASS. A completely stopped and newly started WorkBraid process reconstructed exact accepted revision `9869adc903bb7a990e85d200c74c01709cc28697` from the same application-data directory.
- Human representative-failure validation: PASS. Missing `refs/heads/accepted` remained unavailable despite a plausible fallback ref, and an otherwise-valid component-bearing revision was reported as unsupported rather than malformed or empty.
- The successful and failure-fixture source repositories retained their recorded `HEAD`, status, tracked and untracked files, and content checksums. Associations and private Git refs remained logically unchanged during reopen and failure handling.
- Increment 2 was not started.

## Stop boundary

I1.3 completes Architecture Increment 1 only after integration, fresh review, and the real human checkpoint pass. Stop there. Do not begin component loading, Increment 2 planning/implementation, or any later Gate 1 work without explicit human approval.
