# Architecture I1.1 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

Parent execution plan: `docs/plans/architecture-increment-1.md`

Work item: I1.1 — Open a project and report association state

The dispatcher must give the implementation worker the exact planning-baseline commit containing this packet. The worker must implement only I1.1 from that revision. I1.2 must not begin until I1.1 is integrated, independently reviewed, checked through the real application, and explicitly accepted.

## Worker brief

Read these approved documents first:

- `docs/architecture-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-1.md`;
- this execution packet.

Treat them as authoritative. Do not edit any approved Architecture or planning document. If implementation reveals an Architecture conflict or materially important missing decision, stop and report it rather than silently changing the documents or behavior.

Implement one minimal working vertical slice:

- a local Go process bound to loopback;
- a React/TypeScript/Vite browser UI served by that Go process from the same origin when using the built frontend;
- a configurable WorkBraid application-data directory containing `workbraid.db`;
- SQLite accessed through `database/sql` and `modernc.org/sqlite`;
- only the minimal source-root → store-ID association storage, with a uniqueness constraint on the normalized source-root key;
- one explicit JSON backend operation for opening and inspecting a source root;
- a browser flow where the user enters an existing project-folder path and WorkBraid reports whether it is linked to architecture;
- lexical normalization for the association lookup key without resolving symlinks, fingerprinting the repository, or treating the path as durable repository identity;
- clear loading, linked/not-linked, invalid-path, and backend-error states in human language rather than backend sentinel text;
- a small same-origin boundary for the browser operation: compare its `Origin` with the server's expected loopback UI origin, reject a missing or unexpected origin, and expose no permissive CORS behavior;
- no Git invocation against the source repository and no source-repository writes.

Relative paths are rejected explicitly. They must not be resolved against the backend's working directory.

Trim pasted paths before validation and lookup so surrounding whitespace does not turn a valid full path into a misleading error.

The not-linked result must use wording equivalent to: “WorkBraid has not linked this folder to architecture yet.” It reports only the lookup and must not claim that no private store exists.

Exact endpoint names, Go package layout, frontend component layout, configured environment/flag names, and other bounded details remain implementation choices. Keep them concrete and minimal.

### Required tests

- Use a real temporary SQLite database and real filesystem state.
- The test harness may create a real temporary Git source repository, but application code must not invoke Git or modify it.
- Prove that a fresh database reports an existing absolute root as unassociated without inserting an association.
- Pre-seed one association and prove lookup returns it.
- Prove the normalized source-root uniqueness constraint prevents two store IDs for the same key.
- Cover relative, nonexistent, and non-directory paths.
- Cover surrounding path whitespace and prove the trimmed full path is used.
- Cover expected, missing, and unexpected `Origin` values and verify that no permissive CORS header is emitted.
- Cover the focused frontend states and build the production frontend.
- Record enough source-repository state to prove the application leaves its files, tracked/untracked status, and `HEAD` unchanged.

### Explicit exclusions

Do not implement:

- store initialization or UUID allocation;
- private Git repositories, Git runners, or manifest handling;
- initialization UI, placeholders, or disabled future controls;
- directory discovery, native file picking, or recent-project lists;
- reassociation;
- authentication, sessions, CSRF-token infrastructure, or general security middleware;
- a backend framework, ORM, generic repository/service layer, migration framework, or future-vertical abstraction;
- I1.2 or any later work.

## Acceptance criteria

The implementation is ready for independent review only when:

- the built UI is served by the Go process on loopback through one origin;
- an existing absolute directory can be submitted through the browser;
- every relative path is rejected rather than resolved against backend process state;
- a fresh database reports the folder as not linked yet without claiming that no store exists;
- opening it creates no association row, store UUID, private repository, or source-repository file;
- nonexistent and non-directory paths produce clear errors;
- a pre-seeded association is read through the real SQLite lookup;
- the uniqueness constraint prevents multiple store IDs for the same normalized source-root key;
- expected-origin requests succeed, while missing or unexpected origins receive `403`;
- responses contain no permissive `Access-Control-Allow-Origin` behavior;
- SQLite contains only operational association storage;
- backend tests, frontend tests, the frontend production build, and applicable Go vet/test checks pass;
- source files, tracked and untracked status, and `HEAD` remain unchanged;
- no approved Architecture/planning document was edited.

## Fresh-reviewer step

After the implementation worker finishes, assign a fresh reviewer who did not implement the change. The reviewer receives the exact baseline SHA, the worker diff, and this packet.

The reviewer checks:

1. scope: no initialization, Git-store, component, map, I1.2, or future-vertical code;
2. authority: SQLite contains only the operational association and no canonical Architecture state;
3. source isolation: application code only validates the supplied root and performs no writes or Git operations there;
4. path behavior: relative paths are rejected and lexical normalization does not resolve symlinks or fingerprint repositories;
5. local-web boundary: the expected origin is not reflected from request input, missing/unexpected origins fail, and no permissive CORS behavior exists;
6. structure: no speculative framework, generic interface, migration system, or future abstraction;
7. evidence: tests exercise real SQLite/filesystem behavior and the production frontend builds;
8. documentation integrity: approved Architecture/planning documents are unchanged.

The reviewer reports actionable findings. Any material finding returns to the same I1.1 implementation scope for correction and fresh review. Do not begin I1.2.

## Integration and human checkpoint

Integrate I1.1 only after the fresh review is clear and automated checks pass. Then perform this real checkpoint:

1. Create a throwaway Git repository containing tracked and untracked files.
2. Record its `HEAD`, `git status --short`, file list, and content checksums.
3. Launch WorkBraid with a fresh temporary application-data directory.
4. Open the built browser UI through the Go server.
5. Submit the repository's full folder path.
6. Confirm the UI says the folder is not linked yet and does not imply that no private store exists.
7. Attempt a relative path and confirm it is rejected.
8. Confirm application data contains SQLite operational state but no private Architecture repository, store UUID, or association row created by opening.
9. Submit a nonexistent path and a regular-file path and confirm clear errors.
10. Confirm focused HTTP checks reject missing/wrong origins and accept the real UI origin without permissive CORS behavior.
11. Confirm the source repository's recorded `HEAD`, status, files, and contents are unchanged.

Stop after reporting the checkpoint result. I1.2 requires a later explicit go-ahead.
