# Architecture Increment 2 Plan

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plan: `docs/plans/architecture-gate-1.md`

Completed prerequisite: Architecture Increment 1, through `docs/plans/architecture-i1.3.md`

Scope: Create, review, and commit component changes

Architecture changes discovered during implementation require explicit human approval. Bounded implementation details may be decided during implementation only when they do not change an approved Architecture or authority invariant.

Execution is sequential with concurrency one. Each item receives a separate executable packet after this plan is approved. Each item must be integrated, independently reviewed, and checked through the real application before the next begins. No Increment 2 implementation starts from this planning document alone.

## Increment boundary

Increment 2 ends when a human can load accepted components, create or edit component descriptions through structured controls, inspect the complete exact candidate diff, and deliberately advance `refs/heads/accepted` with stale-base protection.

This increment does not add the accepted map, component-document rendering, graph behavior, or relationship authoring. It parses and validates relationship declarations only because they are part of the approved component format and complete accepted/candidate validation.

The existing accepted-snapshot load path remains the only load authority. Component support extends that path; it does not introduce another component reader, frontend parser, checkout-based loader, or SQLite projection.

Normal UI follows `docs/ui-v0.md`. It speaks about components, descriptions, and changes. Filenames, frontmatter, UUIDs, candidate trees, refs, Git objects, and commit mechanics stay out of normal authoring surfaces. Exact canonical source and revision details may appear when the current review or inspection task genuinely requires them.

## I2.1 — Load and validate accepted components

### User-visible outcome

Opening a project whose accepted Architecture contains valid components succeeds instead of reporting that components are unsupported. The browser shows a deliberately minimal, transitional read-only inventory using component titles and the accepted component count. It does not yet render component Markdown or provide editing controls, and it does not introduce dashboard or component-management chrome ahead of the accepted map.

Invalid accepted component state fails clearly at the Architecture level without partial publication, fallback, or automatic repair.

### Implementation scope

- Extend the existing `refs/heads/accepted` loader so its immutable snapshot contains all accepted v1 component semantics needed by later work: stable ID, canonical filename/path, title, Markdown body source, and parsed outgoing relationships.
- Discover components only as non-recursive `components/*.md` entries in the exact accepted tree already being loaded.
- Require ordinary blob entries at canonical paths; accept regular-file modes `100644` and `100755`, with executable mode carrying no Architecture meaning.
- Split and parse the exact closed v1 YAML frontmatter without introducing a general document/schema framework.
- Validate UUID component IDs, uniqueness, UTF-8, the required first-block non-empty H1, relationship item shape, and relationship targets against the complete accepted revision.
- Use Goldmark for the approved CommonMark parsing behavior and only the approved GFM-style extensions. Accept ATX and Setext H1 on load.
- Allow duplicate titles, cycles, multiple relationships between the same source and target, omitted relationships, and raw HTML source without assigning any rendering or execution semantics.
- Publish the complete replacement snapshot only after the manifest, every component, all IDs, and all relationship targets validate.
- Return only the component information needed for the compact read-only inventory. Keep it within the existing ready-state surface rather than building navigation, dashboard, management, filtering, or other chrome that the accepted map will later supersede. The browser does not parse canonical Markdown/frontmatter or reconstruct Architecture semantics.
- Replace the I1.3 transitional component-bearing `unsupported` result only for valid supported v1 components. Unsupported format versions and genuinely invalid accepted state retain their existing truthful outcomes.

Exact Go value shapes, parser helper layout, and read-only inventory presentation are bounded implementation details. Component order in the UI is presentation state and has no canonical meaning.

### Architecture invariants exercised

- One exact accepted commit supplies the complete immutable snapshot.
- Component files are self-identifying; filenames carry no identity and no central registry exists.
- IDs are valid and unique; titles are required but need not be unique.
- The first Markdown block after frontmatter is the canonical H1 title.
- Component discovery and the accepted v1 tree remain closed and non-recursive.
- Relationships are source-owned authored facts whose targets resolve within the complete accepted revision.
- Invalid or unsupported state at `accepted` never falls back to another ref, older snapshot presented as current, checkout, or SQLite.
- Snapshot publication is all-or-nothing.
- The source repository remains untouched.

