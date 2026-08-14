# Architecture Increment 1 Execution Plan

Status: Approved  
Architecture baseline: `docs/architecture-v0.md`  
Parent plan: `docs/plans/architecture-gate-1.md`  
Scope: Open and initialize a real Architecture store

Architecture changes discovered during implementation require explicit human approval. Bounded implementation details may be decided during implementation when they do not change an approved Architecture invariant.

Execution is sequential with concurrency one. I1.2 must not begin until I1.1 is integrated and its real behavior is checked; I1.3 must not begin until I1.2 is integrated and checked. The malformed-store test matrix remains limited to representative authority and format failures.

## I1.1 — Open a project and report association state

### User-visible outcome

The real browser application launches, accepts an existing local project root, and reports that WorkBraid has no known Architecture-store association without creating one.

### Implementation scope

- Initialize the Go module and React/TypeScript/Vite frontend.
- Run one loopback Go server and serve the built frontend from the same origin.
- Support an isolated configurable WorkBraid application-data root.
- Open SQLite using `database/sql` and `modernc.org/sqlite`.
- Create only the minimal source-root → store-ID association storage, with a uniqueness constraint on the normalized source-root key.
- Add one explicit backend operation for opening and inspecting a source root.
- Normalize an existing directory path lexically for local lookup without resolving symlinks, fingerprinting it, or treating it as durable repository identity.
- Present clear invalid-path, unassociated, and backend-error states.
- Establish a small same-origin boundary for browser operations that mutate local application or filesystem state: accept only the expected WorkBraid origin and expose no permissive CORS behavior.
- Do not invoke Git against the source repository.

Exact endpoint names, Go package layout, and React component organization remain implementation details.

### Acceptance criteria

- The application runs through the real Go-to-browser path.
- Entering an existing unassociated root displays “no association known,” not “no Architecture exists.”
- No private store, store UUID, or association is created merely by opening it.
- Invalid or inaccessible paths fail clearly.
- Browser mutation requests with a missing or unexpected origin are rejected; expected same-origin requests succeed.
- The server emits no permissive CORS policy.
- SQLite contains only operational association data.
- The normalized source-root key cannot be associated with more than one store ID.
- A content and Git-state snapshot of the source repository remains unchanged.

### Validation

- Go integration tests use a temporary source repository and real temporary SQLite database.
- HTTP tests exercise the production handler, expected-origin enforcement, and absence of permissive CORS headers.
- Focused frontend tests cover source-root entry and returned states.
- A manual smoke check uses the built frontend served by Go.

### Deliberately deferred

Initialization, Git-store loading, project discovery, a native directory picker, recent-project lists, reassociation, authentication, and session/security infrastructure.

## I1.2 — Explicitly initialize and load an empty accepted Architecture

### User-visible outcome

From the unassociated state, the user explicitly confirms initialization of a private store and sees an empty Architecture loaded from its bootstrap accepted revision. If initialization was interrupted, the user can retry against the same associated store.

### Implementation scope

- Derive sensible `project.name` and `project.source_hint` defaults from the selected source root and show them in the explicit initialization confirmation; do not require a separate configuration form.
- Generate the store UUID and derive its deterministic private-store location.
- Persist the source-root → store-ID association as part of the explicit initialization action before attempting the Git bootstrap.
- Add the concrete controlled Git runner using direct process execution.
- Create or recognize the bare private repository at the associated deterministic location.
- Serialize the exact closed v1 `architecture.yaml` schema as an ordinary `100644` Git blob and parse it only from an ordinary blob entry, rejecting a symlink, gitlink, or tree at that path.
- Create the bootstrap blob, tree, and commit, then atomically create `refs/heads/accepted`.
- Load the manifest-only accepted tree into an immutable snapshot carrying its exact accepted revision.
- Verify that the manifest store ID matches the operational association.
- Show the valid zero-component Architecture and make its accepted revision inspectable.
- For an associated incomplete store, expose a minimal retry that uses the same store ID and location. Retry must not allocate a replacement, overwrite unrelated state, or become a general repair workflow.

The exact local directory spelling, exact Git command flags, and bootstrap author/message convention remain implementation details. They must satisfy the approved compatibility, isolation, and controlled-Git invariants.

### Initialization and retry boundary

