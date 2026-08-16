# Architecture I2.1 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plan: `docs/plans/architecture-increment-2.md`

Completed prerequisite: `docs/plans/architecture-i1.3.md`

Work item: I2.1 — Load and validate accepted components

Approved Increment 2 planning baseline: `94953141f87f178b40bfea33de0ed4a3af908a83`

## Execution base

This proposed packet is intentionally uncommitted and authorizes no implementation. After human approval, commit the approved packet on top of the exact planning baseline above. That docs-inclusive packet commit becomes the exact worker base and must be recorded by the dispatcher before any worker starts.

The worker must start from that one exact clean packet commit, not directly from `94953141f87f178b40bfea33de0ed4a3af908a83`, because the worker base must contain this approved packet and every approved document it is instructed to read. Before changing code, the worker verifies:

- `HEAD` equals the dispatcher-provided docs-inclusive worker-base SHA;
- the worktree is clean;
- this packet records Status Approved;
- the Increment 2 plan records Status Approved;
- the completed I1.3 record records human checkpoint PASS.

Dispatch exactly one implementation worker. After the worker completes, use one fresh independent reviewer who did not implement I2.1. Do not begin I2.2 until I2.1 is integrated, independently reviewed, checked through the real application, and explicitly accepted by the human.

## Worker brief