### Acceptance criteria

- A real accepted revision containing multiple valid components loads through the existing project-open operation and publishes its exact revision and full component count.
- The read-only browser inventory is a compact transitional list of titles, not a component dashboard or management surface, and does not expose filenames, frontmatter, IDs, refs, or Git mechanics as primary UI.
- Arbitrary valid v1 component filenames load; renaming a file while preserving its component ID preserves identity.
- ATX and Setext H1 titles load, duplicate titles are allowed, and WorkBraid does not infer relationships from Markdown links.
- Valid omitted/empty relationships, cycles, and multiple labelled relationships between one source and target parse without becoming UI or graph behavior.
- Representative malformed frontmatter, duplicate/invalid IDs, invalid UTF-8, absent/empty first-block H1, invalid component paths or entry types, and unresolved targets prevent the complete snapshot from being published.
- A failed load remains read-only and does not mutate refs, objects, associations, or source-project state.
- Existing manifest-only empty Architecture still loads unchanged.
- No component rendering, authoring, map, relationship controls, or SQLite Architecture projection is introduced.

### Real validation

Focused automated tests build temporary bare repositories with the real Git executable and advance `refs/heads/accepted` to representative valid and invalid component trees. Parser tests cover the exact closed component/frontmatter contract and approved heading behavior without turning into a fuzzing or exhaustive corruption system. HTTP and frontend tests prove the production load path shows a component inventory only after complete validation.

The real human checkpoint uses an isolated application-data directory and a real throwaway source repository. An authoritative fixture revision containing a few components, including at least one explicit relationship, is placed at `accepted` with ordinary Git. The human opens it through the built WorkBraid UI, verifies the exact revision and component titles/count, restarts the process once, and verifies the same snapshot is reconstructed. One representative invalid accepted revision is then opened to confirm clear failure with no partial component list or fallback. Read-only Git/SQLite/filesystem inspection confirms the private and source repositories were not mutated by loading.

### Dependencies on earlier items

Architecture Increment 1 complete, including accepted-only restart loading and invalid-state handling.

### Deliberately deferred

Component creation/editing, pending changes, candidate construction, Markdown rendering, raw-source display, relationship UI, map/graph behavior, deletion, file renaming, refresh UX, and all accepted-ref mutation.

### Integration and human checkpoint

I2.1 receives its own approved execution packet and one implementation worker. A fresh reviewer checks the complete diff against the Architecture/UI baselines and verifies that the existing loader was extended rather than bypassed. After integration, rerun focused Go/real-Git/HTTP/frontend checks and the production build, then perform the real checkpoint above. Record the exact planning base, implementation SHA, review outcome, accepted fixture revision, restart evidence, and human result. Stop before I2.2 until the human explicitly accepts I2.1.

## I2.2 — Structured component authoring and backend-owned pending changes

### User-visible outcome

A human can start a component, or edit an accepted component, using a structured **Title** field and **Description** Markdown textarea. Submitted changes are kept by the running WorkBraid backend as changes in progress based on the exact accepted revision.

The user can leave or reload the browser page and continue the backend-held changes while that backend process remains alive. The UI makes clear that these changes have not updated accepted Architecture yet.

### Implementation scope

