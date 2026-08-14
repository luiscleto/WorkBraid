# Architecture Gate 1 Implementation Plan

Status: Approved  
Architecture baseline: `docs/architecture-v0.md`  
Target: Architecture v0 First Real Gate

Architecture changes discovered during implementation require explicit human approval rather than silent changes to this plan or the Architecture baseline.

This document is the historical implementation plan for Architecture Gate 1. It should not be rewritten into later plans.

The minimum credible path is four sequential vertical increments. Each produces working behavior; none exists solely as scaffolding. No unresolved Architecture-domain decision blocks this plan.

## Bounded technology choices

- **Backend:** Go standard library HTTP server with explicit JSON operations. No web framework, ORM, generated API layer, or generic repository abstraction. Browser mutations accept only the expected WorkBraid origin, and the server exposes no permissive CORS behavior; this remains a minimal local-web boundary rather than authentication or session infrastructure.

- **Frontend:** React + TypeScript built with Vite. React fits the coordinated editor, review, documentation, and map state; Vite provides a small production build without imposing an application framework. No router or global state library initially. [React's official guidance identifies Vite as a suitable build tool for from-scratch React applications](https://react.dev/learn/build-a-react-app-from-scratch).

- **Map:** Cytoscape.js used directly, without a React-specific wrapper. Its built-in layouts and interaction support cover automatic layout, selection, pan, zoom, and fit without turning the map into an editing canvas. Start with its built-in CoSE layout, which tolerates cyclic graphs. [Cytoscape.js documentation](https://js.cytoscape.org/).

- **Authoring:** A structured title input, structured outgoing-relationship controls, and a native Markdown `<textarea>`. A richer editor would add substantial integration and selection-state complexity without helping Gate 1.

- **Markdown rendering:** `react-markdown` with `remark-gfm`, without `rehype-raw`. Disable automatic rendering/fetching of embedded remote resources; render raw HTML inertly; allow normal links only through deliberate user activation. [react-markdown](https://github.com/remarkjs/react-markdown).

- **Authoritative Markdown parsing:** Goldmark in Go, configured only for tables, task lists, strikethrough, and autolinking. Its AST is used for the required first-block H1 and structural checks. Goldmark is CommonMark-compliant and supplies those extensions individually. [Goldmark](https://github.com/yuin/goldmark).

- **YAML:** `go.yaml.in/yaml/v4`, the maintained Go YAML module recommended for new work. Frontmatter splitting remains small Architecture-owned code rather than a generalized document framework. [Go YAML](https://github.com/yaml/go-yaml).

- **SQLite:** `database/sql` with `modernc.org/sqlite`, avoiding CGO and an ORM. The initial database contains only operational association state—no Architecture projection. [modernc SQLite driver](https://pkg.go.dev/modernc.org/sqlite).

- **Git:** A narrow concrete Architecture-owned runner around `os/exec.CommandContext`, invoking a compatible Git executable directly with fixed arguments and controlled configuration.

  - Bootstrap and candidate state use Git plumbing operations.
  - Candidate files are written as blobs and assembled into a tree through a temporary index.
  - Review uses a predictable tree-to-tree unified diff with external diff, text conversion, color, and pagers disabled.
  - Confirmation creates the commit with `commit-tree`, then advances `refs/heads/accepted` with `update-ref <new> <expected-old>`.
  - A failed update is classified by re-reading the ref, never by parsing stderr.
  - WorkBraid-mediated commits use an explicit local application identity and generated concise messages; they do not depend on global signing, author, editor, hook, or presentation configuration.

  These operations directly support the approved CAS and commit-authority model. [git-commit-tree](https://git-scm.com/docs/git-commit-tree), [git-update-ref](https://git-scm.com/docs/git-update-ref), [git-diff-tree](https://git-scm.com/docs/git-diff-tree).

- **Testing:** Go's standard test facilities with actual temporary bare repositories, actual Git subprocesses, temporary files, and temporary SQLite databases. React Testing Library/Vitest cover focused browser components. One Playwright production-path smoke test supports—but does not replace—the human gate. Playwright can launch the real application server as part of a browser test. [Playwright web-server testing](https://playwright.dev/docs/test-webserver).

## Increment 1: Open and initialize a real Architecture store

Detailed execution plan: [Architecture Increment 1 Execution Plan](architecture-increment-1.md).

### Purpose / user-visible capability

The user can launch WorkBraid, open a real local source-repository root, see that no association is known, explicitly initialize a private Architecture store, retry an interrupted initialization against that same store, and reopen the same empty accepted Architecture after restarting the application.

### What it introduces

- Minimal Go process serving the initial React UI from one local origin.
- Configurable WorkBraid application-data root, primarily to isolate tests.
- Existing-directory source-root entry and lexical operational path normalization without symlink resolution or fingerprinting.
- Minimal SQLite source-root → store-ID association with a uniqueness constraint on the normalized source-root key.
- Deterministic private store location derived from the store UUID.
- Sensible project-name and source-hint defaults derived from the selected source root and shown during explicit initialization confirmation.
- Controlled Git command runner and bare-repository initialization.
- `architecture.yaml` creation as an ordinary `100644` Git blob and parsing that rejects symlinks, gitlinks, or trees at canonical file paths.
- Bootstrap commit and atomic creation of `refs/heads/accepted`.
- Minimal retry of an associated incomplete initialization using the same store ID and deterministic location.
- Empty immutable accepted snapshot.
- UI states for absent association, initializing, valid store, incomplete/invalid store, and load failure.
- Expected-origin enforcement for browser mutation operations without permissive CORS or broader authentication/session machinery.

### Architecture v0 invariants exercised

- The source repository remains untouched.
- Missing association does not imply that no private store exists.
- Initialization is explicit.
- The store ID, not the source path, identifies the store.
- Initialization succeeds only when a valid bootstrap commit is referenced by `accepted`.
- The bootstrap contains only an ordinary `100644` `architecture.yaml` blob; zero components is valid.
- Only `refs/heads/accepted` defines accepted Architecture.
- Unsupported format/version and invalid accepted state fail clearly.
- SQLite contains operational association state, not canonical Architecture.

### Acceptance criteria

- Opening an unassociated source root never silently creates a store.
- Explicit initialization creates a bare private repository with one manifest-only bootstrap commit and `accepted` pointing to it.
- Initialization confirmation uses derived project-name and source-hint defaults without requiring a separate configuration form.
- Retrying an incomplete initialization uses its existing association, store ID, and location and never silently allocates a replacement store.
- If retry finds an already-valid `accepted` manifest whose store ID matches the association, it loads that revision successfully rather than creating another bootstrap commit.
- The manifest contains its stable store ID plus human-readable project association hints.
- No `components/` directory or placeholder files are required.
- Restarting WorkBraid resolves the SQLite association, verifies the manifest store ID, and loads the same exact accepted commit.
- Absent, incomplete, and invalid stores produce distinct visible outcomes.
- Browser mutation requests with a missing or unexpected origin are rejected, and no permissive CORS policy is exposed.
- The source repository's tracked and untracked contents and Git revision remain unchanged.

### Real validation

Focused automated tests use an actual Git executable, temporary bare repositories, temporary source repositories, and temporary SQLite databases. They cover successful initialization, one representative interruption before the ref update followed by same-store retry, representative store-ID/format/authority failures, expected-origin enforcement, and restart. The malformed-store matrix remains intentionally bounded.

A short browser smoke check exercises initialization through the real HTTP and Git paths. It is not yet the product gate.

### Dependencies

None. Repository and application setup are part of this increment.

### Deliberately deferred

Manual reassociation after SQLite loss, automatic rediscovery, repository fingerprinting, custom store locations, export, packaging, authentication, and any Architecture projection in SQLite.

## Increment 2: Create, review, and commit component changes

### Purpose / user-visible capability

A human can create or edit Architecture Components through structured controls, inspect the complete exact candidate diff, and deliberately advance accepted Architecture.

### What it introduces

- Backend-owned, in-process pending Architecture change sets based on exact accepted commits.
- Generated immutable UUID component IDs.
- One Markdown file per component with YAML frontmatter, required H1 title, and Markdown body.
- A stable creation-time filename derived from the title with collision handling; title edits never rename it.
- Closed v1 component-frontmatter parsing and non-recursive `components/*.md` discovery.
- Complete candidate-tree construction that reuses unchanged base-tree entries/blobs exactly, preserves an edited regular file's mode, and creates canonical files as `100644` blobs.
- Minimal structural validation across the complete candidate state.
- Exact base-tree-to-candidate-tree unified diff.
- Confirmation flow with current-ref check, commit creation, and atomic CAS ref advancement.
- Exact accepted commit identity and parent diff after success.
- Structured title field and Markdown body authoring.
- Backend retention of the pending change set after validation or commit failure while the process remains running.

Internally, a change set holds a collection of file additions/replacements even if the first UI edits only one component at a time. It therefore does not encode “one draft equals one component.”

### Architecture v0 invariants exercised

- Component identity survives title and body edits.
- Files are self-identifying; there is no registry.
- The required H1 is canonical title and is not duplicated in frontmatter.
- A usable title is non-empty after trimming; load accepts CommonMark ATX or Setext H1, while WorkBraid creates ATX H1.
- Filename generation occurs only at creation; load accepts any filename matching the v1 discovery rule.
- Accepted Git state is unchanged until the deliberate commit succeeds.
- Candidate state is fully constructed and validated before confirmation.
- The reviewed diff includes all canonical changes.
- CAS prevents stale drafts from overwriting newer accepted state.
- A failed ref update leaves the prior accepted revision authoritative.
- Successful commits replace the loaded immutable snapshot.
- Unrelated Markdown/frontmatter is not gratuitously rewritten.

### Acceptance criteria

- A component can be created, reviewed, committed, and loaded from the resulting accepted tree.
- Editing its title or body preserves both its component ID and filename.
- The complete unified diff is visible or expandable before confirmation.
- Blank titles, malformed metadata, duplicate IDs, and malformed component files block confirmation.
- Symlinks, gitlinks, or trees at canonical manifest/component paths are rejected; regular-file modes are preserved when editing.
- Relationship targets resolve against the complete candidate revision before commit.
- Validation failure retains the pending change set in the backend; a browser reload while the backend remains alive can retrieve and continue that submitted change set.
- Advancing `accepted` externally after the pending change's base was established causes the WorkBraid commit to fail stale without changing accepted state.
- Successful confirmation exposes the new commit identity and parent diff.
- A backend-level test proves one candidate change set can modify multiple component files coherently.

### Real validation

Real-Git integration tests cover candidate tree construction, exact diffs, validation failures, unreferenced objects, successful CAS, and a deliberately raced CAS failure. HTTP and focused React tests cover editing, review opportunity, confirmation, and retained failure state.

The behavior is also exercised manually through the running application, but this is not yet the complete Gate 1 run.

### Dependencies

Increment 1.

### Deliberately deferred

Persistence across backend restart, deletion, manual file rename, raw-frontmatter editing, deliberate identity replacement, semantic diffs, history browsing, revert, proposals, and proposal acceptance.

## Increment 3: Add relationships, safe documentation, and the accepted map

### Purpose / user-visible capability

The user can create a tiny connected Architecture, read its documentation, navigate it through an interactive accepted-state map, and refresh after external accepted-branch changes.

### What it introduces

- Structured outgoing-relationship controls.
- Target selection by stable ID, displayed primarily by title with filename or shortened ID context when titles collide.
- Multiple source-to-target relationships with independent free-text labels.
- Safe Markdown rendering for the approved syntax.
- Cytoscape.js accepted-revision projection with automatic layout, selection, pan, zoom, and fit.
- Component documentation inspector/navigation.
- Projection-only edge keys so parallel relationships remain distinct without acquiring domain IDs.
- Explicit refresh/reload of `accepted`.
- Stale/non-current read-only state if a refreshed accepted revision is invalid.

### Architecture v0 invariants exercised

- Relationships are source-owned authored facts with implied source IDs.
- Targets are stable component IDs; labels are free text.
- Multiple edges and cycles are valid.
- All targets must resolve within the complete revision being validated: accepted on load and candidate before commit.
- Markdown links never create Architecture relationships.
- Raw HTML and fenced code acquire no active semantics.
- Rendering causes no automatic arbitrary network or file access.
- Map, documentation, and relationship resolution come from one immutable accepted snapshot.
- Draft topology never appears on the first-slice map.
- Invalid externally advanced accepted state never causes silent fallback.
- Selection, layout, and viewport remain non-canonical UI state.

### Acceptance criteria

- Two or more components and their relationships can be authored, diff-reviewed, and committed.
- Cycles and multiple labeled relationships between the same pair survive load and are inspectable in the UI.
- Duplicate component titles can be disambiguated during target selection.
- The accepted map shows all components and relationships from its pinned revision.
- Selecting a map component focuses its accepted documentation.
- Pending relationship changes do not affect the map until committed.
- Tables, task lists, strikethrough, and autolinks render.
- Raw HTML remains inert, fenced code does not execute, and remote embedded resources are not fetched automatically.
- A valid external advancement is adopted only after explicit refresh.
- An invalid external advancement leaves the previous snapshot visibly stale and read-only, with direct commit disabled.

### Real validation

Focused parser fixtures cover the approved Markdown subset and component contract. React tests cover relationship selection, duplicate titles, draft-versus-accepted presentation, safe rendering, and map-to-document navigation.

Real-Git integration tests advance `accepted` externally to both valid and invalid commits and verify refresh behavior. A browser test confirms the map and documentation operate through the backend snapshot rather than duplicated frontend parsing of canonical state.

### Dependencies

Increments 1 and 2.

### Deliberately deferred

Graphical editing, draft topology preview, manual or persisted layout, grouping, hierarchy, semantic diffs, remote media policy, source inference, runtime/planning overlays, and relationship IDs or taxonomy.

## Increment 4: Assemble and pass the real Gate 1 workflow

### Purpose / user-visible capability

The complete Architecture slice runs as the real WorkBraid application through production code paths and passes the approved Gate 1 with human validation.

### What it introduces

- Production frontend build served by the Go process from the same local origin.
- A disposable Gate 1 setup using a real throwaway source repository and isolated WorkBraid application-data directory.
- A concise human validation runbook and evidence checklist.
- One supporting Playwright smoke scenario against the real Go server, real Git executable, real filesystem, and real SQLite association store.

No fake Git backend or alternative test-only Architecture transition path is introduced.

### Architecture v0 invariants exercised

All Gate 1 invariants, particularly canonical authority, exact revision reconstruction, deliberate acceptance, failure preservation, accepted-only visualization, restart behavior, and source-repository non-interference.

### Acceptance criteria and human product gate

A human performs the following through the application:

1. Create a real throwaway source repository and record its contents, status, and current commit.
2. Launch the real WorkBraid application against an isolated application-data directory.
3. Open the source root and confirm that a missing association does not create anything.
4. Explicitly initialize its private Architecture store.
5. Inspect `architecture.yaml` and confirm it contains stable, human-readable identity and association information sufficient for later manual recovery work.
6. Create a tiny Architecture containing multiple documented components and explicit relationships.
7. Inspect the complete candidate diff and deliberately commit it.
8. Navigate the accepted documentation through the interactive map.
9. Create another pending change, deliberately trigger structural validation failure, and verify the submitted change survives in the running backend while accepted Git remains unchanged.
10. Correct the change, review the new complete diff, and commit it.
11. Inspect the exact accepted commit identity and parent diff.
12. Stop and restart WorkBraid, reopen the associated source root, and verify the same accepted Architecture is reconstructed from `refs/heads/accepted`.
13. Confirm the source repository is still untouched.

There is no persisted SQLite Architecture projection to delete or rebuild. The operational source-root association remains in SQLite and is not incorrectly treated as a rebuildable projection.

### Real validation

- All focused Go, frontend, and real-Git tests pass.
- The supporting Playwright smoke test passes through production HTTP paths.
- The human runs the documented workflow and records a pass or the precise failed invariant.
- A failure blocks later feature planning until understood and corrected.

Automated checks support the gate; they do not certify it on their own.

### Dependencies

Increments 1–3.

### Deliberately deferred

Everything outside the approved Gate 1: repository export/synchronization, proposals, agent worktrees, persisted drafts, history/revert UX, Architecture overlays, source inference, other WorkBraid verticals, installable packaging, remote access, and multi-user behavior.

This is the full approved first plan: four sequential increments, concurrency one, ending at the real human product gate.
