# Architecture I1.2 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

Parent execution plan: `docs/plans/architecture-increment-1.md`

Required implementation base: `6497a816f5cd4dde9b3e09536f47ec51a9c9612f`

Work item: I1.2 — Explicitly initialize and load an empty accepted Architecture

After this packet is approved, the dispatcher must give the implementation worker the exact required implementation base above. The worker must verify that base and a clean worktree before changing code. I1.3 must not begin until I1.2 is integrated, independently reviewed, checked through the real application, and explicitly accepted.

## Worker brief

Read these approved documents first:

- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-1.md`;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, or planning documents. If implementation exposes an Architecture conflict or materially important missing decision, stop and report it rather than silently changing the documents or behavior.

Extend the integrated I1.1 application with one working vertical slice:

- from the unlinked project state, offer an explicit initialization action;
- show one simple initialization confirmation containing sensible derived project-name and project-path context; these recovery hints are not settings the user must manage, and initialization must not become a metadata/configuration form;
- do not allocate a store ID, persist an association, or touch Git before the human confirms initialization;
- after confirmation, generate one UUID store ID and attempt to persist the normalized source-root → store-ID association before attempting the Git bootstrap;
- if another association concurrently wins for the same normalized source root, re-read and use that existing association; discard the unpersisted generated identity and do not present or initialize it as though it succeeded;
- derive one deterministic private-store location from that store ID under the configured WorkBraid application-data directory;
- add a narrow concrete Architecture-owned Git runner using the real compatible Git executable through fixed direct process invocations, never a shell;
- run Git non-interactively with operation-relevant identity and configuration supplied explicitly so hooks, signing, editors, pagers, external diff behavior, or user presentation configuration cannot change WorkBraid behavior;
- create or recognize the associated private repository as bare and outside the user's project;
- serialize the exact closed v1 `architecture.yaml` manifest and load it only from an ordinary Git blob entry;
- create a parentless bootstrap commit whose tree contains exactly one `100644` `architecture.yaml` blob, then atomically create `refs/heads/accepted` without overwriting an existing ref;
- treat initialization as successful only after `refs/heads/accepted` references a structurally valid matching bootstrap revision;
- resolve accepted authority only through `refs/heads/accepted`, read the committed tree rather than checkout state, verify the manifest store ID against the operational association, and load one immutable zero-component snapshot pinned to the exact accepted commit;
- show the empty accepted Architecture through the real browser/backend path and make its exact accepted revision inspectable without making the SHA primary page chrome;
- if initialization fails after the association is persisted but before a valid matching accepted revision exists, keep the same associated store ID and deterministic location and present a clear retry action;
- make retry re-observe the association and repository, then either complete compatible missing bootstrap steps or load an already-valid matching manifest-only bootstrap revision;
- never have retry allocate a replacement store ID, switch locations, overwrite unrelated/conflicting state, advance an invalid accepted ref, or silently repair a general malformed repository;
- keep every new browser mutation behind the existing exact expected-origin check and expose no permissive CORS behavior;
- follow `docs/ui-v0.md` explicitly: normal UI speaks in project, architecture, and setup terms and does not surface store, association, bootstrap, manifest, accepted ref/revision, canonical, or UUID terminology; exact Git/identity machinery may appear only behind deliberate inspection/details when it is useful to the current task;
- leave the user's source repository untouched.

The v1 manifest must use the exact field names and types in the Architecture baseline:

```yaml
format: workbraid-architecture
version: 1
store_id: "<generated UUID>"
project:
  name: "<derived non-empty project name>"
  source_hint: "<derived non-empty source hint>"