- Add one concrete in-process pending Architecture change set bound to its private Architecture store and one exact accepted base revision. It is never inferred from browser state alone and can never be applied to another store or base.
- Model the change set as a collection of canonical file additions/replacements, even though the UI edits one component at a time. Do not encode “one change set equals one component.”
- Add backend operations to retrieve the current accepted component data needed for authoring, submit a new component, submit title/body edits to an accepted component, and retrieve the backend-held pending state after browser reload.
- Generate a stable UUID when a component is created. Keep it inspectable/copyable through deliberate details, not prominent in normal editing.
- Generate a human-readable creation-time `.md` filename with bounded collision handling. A later title change never renames the file.
- Create canonical new-component source with closed v1 frontmatter, a required ATX H1, and the authored description. Relationship authoring is absent; a new component has no outgoing relationships.
- Give the structured fields exact authored meaning: a **Title** edit replaces the component's canonical H1, and a **Description** edit replaces the Markdown body following that H1. Neither operation changes the component ID or outgoing relationships.
- When editing an existing component, preserve its filename and keep unchanged frontmatter bytes exact where practical instead of reserializing unchanged ID/relationship metadata merely because the title or description changed. Avoid gratuitous canonical rewrites without building a general lossless-formatting subsystem.
- Construct the complete candidate state from the exact accepted base and the full pending change set. Reuse exact base-tree entries/blobs for every unchanged path; serialize only changed or created canonical files. Preserve an edited regular file's mode and use `100644` for a created file.
- Run the existing complete structural validation against the candidate, including all component identities and relationship targets. A validation failure remains attached to the pending change set rather than altering accepted Architecture or discarding the user's submitted values.
- Keep the pending change set retrievable after validation failure and browser reload for the life of the backend process. Persistence across backend restart remains absent.
- Allow additional component edits to accumulate coherently in the same pending change set. Backend tests, rather than a complex multi-editor UI, prove that one change set can affect multiple component files.
- Keep the current accepted snapshot immutable and unchanged throughout I2.2.
- Retain expected-origin protection and the source-repository isolation boundary for every new mutation.

The first-slice application continues to operate on one loaded project at a time. Pending state must be explicitly bound to its store/base and must never leak into a different project; multi-project pending-change management is outside this increment.

### Architecture invariants exercised

- A pending change set is based on one exact accepted revision and may contain multiple coherent file changes.
- The backend, not browser-local state, owns submitted recoverable-within-process pending changes.
- Accepted Git remains authoritative and unchanged while changes are being authored or validation fails.
- Component IDs survive title/body edits; filenames do not define identity and title edits do not rename files.
- New files use generated opaque IDs, minimal closed metadata, ATX H1 titles, and `100644` mode.
- Candidate validation uses the complete resulting revision, not only the edited file.
- Unchanged paths reuse exact base entries/blobs, and unrelated canonical content is not gratuitously rewritten.
- Relationships remain preserved authored facts but acquire no authoring UI in this increment.

### Acceptance criteria

- From an empty accepted Architecture, a human can enter a component title and description, submit it, and see it listed as a change in progress rather than accepted state.
- From a component-bearing accepted Architecture, title/body edits preserve the component ID, filename, existing relationships, and regular-file mode.
- A title edit does not rename the component file.
- Two component additions/replacements can coexist in one backend pending change set and produce one coherent validated candidate in backend tests.
- Blank/whitespace-only titles and representative structurally invalid submitted state fail validation without moving `accepted` or losing the pending change set.
- Reloading the browser against the same running backend retrieves and continues the same submitted pending state.
- Restarting the backend is not presented as recoverable pending-state behavior.
- The accepted ref, accepted tree, and loaded accepted snapshot remain unchanged; no accepted successor commit is created.
- The source repository remains unchanged, and all new browser mutations retain expected-origin/no-permissive-CORS behavior.
- Normal UI uses components, descriptions, and changes language; it does not ask the user to edit a filename, UUID, frontmatter, candidate tree, or Git state.

### Real validation

Focused Go tests use a real accepted repository and prove exact-base binding, multi-file candidate construction, unchanged-entry/blob reuse, mode behavior, ID/filename preservation, complete validation, and pending retention after failure. HTTP tests use production handlers and a running backend-held change set. Frontend tests cover create/edit forms, validation feedback, accepted-versus-in-progress distinction, and browser reload retrieval without claiming cross-process recovery.

The real human checkpoint opens a real component-capable Architecture through the built UI, creates one component, edits one accepted component description, and confirms both appear as changes in progress while the accepted revision remains exact and unchanged. The human reloads the browser and continues those changes, deliberately submits one invalid title and corrects it, and confirms the changes survive the failure. Read-only Git inspection verifies `accepted` still points to the base and the source repository is untouched.

### Dependencies on earlier items

I2.1 integrated, independently reviewed, and human-accepted.

### Deliberately deferred