Read these approved documents completely before changing code:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-2.md`;
- the completed `docs/plans/architecture-i1.3.md` execution record;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, planning, or completion documents. If implementation exposes an Architecture conflict or materially important missing decision, stop and report it rather than silently changing the contract or inventing behavior.

Extend the integrated I1.3 application with one read-only vertical slice:

- preserve the existing source-folder association, deterministic private-store location, accepted-only authority, manifest validation, store-ID verification, and immutable snapshot publication sequence;
- extend that same accepted-snapshot loader to support valid v1 component-bearing accepted trees; do not create a second component loader, checkout path, frontend parser, SQLite projection, or test-only authority;
- continue resolving only `refs/heads/accepted`, read the exact committed tree, and publish nothing as current until the complete manifest and every discovered component and relationship validate;
- discover components non-recursively as direct `components/*.md` entries only;
- preserve the closed v1 tree contract: only the ordinary `architecture.yaml` blob and zero or more ordinary direct component Markdown blobs are valid canonical paths;
- accept existing regular component blob modes `100644` and `100755`; executable mode has no Architecture meaning and loading is read-only;
- require valid UTF-8 component source;
- split the required YAML frontmatter from Markdown with small Architecture-owned code rather than a general document framework;
- parse the exact closed v1 component frontmatter: required string UUID `id`, optional `relationships` sequence, and relationship items containing exactly required string UUID `target` and non-empty trimmed string `label`;
- reject unknown or duplicate structured keys and wrong YAML scalar/container types rather than allowing YAML coercion or silently ignoring data;
- after frontmatter and optional whitespace, require the first Markdown block to be a level-one heading with non-empty human-readable text after trimming;
- use Goldmark with only the approved tables, task lists, strikethrough, and autolinking extensions for authoritative Markdown block parsing; accept both ATX and Setext H1 titles on load;
- retain each component's stable ID, canonical filename/path, title, and parsed outgoing relationship declarations in the immutable snapshot; source order may be preserved for faithful representation, but relationship order has no domain meaning;
- define the loaded Markdown body source as the exact canonical source bytes remaining after the complete first H1 block; preserve those bytes as-is in the snapshot, and never normalize or re-render the body as a side effect of title parsing;
- validate component IDs for syntax and uniqueness across the complete accepted revision;
- validate relationship targets only after all components have been parsed, resolving every target against the complete accepted revision;
- allow duplicate titles, cycles, multiple relationships between the same source and target, omitted or empty relationships, and relationship order without assigning any new domain meaning;
- do not infer relationships from Markdown links, source code, runtime state, filenames, or any other surface;
- treat raw HTML, fenced code, Mermaid-like syntax, includes, and directives as inert authored Markdown source for this increment; do not execute or render them and do not reject raw HTML merely for being present;
- retain valid manifest-only zero-component Architecture behavior unchanged;
- replace I1.3's temporary component-bearing `unsupported` outcome only when the complete v1 component state is valid and supported; malformed component state is invalid, while unsupported manifest format/version continues to fail truthfully and is never interpreted as v1;
- return only accepted revision, component count, and component titles needed for a compact read-only browser inventory; the browser must not parse canonical Markdown/frontmatter or independently reconstruct Architecture semantics;
- keep the inventory in the existing Architecture-ready surface as a short transitional list, not a dashboard, management screen, navigation system, filter/search surface, or precursor map;
- follow `docs/ui-v0.md`: normal UI speaks about architecture and components, keeps filenames/IDs/Git machinery behind deliberate inspection when useful, and introduces no empty or disabled future controls;
- retain expected-origin enforcement and no-permissive-CORS behavior;
- leave the source repository untouched and keep accepted loading logically read-only.

Exact Go struct layout, parser-helper organization, snapshot accessor shape, HTTP response field names, and compact-list markup are bounded implementation details. They must not alter the portable component contract, duplicate Architecture semantics in the browser, or create infrastructure for I2.2/I2.3/Increment 3.

## Required focused validation

Use the real compatible Git executable, real temporary bare repositories, real filesystem state, and real temporary SQLite databases. Do not introduce fake Git, fake accepted state, or an alternative component authority.

### Valid accepted-state coverage

- Preserve a manifest-only accepted revision as a valid zero-component snapshot.
- Load a component-bearing accepted revision through the existing Manager → HTTP → browser path and prove the exact accepted SHA, full component count, and expected titles are returned only after complete validation.
- Include a bounded valid fixture that proves direct non-recursive discovery, arbitrary valid `.md` filenames, UUID identity independent of filename/title, ATX and Setext H1 loading, duplicate titles, omitted and empty relationships, a cycle, and multiple labelled relationships between one source and target.
- Include one existing `100755` regular component blob to prove it loads without gaining executable semantics; do not create or normalize modes during load.
- Prove ATX and Setext title parsing retain the exact canonical body bytes after the complete H1 block without normalization or re-rendering.
- Prove Markdown links do not create relationships and raw HTML/fenced syntax does not execute, render, or become structurally invalid merely by being present.
- Stop and create an entirely new backend/application/database instance over the same application-data directory, reopen the same project, and prove the identical accepted SHA and complete component snapshot are reconstructed.

### Bounded invalid-state coverage

Cover representative cases sufficient to prove each approved structural boundary without creating an exhaustive corruption or fuzzing system:

- malformed or non-mapping frontmatter, an unknown/duplicate key, and one wrong scalar/container type;
- invalid and duplicate component IDs;
- invalid UTF-8;
- missing, non-first, or empty first-block H1;
- one invalid component path or non-ordinary canonical entry;
- one malformed relationship item and one unresolved target.

For every failed accepted load, prove no partial/current snapshot is published, no fallback ref or older revision is presented as current, and Git refs/objects, association rows, missing paths, and source-project state remain logically unchanged. Reuse existing manifest/tree tests rather than duplicating the complete Increment 1 matrix.

### HTTP and frontend coverage

- Exercise valid empty, valid component-bearing, component-invalid, and the existing representative manifest/unavailable failures through the production handler.
- Prove the compact ready-state inventory contains only accepted component titles/count and the exact revision remains progressively disclosed through technical details.
- Review visible copy against `docs/ui-v0.md`; normal UI must not expose frontmatter, UUID, filename/path, ref, snapshot, canonical, Git-object, or parser terminology.
- Prove the inventory is absent on failed validation and no component-management, authoring, relationship, rendering, map, repair, or future-action UI appears.
- Retain expected/missing/wrong-origin and no-permissive-CORS coverage.
- Run focused frontend tests and the production frontend build.

### Source and authority evidence

- Record the throwaway source repository's `HEAD`, tracked/untracked status, file list, and content checksums before and after component loading and restart; prove they are unchanged.
- Record accepted refs/object inventory and SQLite association rows before and after successful and failed opens; prove loading caused no logical mutation.
- Prove bare-repository `HEAD`, another branch, dangling objects, and SQLite content are not alternate accepted/component authorities.

Keep this validation proportional to the component format. Do not add broad YAML/Markdown fuzzing, exhaustive Git-object corruption, a synthetic conformance harness, or another simulated product.

## Acceptance criteria

The implementation is ready for independent review only when:

- the existing accepted-only loader supports complete valid v1 component-bearing revisions and remains the sole component authority path;
- component discovery is direct and non-recursive under `components/*.md`, with the closed v1 accepted-tree rules preserved;
- component frontmatter, UTF-8 Markdown, first-block H1/title, IDs, relationships, and complete-revision target resolution satisfy the approved v1 contract;
- the immutable snapshot retains each accepted component's ID, canonical path, title, exact canonical body bytes after the complete first H1 block, and outgoing relationships, all pinned to one exact accepted commit; relationship source order may be preserved for faithful representation but has no domain meaning;
- snapshot publication is all-or-nothing and a failed component never yields an empty or partial Architecture;
- valid zero-component Architecture continues to load;
- valid component-bearing state is no longer reported as unsupported, while malformed state is invalid and unsupported format/version still fails without being interpreted as v1;
- a genuinely new backend process reconstructs the identical accepted component snapshot and revision;
- the browser shows only a compact transitional title/count inventory and performs no canonical parsing or semantic reconstruction;
- normal product language follows `docs/ui-v0.md`, and no component dashboard/management, Markdown rendering, relationship UI, or map appears;
- accepted loading is logically read-only, creates no SQLite Architecture projection, and leaves the source repository untouched;
- focused Go, real-Git, HTTP, process-restart, frontend, production-build, race where applicable, vet, module, and diff checks pass;
- no approved Architecture, UI, planning, packet, or completion document was edited by the worker.

## Explicit exclusions

Do not implement:

- component creation or editing;
- structured Title/Description authoring controls;
- pending Architecture change sets or browser-reload continuation of them;
- candidate construction, candidate snapshots, temporary candidate indexes, or candidate validation paths;
- accepted successor commits, ref advancement, stale-base handling, or CAS success/failure behavior;
- unified diff generation or review;
- relationship creation/editing UI or target selection;
- Markdown rendering, preview, raw-source display, remote-resource handling, or documentation navigation;
- map, graph, layout, selection, viewport, or relationship visualization behavior;
- component deletion, file rename, identity replacement, or raw-frontmatter editing;
- explicit refresh/reload UX for externally advanced accepted state;
- SQLite Architecture projection, persisted component index, or pending-state persistence;
- repair, reassociation, export/synchronization, proposals, branches/worktrees, history, comparison, or revert;
- a generic VCS, document, parser, validation, repository/service, persistence, or future-vertical abstraction;
- I2.2, I2.3, Increment 3, or later Gate 1 work.

## Fresh independent reviewer brief

After the implementation worker finishes, assign one reviewer who did not implement I2.1. Give the reviewer:

- exact approved planning baseline `94953141f87f178b40bfea33de0ed4a3af908a83`;
- the dispatcher-recorded docs-inclusive worker-base SHA;
- the complete worker diff and commit(s);
- this packet and all governing documents listed in the worker brief;
- the worker's real-Git, restart, HTTP/frontend, and source-isolation evidence.

The reviewer checks:

1. **Scope:** no authoring, pending/candidate state, diff/commit/CAS, relationship UI, rendering, map, projection, or I2.2/Increment 3 work entered the diff.
2. **Single authority path:** component support extends the existing accepted-snapshot loader and resolves only `refs/heads/accepted`; no parallel backend/frontend/test loader exists.
3. **Complete snapshot:** manifest, every component, all IDs, and every relationship target validate before publication; failures expose no partial or empty fallback snapshot.
4. **Portable component contract:** discovery, paths/types/modes, closed frontmatter types, UUIDs, UTF-8, ATX/Setext first-block H1, body retention, duplicate-title allowance, and relationship semantics match `architecture-v0.md` exactly.
5. **Transition behavior:** valid component-bearing v1 state is supported; malformed components are invalid; unsupported manifest versions remain rejected without v1 interpretation; manifest-only empty state still works.
6. **Product surface:** the UI is a compact transitional title/count inventory consistent with `ui-v0.md`, not dashboard/management chrome, and the browser parses no canonical content.
7. **Read-only behavior:** successful and failed opens mutate no accepted refs/objects, associations, Architecture state, missing paths, or source-repository content/history.
8. **Restart:** evidence uses a completely new backend/application/database instance and proves exact component-snapshot reconstruction from accepted Git.
9. **Implementation shape:** Goldmark/YAML use remains concrete and Architecture-owned; no generic parser/validation/document framework or speculative abstraction appears.
10. **Evidence:** fixtures use real Git/filesystem/SQLite and remain bounded; focused checks and production build pass; approved documents remain unchanged.

The reviewer reports actionable findings ordered by severity with file/line evidence. Any material finding returns to the same I2.1 scope for correction and another fresh independent review. Do not begin I2.2.

## Integration procedure

1. Confirm the worker started from the dispatcher-recorded docs-inclusive worker-base SHA, used one implementation worktree, and did not edit approved documents.
2. Review the complete I2.1 diff and worker evidence against this packet.
3. Obtain a fresh independent review with no actionable findings.
4. Integrate only I2.1 using conventional commits; do not mix packet/provenance changes, unrelated cleanup, I2.2 preparation, or Increment 3 work into the implementation commit.
5. From the integrated implementation tree, rerun `git diff --check`, uncached Go tests, race tests where applicable, `go vet`, module verification, frontend tests, and the production frontend build.
6. Run the bounded real-Git/HTTP/new-process restart checks and the real human checkpoint below.
7. Record the planning baseline, docs-inclusive worker base, integrated I2.1 SHA, fresh-review outcome, automated evidence, accepted fixture revision, restart result, source-isolation result, and human-checkpoint result in this packet's execution record.
8. Stop. I2.2 requires a separate human-approved execution packet and explicit go-ahead.

## Real human checkpoint

Use the built browser UI served by the real Go process, the real compatible Git executable, real private bare repositories, real SQLite association state, isolated application-data directories, and real throwaway source repositories.

### Valid accepted components and restart

1. Create a throwaway source repository with tracked and untracked files. Record its `HEAD`, status, file list, and content checksums.
2. Start WorkBraid with a fresh isolated application-data directory, open the source folder, and use the already-integrated setup flow to initialize its empty Architecture.
3. Stop WorkBraid. Acting as an authoritative human through ordinary Git, create and advance `refs/heads/accepted` to one valid v1 successor containing a few directly discovered components and at least one explicit relationship. Include human-readable titles and descriptions, but no special fixture-only product path.
4. Record the exact accepted revision and read-only private-repository ref/object inventory.
5. Start a genuinely new WorkBraid process with the same application-data directory and open the project through the built UI.
6. Verify the Architecture-ready surface shows the correct component count and compact title list, with the exact accepted revision available only through Technical details. Confirm there is no component dashboard, authoring, Markdown rendering, relationship visualization, or map.
7. Stop WorkBraid completely, start another new process with the same application-data directory, reopen the project, and verify the same exact revision, count, and titles are reconstructed.
8. Verify the private accepted ref/object inventory and SQLite association are logically unchanged by both loads. Verify the source repository's recorded `HEAD`, status, files, and checksums remain unchanged.

### Representative invalid component state

9. In a separate isolated fixture, associate a real private store whose `accepted` revision has one representative component-contract failure, preferably an unresolved relationship target or duplicate component ID.
10. Open it through the built UI and verify WorkBraid reports that the Architecture needs attention, shows no component inventory, does not fall back to an older/other revision, and offers no repair or future action.
11. With read-only Git/SQLite/filesystem checks, verify the failed open did not change the accepted ref, objects, association, missing paths, or source repository.

Record **PASS** only if valid components reconstruct through a genuinely new process at the exact accepted revision, the invalid revision fails without partial publication or fallback, both loads remain logically read-only, the source repositories remain untouched, and the UI remains the approved compact transitional surface.

## Stop boundary

I2.1 completes only after integration, fresh independent review, automated real-system checks, and the real human checkpoint pass. Stop there. Do not prepare or implement I2.2, candidate authoring, accepted commits, relationship UI, Markdown rendering, or map behavior without explicit human approval.