```

The manifest schema is closed at both levels. Unsupported format/version, unknown keys, invalid field types, invalid UUIDs, empty trimmed recovery hints, a non-blob manifest path, or a manifest/association store-ID mismatch must not be loaded as valid Architecture.

I1.2 initializes and loads only its manifest-only empty bootstrap revision. If it encounters an accepted tree containing otherwise-valid v1 `components/*.md`, it must neither call that tree format-invalid nor silently ignore the components and present an empty Architecture. It may fail clearly as unsupported by this implementation increment until component loading arrives. Do not implement component parsing here.

Keep failure classification based on explicit ref/object/filesystem observations. Git stderr is diagnostic only and must not be parsed as Architecture state. Exact Git commands and flags, deterministic directory spelling, commit identity/message, UUID library, Go package layout, HTTP operation names, and React component structure remain bounded implementation details as long as the approved invariants above remain true.

### Required focused tests

- Use the real Git executable, real temporary bare repositories, real filesystem state, and a real temporary SQLite database. Do not add a fake Git implementation or test-only Architecture transition path.
- Prove opening an unlinked folder still creates no association, store ID, or private repository; initialization begins only after explicit browser/API confirmation.
- Prove the confirmation displays derived, non-empty project-name and project-path context without presenting a metadata/configuration form.
- Prove a concurrent association winner is re-read and used, while the losing generated identity creates no association or private repository and is never reported as successful.
- Prove a successful initialization creates one association and one deterministic bare repository outside the source repository.
- Inspect the bootstrap with Git object/ref commands and prove:
  - `refs/heads/accepted` identifies the loaded revision;
  - the bootstrap commit is parentless;
  - its complete tree contains only `architecture.yaml`;
  - that path is an ordinary `100644` blob;
  - `components/` and placeholder paths are absent;
  - the parsed manifest has the exact closed v1 shape and matching store UUID;
  - changing or leaving the bare repository's `HEAD` unrelated does not change accepted loading.
- Prove the loaded snapshot is immutable application state pinned to the exact accepted commit and contains zero components.
- Induce one representative real filesystem/Git failure after the association write but before accepted-ref creation. Prove the association remains, then retry after making the same location compatible and prove the original store ID/location are reused.
- Prove retry against an already-valid matching manifest-only bootstrap revision loads that exact commit and creates no second bootstrap commit.
- Cover a bounded representative incompatible/invalid case and prove retry fails clearly without overwriting the existing ref or repository state. Include association/manifest store-ID mismatch in the bounded validation.
- Prove an otherwise-valid v1 tree containing `components/*.md` is reported clearly as unsupported by this increment rather than format-invalid or loaded as an empty Architecture.
- Prove an unaccepted commit object or manifest blob does not become canonical state when accepted-ref creation fails.
- Exercise initialization and retry through production HTTP handlers, including expected, missing, and wrong origins and absence of permissive CORS headers.
- Cover focused frontend states: confirmation, initializing, successful empty accepted view, failed/incomplete initialization with retry, and clear invalid/conflicting failure.
- Review rendered copy against `docs/ui-v0.md` and prove normal states do not leak internal storage, Git-authority, or UUID terminology; deliberate revision/identity inspection may expose exact technical facts only on request.
- Record the source repository's `HEAD`, tracked/untracked status, file list, and content checksums before and after initialization and retry; prove they are unchanged.

Keep malformed-store coverage representative. Do not grow I1.2 into the complete invalid-store/restart matrix owned by I1.3.

### Explicit exclusions

Do not implement:

- components, component parsing, component authoring, relationships, pending Architecture change sets, candidate diffs, commits after bootstrap, or maps;
- restart reconstruction or the complete open-state classification assigned to I1.3;
- proposal refs, branches, worktrees, proposal review, or merge behavior;
- project-repository export/synchronization or source inference;
- manual reassociation, automatic store rediscovery, source fingerprinting, custom store locations, store deletion, or a general repair/recovery flow;
- a permanent working tree, checkout synchronization, persisted Architecture projection, registry, placeholder component, or `components/` scaffolding;
- authentication, sessions, broad CSRF/security infrastructure, permissive CORS, or remote access;
- a generic VCS abstraction, Git library, ORM, migration framework, validation framework, repository/service framework, or future-vertical abstraction;
- I1.3 or later Gate 1 work.

## Acceptance criteria

The implementation is ready for independent review only when:

- opening an unlinked project remains read-only and initialization requires deliberate human confirmation;
- the simple confirmation shows sensible derived project-name and project-path context without turning either into required settings;
- normal UI uses project/architecture/setup language and keeps internal store, association, bootstrap, manifest, canonical, ref/revision, and UUID terms behind deliberate inspection when useful;
- one UUID store ID is associated before bootstrap work and determines one private location under WorkBraid application data;
- a concurrent association winner is adopted by re-reading the existing association; no losing generated identity is persisted, initialized, or presented as successful;
- the private repository is bare and outside the source repository;
- initialization succeeds only when a valid matching bootstrap commit is referenced by `refs/heads/accepted`;
- the accepted bootstrap tree contains exactly one ordinary `100644` `architecture.yaml` blob and no `components/` or placeholder path;
- the manifest is the supported closed v1 shape, contains the associated store UUID, and carries non-empty human recovery hints;
- accepted loading ignores `HEAD` and checkout state, verifies the associated store ID, and produces an immutable exact-revision snapshot with zero components;
- failure before accepted-ref creation leaves no provisional canonical state;
- an incomplete initialization remains associated with its original store ID/location and a deliberate retry can complete one compatible interrupted state;
- retry of an already-valid matching manifest-only bootstrap revision loads it without creating another bootstrap commit;
- invalid, mismatched, or conflicting state fails clearly without fallback, overwrite, replacement allocation, or general repair;
- an otherwise-valid component-bearing v1 tree is neither called format-invalid nor silently presented as empty; it fails clearly as unsupported by this increment;
- the successful browser view shows the empty accepted Architecture and allows inspection of its exact accepted revision;
- all new mutation operations enforce the expected origin and emit no permissive CORS policy;
- SQLite contains only the operational source-root → store-ID association and no canonical or projected Architecture;
- the source repository's files, status, and history remain unchanged;
- focused Go, frontend, real-Git, HTTP, production-build, vet, and diff checks pass;
- no approved Architecture, UI, or planning document was edited by the worker.

## Fresh independent reviewer brief

After the worker finishes, assign a reviewer who did not implement I1.2. Give the reviewer:

- required base SHA `6497a816f5cd4dde9b3e09536f47ec51a9c9612f`;
- the complete worker diff;
- this packet and the approved Architecture/Increment 1 documents;
- the worker's automated and real-Git evidence.

The reviewer checks:

1. **Scope:** no component, pending-change, map, proposal, export, restart/I1.3, reassociation, or general-repair work entered the diff.
2. **Authority:** only `refs/heads/accepted` makes the bootstrap canonical; no `HEAD`, checkout, SQLite, in-memory, or “created by WorkBraid” flag competes with it.
3. **Initialization boundary:** no store ID/association/Git state exists before confirmation; after confirmation the association precedes bootstrap, and success occurs only at a valid accepted ref.
4. **Manifest/store contract:** the accepted tree and closed v1 manifest exactly satisfy the approved path, type, mode, identity, recovery-hint, and zero-component rules.
5. **Retry:** the original association, UUID, and deterministic location are reused; valid accepted state is loaded idempotently; invalid/conflicting state is not overwritten or silently repaired.
6. **Git execution:** real direct Git process calls use fixed operations and a controlled non-interactive environment; browser input cannot become Git arguments; stderr is not parsed for domain decisions.
7. **Snapshot/loading:** the empty snapshot is immutable and pinned to the exact accepted commit; store-ID mismatch and non-blob/unsupported state cannot load.
8. **Operational boundary:** SQLite contains only the association; no persisted Architecture projection or second canonical authority was added.
9. **Source isolation and web boundary:** the source repository is unchanged, stores stay outside it, new mutations enforce the expected origin, and no permissive CORS appears.
10. **Implementation shape:** no generic VCS/persistence/validation/service abstraction or speculative future machinery was introduced.
11. **Evidence:** tests use real Git/filesystem/SQLite behavior, the malformed matrix is bounded, the production frontend builds, and approved documents are unchanged.
12. **Product language and UX:** the simple confirmation treats derived name/path as context rather than settings, normal UI follows `docs/ui-v0.md`, internal storage/Git/identity terminology is progressively disclosed, and component-bearing v1 trees are neither mislabeled invalid nor silently ignored.

The reviewer reports actionable findings. Any material finding returns to the same I1.2 scope for correction and a fresh review. Do not begin I1.3.

## Integration procedure

1. Confirm the worker started from exactly `6497a816f5cd4dde9b3e09536f47ec51a9c9612f` and did not edit approved documents.
2. Review the complete diff and worker evidence against this packet.
3. Obtain a fresh independent review with no actionable findings.
4. Integrate only I1.2 onto the required base using a conventional commit; do not mix unrelated changes or I1.3 preparation.
5. From the integrated tree, rerun `git diff --check`, uncached Go tests, Go race tests where applicable, `go vet`, frontend tests, and the production frontend build.
6. Run the bounded real-Git integration checks and the real human checkpoint below.
7. Record the required base SHA, integrated I1.2 SHA, independent-review outcome, and human-checkpoint result.
8. Stop. I1.3 requires a later explicit go-ahead.

## Real human checkpoint

Use the real built browser UI served by the Go process, a real compatible Git executable, an isolated application-data directory, and a real throwaway source repository.

### Successful initialization

1. Create the throwaway source repository with tracked and untracked files. Record its `HEAD`, status, file list, and content checksums.
2. Launch WorkBraid with a fresh isolated application-data directory and open the project through the browser.
3. Confirm the project is not linked and that opening it created no association, UUID, or private repository.
4. Choose initialization and verify the confirmation shows sensible derived project-name and project-path context without presenting a settings form.
5. Cancel once and verify nothing was allocated or persisted; reopen the confirmation and deliberately confirm.
6. Verify the application shows an empty accepted Architecture and makes the exact accepted revision inspectable.
7. Inspect the operational association and private repository with read-only SQLite, filesystem, and Git commands. Verify:
   - the associated UUID matches the manifest;
   - the location is deterministic from that UUID and outside the source repository;
   - the repository is bare;
   - `refs/heads/accepted` points to the displayed revision;
   - the root commit has no parent;
   - the complete accepted tree is only a `100644 blob` at `architecture.yaml`;
   - the manifest has the exact closed v1 fields and human-readable recovery hints;
   - no `components/`, placeholder, checkout, or SQLite Architecture projection exists.
8. Verify the source repository's recorded `HEAD`, status, files, and checksums are unchanged.

### Same-store retry

9. In a second isolated run, use a fresh application-data directory and source repository. Induce one real interruption after the association write but before accepted-ref creation using an environment-appropriate filesystem/Git setup. Temporarily making the private-store container non-writable while leaving SQLite writable is one option when reliable; it is not a product requirement.
10. Confirm initialization through the browser. Verify it fails clearly after retaining exactly one source-root → store-ID association and before creating accepted canonical state. Do not add production fault-injection machinery to make this checkpoint convenient.
11. Record the associated store UUID and deterministic location, remove the external failure condition, and choose Retry in the application.
12. Verify retry uses that same UUID and location, creates a valid bootstrap accepted revision, and loads the empty Architecture. Verify no replacement association/store and no second bootstrap commit were created.
13. Verify the second source repository is also unchanged.

Record **PASS** only if both flows use production application operations and real authorities. A failure blocks I1.3 until the violated invariant is understood and corrected.

## Execution result

Status: Complete — human checkpoint **PASS** on 2026-08-16

- Architecture planning baseline: `87060260dc8975bdcb2e89d0a3c30c978b2d103d`.
- Integrated I1.1 implementation base: `6497a816f5cd4dde9b3e09536f47ec51a9c9612f`.
- Approved I1.2 packet commit: `8b3d69bd59ee801abc6dc29e4eb073910bc5814b`.
- Integrated I1.2 implementation SHA: `84db0d5170d0e24561789ce5f3571def8b779e64`.
- Independent review: initial reviews found and reproduced an accepted empty `components` tree and YAML scalar type coercion; both were corrected with real-Git and production-HTTP regression coverage. The final fresh review reported no actionable findings.
- Automated validation: PASS for diff checks, uncached and race-enabled Go tests, Go vet, module verification, 16 frontend tests, production frontend build, and bounded real Git/SQLite/filesystem/HTTP checks.
- Successful-setup accepted revision: `f7f6b16c9f15d341e80954097e7d16b4a970b47e`.
- Interrupted-setup retry accepted revision: `5aed83361df656513566f1133d832870a944878e` using the original associated store ID and location.
- Both human-checkpoint source repositories retained their recorded `HEAD`, status, files, and content checksums.
- I1.3 was not started.

## Stop boundary

I1.2 is complete only after integration, fresh review, and the real human checkpoint pass. Stop there. Do not begin restart loading, the complete invalid-store matrix, or any I1.3 work without explicit human approval.