The store becomes initialized only after a valid bootstrap commit exists and `refs/heads/accepted` points to it. Any earlier failure remains incomplete initialization.

Retry is intentionally narrow:

- it follows the existing association to the same store ID and location;
- it may complete missing initialization steps when the existing state is compatible;
- if `accepted` already references a valid v1 manifest whose store ID matches the association, it succeeds by loading that revision and creates no additional bootstrap commit;
- it never silently creates a new store ID or switches locations;
- it fails clearly rather than overwriting conflicting or invalid existing state.

### Acceptance criteria

- Initialization cannot occur without explicit confirmation.
- Confirmation shows derived project-name and source-hint defaults without requiring a configuration form.
- The resulting repository is bare and outside the source repository.
- The bootstrap tree contains exactly an ordinary `100644` `architecture.yaml` blob; `components/` and placeholder files are absent.
- `refs/heads/accepted` points to the valid bootstrap commit, and `HEAD` has no authority over loading.
- The manifest contains supported format/version, the generated store UUID, project name, and source hint.
- The loaded snapshot identifies the exact accepted commit and contains zero components.
- Failure before the accepted-ref update creates no provisional canonical state.
- Retrying an incomplete initialization preserves the original association, store UUID, and location and can complete a representative interrupted bootstrap.
- Retrying when the matching valid bootstrap is already accepted loads its existing commit without creating another commit.
- The source repository remains unchanged.

### Validation

Real-Git integration tests inspect the bare repository, exact bootstrap tree and manifest blob mode/type, closed v1 manifest, accepted ref, and `HEAD` independence. One representative interrupted-bootstrap state is retried successfully using the same store ID and location; another check proves retry loads an already-valid matching accepted commit without creating a second commit. HTTP/frontend tests drive explicit confirmation, incomplete-state display, retry, and the empty accepted view.

### Dependencies

I1.1 integrated and checked.

### Deliberately deferred

Components, pending changes, general repair/recovery, deleting incomplete stores, manual reassociation, export, and custom store locations.

## I1.3 — Restart loading and explicit invalid-store behavior

### User-visible outcome

After stopping and restarting WorkBraid, opening the same source root loads the same exact empty accepted revision. Broken or unsupported stores produce precise visible failures without fallback.

### Implementation scope

- Complete the open-state classification:
  - no association known;
  - associated store absent or incompletely initialized;
  - accepted state invalid or unsupported;
  - valid accepted Architecture.
- On valid open:
  1. look up the associated store ID;
  2. resolve its deterministic private location;
  3. resolve only `refs/heads/accepted`;
  4. read its committed tree;
  5. parse and validate the manifest;
  6. verify the manifest store ID against the association;
  7. construct the complete empty immutable snapshot;
  8. publish the snapshot only after successful validation.
- Expose concise user-facing failures while retaining Git stderr only as diagnostic information.
- Add a focused Increment 1 validation procedure.

### Acceptance criteria

- A new backend process using the same application-data directory loads the exact original accepted commit.
- A missing private-store directory is not silently recreated.
- Representative failures are explicit: missing `accepted`, one malformed/unsupported/unknown-key manifest case, and association/manifest store-ID mismatch.
- No failure falls back to `HEAD`, another ref, SQLite content, or an older revision.
- Initialization is never automatically attempted during open.
- No persisted Architecture projection exists.
- The source repository remains unchanged across initialization, stop, restart, and reload.

### Validation

- Bounded table-driven integration tests create the representative malformed states with real bare Git repositories and ordinary Git object/ref operations.
- A restart test closes backend and database state, creates a new application instance, and verifies the same accepted revision and empty snapshot.
- A manual Increment 1 checkpoint performs an actual process stop/start through the browser application.
- `git diff --check`, Go tests, frontend tests, and the browser smoke check pass.

### Dependencies

I1.1 and I1.2 integrated and checked.

### Deliberately deferred

General repair/recovery, automatic rediscovery, cross-process pending changes, component parsing, map behavior, and the full Gate 1 human workflow.

## Increment 1 completion boundary

Increment 1 is complete only when I1.1, I1.2, and I1.3 have each passed their integration and real-behavior checkpoint in sequence through the browser, backend, SQLite, filesystem, and real Git paths.