Exact diff review, accepted commit creation/ref advancement, relationship controls, deletion, raw-frontmatter editing, manual filename changes, identity replacement, pending persistence across restart, stale-change reconciliation, multiple simultaneous project workspaces, map, and Markdown rendering.

### Integration and human checkpoint

I2.2 receives its own approved execution packet and one implementation worker. A fresh reviewer checks base/store binding, accepted-versus-pending separation, candidate completeness, preservation behavior, local-web protection, and scope. After integration, rerun focused tests and the production build, then perform the real checkpoint above. Record provenance and human evidence. Stop before I2.3 until the human explicitly accepts I2.2.

## I2.3 — Exact diff review and stale-base-protected accepted advancement

### User-visible outcome

A human can review the complete exact diff for the changes in progress and deliberately update accepted Architecture. On success, WorkBraid shows the updated accepted components and makes the exact new revision and parent diff available through technical details.

If accepted Architecture changes after the pending change set's base, WorkBraid refuses to overwrite it, preserves the changes in progress, and reports that they are out of date. Reconciliation remains outside this increment.

### Implementation scope

- Reuse I2.2's single candidate construction and complete structural-validation path for review and commit. I2.3 must not add a second serializer, validator, or interpretation of pending changes.
- Through that shared path, build the complete candidate Git tree from the backend-held pending change set and exact base using the approved real-Git plumbing path and temporary candidate state, then minimally validate it and construct the complete immutable candidate snapshot before enabling final confirmation.
- Generate a predictable unified tree-to-tree diff between the exact base and candidate with external diff, text conversion, color, pagers, and environment-dependent presentation disabled.
- Add a small review surface that gives the human an opportunity to inspect the entire exact diff, including canonical frontmatter. Frame it in product language as reviewing/updating Architecture; the diff itself may expose exact canonical file content because that is the deliberate review task.
- Treat review as part of the direct-human change flow, not a proposal or separate approval lifecycle.
- On final confirmation, re-observe `refs/heads/accepted` and require it to equal the pending change set's exact base.
- Create a successor commit whose parent is that base, then atomically update `refs/heads/accepted` from the expected base to the successor using compare-and-swap semantics.
- Classify a failed update by explicit ref observation, never localized Git stderr. An unreferenced candidate/commit object is non-canonical.
- Treat successful compare-and-swap advancement as the acceptance success boundary. Once it succeeds, mark the pending change set committed/consumed and publish the already-validated candidate snapshot under the successor commit identity.
- If in-memory publication or the HTTP/UI response fails after successful CAS, retain the successor as accepted, never present the old pending change as safely retryable or uncommitted, and recover application state by loading the revision named by `accepted`. Restart/reopen remains the independent reconstruction proof.
- On validation, commit creation, or ref-update failure before successful CAS, preserve the prior accepted state and the uncommitted pending change set in the running backend. A stale-base failure does not silently rebase, merge, overwrite, or reconcile.
- Make the exact successor revision and parent diff available after success without adding general history, comparison, or revert UI.
- Keep Git commands fixed and non-interactive, browser input out of Git arguments, and every browser mutation behind the established origin boundary.

Exact commit message/identity wording, temporary-index organization, endpoint names, and the simple review panel/dialog shape remain bounded implementation choices unless they affect an approved invariant.

### Architecture invariants exercised

- Accepted Git does not change until a deliberate reviewed operation succeeds.
- Review covers the entire pending change set relative to its exact base.
- Candidate validation completes before final confirmation.
- Only `refs/heads/accepted` defines authority.
- Direct human history is linear in the first slice, with the exact base as parent.
- Atomic compare-and-swap prevents stale changes from overwriting newer accepted state.
- Failure before successful compare-and-swap preserves both the prior accepted revision and the uncommitted in-process pending change set.
- Successful compare-and-swap makes the successor canonical and consumes the pending change set even if later publication or response delivery fails.
- Unreferenced objects and commits have no canonical authority.
- A successful operation replaces the immutable loaded snapshot with the exact accepted successor.

### Acceptance criteria

