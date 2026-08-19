# Architecture Increment 4 Gate Execution Plan

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plan: `docs/plans/architecture-gate-1.md`

Exact planning prerequisite: `766e0b50800ca2f10ee6e8da09266fd2d7438372` (completed Architecture Increment 3 and I3.3 record)

Target: Architecture v0 First Real Gate

Architecture or product changes discovered during Gate execution require explicit human approval rather than silent changes to this plan or its baselines.

## Objective and boundary

Increment 4 assembles and certifies the already-built Architecture v0 slice as one coherent product workflow. It is not another feature increment.

The primary evidence is one fresh-state human run through the built browser UI, real Go process, real Git executable, private bare Architecture repository, real filesystem, and real SQLite operational association. Focused automated checks and one production-path Playwright smoke support that run but do not certify Gate 1 by themselves.

The product capabilities required by the Gate are already present after Increment 3. The only planned implementation work is the supporting Playwright production smoke already approved by the parent Gate plan. No production behavior should change unless Gate execution exposes a defect in an already-approved invariant.

Keep this as one cohesive gate increment and execution packet. Do not split ordinary setup, inspection, restart, or human verification into feature tickets.

## Execution base and discipline

This proposed document is not yet an implementation base. After human approval, commit this packet on top of exact planning prerequisite `766e0b50800ca2f10ee6e8da09266fd2d7438372`. That clean docs-inclusive commit becomes the exact worker base and must be recorded here before dispatch.

Use:

- one implementation worker for the bounded Playwright smoke and any explicitly authorized Gate defect correction;
- one fresh independent reviewer who did not implement the change;
- integration only after that review is clear;
- all ordinary automated checks;
- one complete human Gate 1 run from genuinely fresh state.

If the worker or human Gate encounters a broken approved workflow, stop at the exact failure. Classify it as either:

1. an implementation defect within approved Architecture/UI semantics; or
2. a genuinely missing Architecture or product decision.

Do not bypass the failure through private-Git edits, fixture seeding, direct HTTP calls, or weakened evidence. A bounded defect may return to the same Increment 4 worker, then requires fresh independent review and a complete fresh-state Gate rerun. A new semantic decision returns to the human before any correction.

## Gate-assembly worker brief