- The user can open a complete unified diff for all pending additions/modifications before final confirmation.
- Review and commit consume the same candidate tree and validation result produced by the I2.2 candidate path; no parallel interpretation of pending state exists.
- The review diff is exactly between the recorded base tree and complete candidate tree and includes canonical metadata changes.
- Invalid candidate state disables confirmation and leaves accepted Architecture and pending changes intact.
- Successful confirmation creates one successor commit with the base as parent and atomically advances `accepted` from that base; that ref advancement is the acceptance success boundary.
- After CAS success, the pending change set is consumed and the already-validated candidate snapshot is published under the successor revision. A fresh authoritative load reconstructs the same accepted component state.
- Title/body edits preserve component ID and filename across the accepted commit; newly created canonical files are ordinary `100644` blobs.
- The exact accepted revision and parent diff remain inspectable after success without becoming dominant UI chrome.
- If another authoritative actor advances `accepted` after review, confirmation reports the changes as out of date, does not move `accepted`, and preserves the pending change set for the running session.
- A focused post-CAS publication-failure case proves that `accepted` remains at the successor, the consumed change cannot be committed again, the operation is not presented as an ordinary retryable uncommitted change, and a fresh load reconstructs the successor.
- No automatic merge, rebase, fallback, retry overwrite, semantic diff, proposal state, or history/revert UI is introduced.
- Restart after a successful commit reconstructs the same accepted component snapshot; an uncommitted pending change set is not promised across restart.
- The source repository remains unchanged.

### Real validation

Real-Git tests inspect exact base/candidate trees, unchanged blob reuse, unified diff content, commit parent/tree, controlled commit identity, successful CAS, deliberately raced stale CAS, unreferenced-object non-authority, and pre-CAS failure preservation. A focused post-CAS publication-failure test proves canonical successor authority, pending-change consumption, no duplicate commit/retry presentation, and fresh-load reconstruction. HTTP/frontend tests cover review opportunity, confirmation, success, validation failure, stale product language, pending retention, post-CAS failure language, and technical-detail disclosure. Existing accepted-only restart tests are extended to a component-bearing successor.

The real human checkpoint uses the built UI, real Go backend, real Git executable, real bare private repository, real SQLite association, and a throwaway source repository. The human creates or edits multiple component descriptions in one pending change set, inspects the full exact diff, deliberately updates Architecture, verifies the new revision/tree/parent diff with read-only Git commands, stops and restarts WorkBraid, and confirms the same accepted components reload. In a separate pending change, an external ordinary-Git advancement occurs after review; final confirmation must report the changes as out of date, preserve them in the running backend, and leave the externally advanced `accepted` untouched. Source-repository state is checked before and after both paths.

### Dependencies on earlier items

I2.1 and I2.2 integrated, independently reviewed, and human-accepted.

### Deliberately deferred

Relationship authoring, accepted map, Markdown rendering, proposal review/acceptance, merge/rebase/reconciliation, pending persistence across backend restart, deletion, file rename, identity replacement, semantic diff, arbitrary comparisons, history browsing, revert, export/synchronization, and all Increment 3 work.

### Integration and human checkpoint

I2.3 receives its own approved execution packet and one implementation worker. A fresh reviewer checks candidate completeness, exact-diff provenance, controlled Git execution, CAS authority, failure preservation, snapshot replacement, product language, and exclusions. After integration, rerun all focused Go/real-Git/HTTP/frontend checks, race tests where applicable, module verification, `git diff --check`, and the production frontend build. Perform the two real human paths above and record exact revisions, review outcome, source-isolation evidence, and human result.

Stop when I2.3 passes. Increment 3 requires a separate human-approved plan or execution packet and explicit go-ahead.

## Increment 2 completion boundary

Increment 2 is complete only when I2.1, I2.2, and I2.3 have each passed their own integration, fresh independent review, and real human checkpoint in sequence through the browser, backend, SQLite association, filesystem, and real Git authority paths.

At completion, WorkBraid can load accepted v1 components, hold a coherent in-process pending change set, review its exact candidate diff, and deliberately create a stale-base-protected accepted successor. Relationship authoring, documentation rendering, and the accepted map remain Increment 3.