Read completely before editing:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-1.md` and completed I1 execution records;
- `docs/plans/architecture-increment-2.md` and completed I2 execution records;
- `docs/plans/architecture-increment-3.md` and completed I3 execution records;
- this packet.

Treat those documents as authoritative. Do not edit approved Architecture, UI, or historical planning documents. Do not alter production behavior merely to make the smoke easier to drive.

Add one bounded Playwright production-path smoke and its ordinary documented command. The smoke must:

- create a fresh temporary WorkBraid application-data directory;
- create a real throwaway Git source repository containing both tracked and untracked files;
- record source `HEAD`, status, file inventory, and content checksums;
- use the production frontend build served from the same origin by a genuinely started Go WorkBraid process on a literal loopback address;
- drive project opening, explicit initialization, structured component creation, a relationship to a pending-new component, complete diff review, and deliberate acceptance through the browser UI;
- prove pending components/relationships do not appear in the accepted map or index before acceptance;
- prove the accepted map, index, documentation, relationships, and exact revision advance together after acceptance;
- completely stop the first Go process, start a new process with the same application-data directory, reopen through the browser, and verify the exact accepted revision and Architecture reconstruct;
- verify the source repository remains byte- and Git-state-identical;
- use real Git, filesystem, SQLite, HTTP, and browser behavior rather than imports of backend internals or a test-only Architecture transition path;
- clean up every child process and temporary runtime it starts, including on failure.

Keep this supporting scenario deliberately smaller than the human Gate. It does not automate the structural-validation-failure phase, external-authority stale path, every durable-workspace interaction, every Markdown rendering case, or the SQLite inspection matrix already covered by focused tests and the human Gate.

Use one runner-owned Playwright scenario rather than manual browser-lifecycle loops. Do not add repeated render/unmount/mock-restoration loops, alternate unbounded Vitest invocations, fake Git, a fake backend, or a generic end-to-end harness. The ordinary frontend unit command remains `npm test`; the Gate smoke receives one explicit script of its own.

Exact Playwright configuration, browser executable discovery, process-launch helper shape, selectors, and temporary-directory spelling are bounded implementation details. They must remain local, deterministic, same-origin, and production-path faithful.

If the smoke passes without production changes, do not polish or refactor unrelated application code. If it exposes a real Gate blocker, record the exact failing invariant and stop for classification before correcting it.

## Worker acceptance criteria

The worker result is ready for fresh review only when:

- the new smoke begins from a fresh application-data directory, unassociated real source repository, and no private Architecture store;
- all Architecture creation in its primary path occurs through WorkBraid's structured UI rather than pre-seeded component commits;
- the real Go process serves the built UI and owns all Architecture transitions;
- the smoke creates and accepts multiple components and at least one relationship to a pending-new target;
- accepted projections remain unchanged before acceptance and advance together afterward;
- a completely new Go process reconstructs the exact accepted revision after restart;
- source `HEAD`, tracked/untracked status, files, and content checksums are unchanged;
- the smoke leaves no server, browser, Node, npm, Vitest, or Playwright process running;
- no approved documents, production semantics, dependencies unrelated to Playwright, build output, `node_modules`, or database artifacts are committed;
- `git diff --check`, Go tests, race tests, Go vet, module verification, the ordinary frontend suite, the production frontend build, and the new Gate smoke pass.

## Fresh independent reviewer brief

The reviewer receives the exact docs-inclusive worker base, worker head, complete diff, and this packet. In a fresh isolated worktree, review:

1. **Scope:** only the bounded production-path smoke and necessary test configuration/dependency changes entered; no Gate-excluded feature or speculative infrastructure was added.
2. **Product fidelity:** component creation, relationships, review, acceptance, and reopen are driven through the built UI and real backend rather than direct APIs or pre-seeded component-bearing Git state.
3. **Authority:** the smoke uses only `refs/heads/accepted`, verifies the exact accepted revision, and does not create a competing browser/test authority.
4. **Freshness:** application data, source repository, association, and private store are genuinely new for the scenario.
5. **Restart:** the first process is terminated and a new application process is constructed over the same application-data directory.
6. **Isolation:** source files and Git state are recorded and remain exact; SQLite is operational state only.
7. **Accepted versus pending:** pending nodes/edges remain absent from accepted projections until CAS succeeds.
8. **Process safety:** process groups and temporary resources are cleaned on pass/failure; no manual test loops or alternate unbounded Vitest behavior entered.
9. **Documentation integrity:** approved baselines and historical plans are unchanged.

Run the ordinary checks once through their documented commands and the new Gate smoke once. Report actionable findings and residual human-only risks. Any material finding returns to the bounded Increment 4 worker scope and then receives another fresh review.

## Ordinary automated validation

Before the human Gate, from the integrated clean tree run:

- `git diff --check`;
- `go test ./... -count=1`;
- `go test -race ./... -count=1`;
- `go vet ./...`;
- `go mod verify`;
- the ordinary frontend unit suite with `npm test`;
- the production frontend build with `npm run build`;
- the single documented Playwright Gate smoke command.

Do not substitute repeated manual loops for runner-owned cases. If any process shows abnormal growth or fails to terminate, stop it and treat that as a test defect rather than raising machine limits or adding unrelated permanent throttling.

## Real human Gate 1 checkpoint

The human checkpoint is one coherent workflow. Use one newly created runtime root holding a fresh application-data directory, throwaway source repository, and evidence files. The private Architecture repository remains outside the source repository under the application-data directory.

### A. Establish genuinely fresh source and application state

1. Create a real throwaway source Git repository with a committed tracked file, at least one additional tracked file, and at least one untracked file. Do not place WorkBraid state inside it.
2. Record its exact `HEAD`, `git status --short`, tracked and untracked file inventory, file modes where relevant, and content checksums.
3. Create a fresh empty WorkBraid application-data directory. Confirm it has no association database row and no Architecture store.
4. Build the frontend and start the real Go application on a literal loopback address, serving that production build from the same origin.
5. Open the built UI and submit the source repository folder. Confirm WorkBraid truthfully reports that no link is known and has not silently initialized a store or association.

### B. Explicitly initialize and inspect the bootstrap authority

6. Choose the explicit setup action, review the derived project context, and confirm initialization.
7. Record the bootstrap accepted revision and the generated Architecture/store identity through deliberate technical details.
8. Using bounded read-only SQLite and Git inspection, verify:
   - the operational source-root-to-store-ID association exists exactly once;
   - the private repository is bare and outside the source repository;
   - `refs/heads/accepted` points to the recorded bootstrap commit;
   - the bootstrap tree contains only ordinary `100644` `architecture.yaml`;
   - the manifest has the supported closed v1 fields, stable store ID, and human-readable `project.name` / `project.source_hint` recovery hints;
   - no checkout, `HEAD`, another ref, or SQLite Architecture state is being treated as accepted authority.

### C. Author and accept a meaningful Architecture through WorkBraid

9. Through structured WorkBraid authoring, create at least three components with representative documentation and a meaningful connected topology. Include:
   - more than one component;
   - an outgoing relationship whose target is a pending-new component in the same change set;
   - enough relationships for map direction and navigation to be meaningful;
   - representative approved Markdown such as a table or task list, fenced code, a normal link, inert raw HTML, and an image/resource sentinel that can prove no automatic request occurs.
10. While the complete change is pending, verify the accepted component index and map still show the bootstrap's empty Architecture. Confirm the pending components and relationships remain reachable through **Changes in progress**.
11. Open **Review changes**. Inspect the entire exact unified diff from the bootstrap tree to the candidate tree, including every created component, generated stable ID, H1/body, and outgoing relationship frontmatter. Record the exact base revision, candidate tree, and pending generation shown in technical review details.
12. Deliberately choose **Update architecture**. Record the exact first accepted successor revision.
13. Verify that the index, map nodes and labelled edges, component documentation, relationship resolution, and technical revision all advance together from that first accepted successor. Select components through both index and map and confirm they focus the same documentation.
14. Verify Markdown renders according to the approved contract: supported prose features display, raw HTML is inert text, fenced code is presentation-only, a normal link requires deliberate activation, and the resource sentinel recorded no automatic remote or local request.

### D. Prove structural-validation failure retention and correction

15. Through the normal structured editor, create another pending component edit and make one outgoing relationship structurally invalid using a blank or whitespace-only label. Choose **Keep change**.
16. Choose **Review changes**. Verify review is blocked with the existing concise actionable guidance that identifies the affected component and relationship field.
17. Verify the complete submitted pending change remains available in the running backend through **Changes in progress**. Confirm `refs/heads/accepted`, the accepted tree and revision, map, index, documentation, relationships, and source repository remain exact at the first accepted successor.
18. Correct the relationship label through the normal structured editor. Review the resulting complete exact diff and record its exact base revision, candidate tree, and pending generation.
19. Deliberately choose **Update architecture**. Record the exact validation-corrected accepted successor revision and verify its reviewed tree, map, index, documentation, and relationships advance together.

### E. Exercise the durable workspace as one product

20. Confirm the opening/setup sheet is absent and the index, map, and contextual pane behave as one workbench.
21. Enter unsent Title, Description, or relationship values, then navigate through the map/index or choose another context. Verify the existing **Keep editing** / **Leave without keeping** guard protects only those browser-local values.
22. Keep one harmless backend change, verify it appears under **Changes in progress**, and attempt **Open another project**. Confirm the current workspace and pending set remain intact with visible product-language feedback.
23. Deliberately discard that entire disposable pending set through its confirmation. Verify accepted Git, the loaded snapshot, map, documentation, source repository, and SQLite Architecture state do not change. Confirm leaving and reopening the same project then works.

### F. Prove real-authority stale protection, explicit Refresh, and continuation

24. Create a new meaningful pending edit against the current validation-corrected accepted revision. Review it and record the exact base, candidate tree, and generation, but do not accept it yet.
25. After that review, use bounded ordinary Git authority against the private bare repository to create one structurally valid external successor and atomically advance `refs/heads/accepted` from the recorded base. This external step exists solely to exercise the approved authority boundary; it must not modify the source repository, pre-seed the primary Architecture, or bypass a broken WorkBraid workflow. Reusing the exact accepted tree with a new ordinary successor commit is sufficient for this authority/stale check. Record the external revision and the private repository's object/ref state after this deliberate advancement.
26. Without refreshing first, confirm the previously reviewed WorkBraid change. It must fail as out of date before creating a WorkBraid successor, preserve the pending work against its exact old base, and leave the external accepted revision authoritative. Verify the private object/ref state did not gain a WorkBraid successor during this pre-observed stale failure.
27. Choose explicit **Refresh**. Verify WorkBraid adopts the external accepted revision, preserves the old-base pending set as stale/read-only, and returns a truthful usable accepted workspace. The stale set remains inspectable and cannot be edited, reviewed, or accepted.
28. Deliberately discard the stale whole set. Recreate the intended edit against the newly loaded accepted revision, review its complete exact diff, and successfully **Update architecture**. This is recreation after explicit discard, not merge/rebase/reconciliation of the stale set.
29. Record the final accepted revision. Inspect its exact tree, sole parent, controlled commit identity, and complete parent diff. Verify its tree is the exact reviewed candidate and `refs/heads/accepted` points to it.

### G. Prove canonical restart reconstruction and isolation

30. Completely stop WorkBraid and its browser checkpoint context. Confirm the first Go process has exited.
31. Start a genuinely new WorkBraid process with the same application-data directory and production frontend build.
32. Open the same source repository through the browser. Verify WorkBraid resolves the existing operational association and reconstructs the exact final accepted revision from `refs/heads/accepted`.
33. Verify the same component IDs, titles, documentation source/rendering, outgoing relationships, map nodes/edges, and index-to-map/document selection behavior reconstruct. No uncommitted pending work is expected across restart.
34. Compare the source repository with the initial evidence. `HEAD`, tracked/untracked status, file inventory, modes, and content checksums must be exact.
35. Inspect SQLite logically. It must contain only the approved operational source-root-to-store-ID association state and no canonical Architecture, accepted snapshot, component/documentation, relationship, map/layout, pending, review, or history projection.
36. Record the bootstrap, first accepted, validation-corrected accepted, external, and final accepted revisions; every reviewed candidate tree ID and complete diff; source-isolation evidence; SQLite schema/rows; restart result; and human **PASS** or the exact failed invariant.

## Gate acceptance criteria

Architecture Gate 1 passes only when all of the following are true in the same fresh-state run:

- opening an unlinked project is truthful and does not initialize anything;
- explicit initialization creates and loads the exact manifest-only bootstrap authority;
- a meaningful multi-component, connected Architecture is created through the product UI;
- pending state does not leak into accepted map/index/documentation/topology;
- the full canonical diff is reviewable before deliberate CAS acceptance;
- accepted projections advance together at one exact revision;
- a structural relationship-validation failure blocks review with actionable component/field guidance, preserves the complete pending change set, leaves accepted Architecture exact, and succeeds after correction through the normal review/accept path;
- durable workspace navigation, safe documentation, relationship authoring, dirty-editor protection, project-switch protection, and whole-set discard compose coherently;
- a real external ref advancement triggers pre-CAS stale protection without overwrite or loss of the pending set;
- explicit Refresh truthfully adopts that valid external authority and stale work remains old-base/read-only until discarded;
- a subsequent recreated valid change is accepted and its exact commit/tree/parent diff are inspectable;
- a new process reconstructs the identical final accepted Architecture from canonical Git;
- the source repository remains exact;
- SQLite contains only approved operational association state;
- all ordinary automated checks and the supporting Playwright smoke pass;
- the human explicitly records **PASS**.

Green tests, a backend-only reproduction, or a partially completed human workflow do not pass Gate 1.

## Deliberately excluded

Do not implement or pull into this Gate:

- isometric or richer map presentation;
- pending topology/title overlays;
- persisted or project-scoped pending changes;
- syntax highlighting;
- URL-backed workspace restoration;
- themed scrollbars;
- rendered, semantic, or colorized diff views;
- manual or persisted map layout;
- a clear/deselect action unless the real Gate proves the existing workflow cannot be completed without it;
- proposals, proposal branches/worktrees, or proposal acceptance;
- component deletion, raw-frontmatter editing, filename/identity replacement, history browsing, comparison, or revert;
- export/synchronization into the source repository;
- Planning, Agent Control, overlays from other verticals, source inference, or runtime data;
- authentication, remote access, multi-user behavior, installable packaging, or mobile-specific UX;
- fake Git/SQLite/filesystem authorities, broad repair machinery, or a generic test/application framework.

Previously recorded non-gating observations remain observations. Increment 4 does not silently promote them into Gate requirements.

## Integration, evidence record, and completion boundary

After the worker and fresh reviewer are clear:

1. integrate the exact reviewed worker commit;
2. record the planning baseline, docs-inclusive worker base, implementation SHA, and reviewer outcome;
3. run the ordinary automated validation from the clean integrated tree;
4. perform the entire human checkpoint above from fresh state;
5. append the exact evidence and explicit human result to this historical packet in a separate completion-record commit.

If a defect correction is required, record each correction and review SHA and rerun the complete human Gate from newly fresh state. Do not reuse a partially successful runtime as final evidence.

Increment 4 and Architecture Gate 1 are complete only after the cohesive human workflow is explicitly marked **PASS**. Stop after recording that result. Do not begin post-Gate Architecture planning or implementation without a separate human direction.
