# Architecture I3.2 Execution Packet

Status: Approved

Architecture baseline: `docs/architecture-v0.md`

UI baseline: `docs/ui-v0.md`

Parent plans: `docs/plans/architecture-gate-1.md` and `docs/plans/architecture-increment-3.md`

Completed prerequisite: I3.1 is complete with human checkpoint **PASS** in `docs/plans/architecture-i3.1.md`

Work item: I3.2 — Structured outgoing-relationship authoring

Exact docs-inclusive I3.2 planning baseline: `60ec6f0abe32174c30a5fd8694e3b3d4e0608087`

## Execution base

This proposed packet must be human-approved, marked Approved, and committed on top of the exact clean planning baseline above. That resulting docs-inclusive packet commit becomes the exact worker base. Report it before dispatch; do not dispatch from `60ec6f0abe32174c30a5fd8694e3b3d4e0608087` itself.

Before changing code, the one implementation worker verifies:

- `HEAD` equals the dispatcher-provided docs-inclusive worker-base SHA;
- the worktree is clean;
- this packet records Status Approved;
- `docs/plans/architecture-increment-3.md` records Status Approved;
- `docs/plans/architecture-i3.1.md` records I3.1 complete with human checkpoint PASS and final integrated implementation `0969c42a6f127fc0e2a7b4948abe550060f4feb5`.

Use exactly one implementation worker. After it completes, use one fresh independent reviewer who did not implement I3.2. Do not begin I3.3 until I3.2 is integrated, independently reviewed, checked through the real application, and explicitly accepted by the human.

## Objective

Extend the existing structured component authoring task so a human can inspect and change a component's explicit outgoing Architecture relationships without editing YAML or identifiers.

Relationship changes join the one backend-held multi-file pending change set and reuse its exact base revision, pending generation, complete candidate construction/validation, diff review, reviewed binding, successor commit, and accepted-ref compare-and-swap flow. The accepted map, index, and documentation remain unchanged while relationship work is pending. After successful acceptance, the already-validated successor snapshot advances documentation and map topology together.

One pending change set must be able to coherently contain component text changes, a pending new component, relationships targeting that new component by its generated stable ID, cycles, and multiple differently labelled relationships between the same source and target.

## Bounded implementation choices

- Add concrete structured relationship rows to the existing contextual Add/Edit component task. Each row contains one target selector and one short label field, with add, edit, and remove actions.
- Represent the edited component's outgoing declarations in pending application state as one complete replacement list. Do not create a relationship repository, relationship entity table, command framework, or per-relationship backend lifecycle.
- Use browser-local row keys only to keep unsaved controls stable. They are disposable UI state and must never enter API semantics, candidate state, canonical frontmatter, diffs, or accepted snapshots.
- Supply target choices from the backend-owned pending authoring context: accepted components plus already-kept pending new components in the same store/base change set. The browser does not parse files, construct a candidate graph, infer identity, or decide whether a target resolves.
- Target option values use stable component IDs internally. Normal presentation uses the human-readable component Title. Add filename or shortened-ID context only when visible titles collide. Mark pending-new targets with short product language such as **New component** so they are not presented as already accepted.
- Where a component has a pending Title, its structured pending authoring context may present that current pending Title inside Changes in progress. This does not change the accepted index, map, or documentation before acceptance.
- Relationship mutation must use explicit changed-field intent or a relationship-specific structured payload so it cannot normalize or replace untouched Title, H1, Description, body, filename, or identity. Do not make the browser resubmit canonical component content merely to edit frontmatter.
- When relationships are changed, rewrite only the source component's v1 frontmatter needed to express its `id` and resulting outgoing declarations. Preserve the stable ID value and every byte after the existing closing frontmatter delimiter. Do not introduce a general lossless-YAML editor. Components whose relationships did not change reuse their exact base-tree entries/blobs/modes.
- Omitting `relationships` versus writing an empty sequence after removing the final declaration is a bounded v1 serialization detail, provided the result is a valid closed-schema component, diffs remain meaningful, and unrelated canonical content is not rewritten.
- Relationship labels remain authored free-text strings. Validate only that a label is non-empty after trimming; otherwise retain the submitted or externally loaded value exactly. Do not silently trim, collapse whitespace or newlines, or otherwise normalize a valid v1 label.
- Preserve the loaded/source order of surviving declarations through ordinary add, edit, and remove operations so canonical diffs remain faithful and reviewable. New rows may take their natural UI insertion position. I3.2 provides no reorder operation, and this fidelity rule creates no domain ordering, relationship identity, or lifecycle semantics.
- Keep incomplete target/label controls as backend-held non-canonical Changes in progress when the human chooses **Keep change**. The same complete candidate path records structural invalidity; no alternate preview validator or browser-owned acceptance rule is introduced.

If implementation reveals that the existing pending component representation or candidate path cannot support relationships without a second interpretation, stop and bring that conflict to the human. Do not weaken complete-candidate validation or accepted-only map semantics to make the UI easier.

## Worker brief

Read these documents completely before changing code:

- `AGENTS.md`;
- `docs/architecture-v0.md`;
- `docs/ui-v0.md`;
- `docs/plans/architecture-gate-1.md`;
- `docs/plans/architecture-increment-3.md`;
- the completed `docs/plans/architecture-i3.1.md` record;
- this execution packet.

Treat them as authoritative. Do not edit approved Architecture, UI, planning, packet, or completion documents. If implementation exposes a genuine Architecture/product conflict or materially important missing decision, stop and report it rather than silently changing canonical preservation, pending semantics, target resolution, validation timing, or accepted-map behavior.

Implement only this I3.2 vertical slice.

### Structured relationship authoring

- Show outgoing relationship controls in the same contextual component editor as Title and Description, for accepted components and pending new components.
- Initialize the controls from the backend's current structured authoring state: accepted declarations overlaid only by that component's already-kept pending relationship replacement. Do not read frontmatter in the browser.
- Each row provides:
  - a target selector bound to stable component identity;
  - a short source-relative human-readable label field;
  - a remove-row action.
- Provide one small **Add relationship** action. Do not add graphical edge creation, a relationship-management page, taxonomy controls, or advanced row chrome.
- Present target titles normally. Only colliding titles receive the minimum filename/short-ID context needed to disambiguate them. Normal users never paste or prominently see UUIDs.
- Clearly distinguish a target that is a pending new component in the same change set without implying it is accepted. Its already-generated component ID is the stored target and complete-candidate validation resolves it.
- Permit cycles and multiple rows with different labels to the same target. Do not deduplicate them, assign stable relationship IDs, or give row order domain meaning.
- Load and retain valid externally authored label strings faithfully, including significant leading/trailing or internal whitespace and line breaks representable by v1 YAML. The structured UI must not normalize them merely because WorkBraid did not author the source.
- Ordinary row add, edit, and remove operations preserve the relative loaded/source order of every surviving declaration. Do not add drag handles, move controls, sorting, or a reorder operation.
- Allow incomplete rows to be kept as non-canonical work in progress. Use `Untitled component` where the established pending-title presentation requires it, but do not invent a fake relationship label or target.
- Extend the existing dirty-editor guard to unsent relationship-row changes. Map/index selection, opening Changes in progress, **Add component**, and **Open another project** must offer the established **Keep editing** or **Leave without keeping** choice before replacing locally dirty relationship controls. Leaving drops only unsent browser values and does not alter backend-held Changes in progress.

### One pending and candidate path

- Extend the existing one backend-held pending change set and per-component pending mutation. Do not add a relationship-specific pending store or independent candidate representation.
- Mutating Title, Description, or Relationships for the same component must merge atomically under the existing concrete state-synchronization boundary. Concurrent local requests must not lose a previously kept field, expose a partially updated relationship list, or retain a valid reviewed binding after a relationship mutation.
- Every kept relationship mutation advances the current pending generation and invalidates the existing reviewed base/tree/generation binding exactly as other pending mutations do.
- Construct the complete candidate from the exact pending base using the existing I2.2 candidate path. Reuse unchanged tree entries and blobs exactly.
- Resolve relationship targets across the complete candidate revision. This includes accepted components and pending new components already present in that same pending set. Never validate only against the accepted snapshot or the currently edited file.
- The candidate snapshot returned by the shared loader remains the only interpretation used by review, commit, post-CAS publication, map, index, documentation, and restart reconstruction.
- Do not add browser-side canonical validation, frontmatter serialization, UUID resolution, graph inference, or a second commit/review endpoint.

### Canonical preservation

For a relationship-only edit of an existing source component, preserve:

- its immutable component ID value;
- its filename/path;
- the complete H1/title bytes;
- the complete Markdown body bytes following the H1;
- its existing regular-file mode, including `100755` when loading an otherwise valid regular file;
- every other component path/blob/mode whose authored state is unchanged.

Serialize only valid closed-v1 frontmatter. The source component's relationship metadata may be rewritten as needed, but unrelated component files and the source component's H1/body must not be normalized or reformatted. Newly created component files remain `100644` and retain the established generated-ID/filename/ATX-H1 behavior.

For relationship labels, trimming is a validity check only. A value whose trimmed form is non-empty is serialized and reconstructed exactly as authored. For relationship declarations, preserve the relative source order of surviving rows through add/edit/remove; natural insertion of a new row does not make position part of relationship identity or domain meaning.

Title-only and Description-only edits continue to follow the approved byte-preservation rules. A later relationship change to the same component must merge with those kept intents rather than causing Title/Description serialization through another path.

### Validation and review UX

- Keep incomplete/invalid authored rows quietly available through **Changes in progress** after **Keep change**. Do not nag merely because work is not yet reviewable.
- On **Review changes**, construct and structurally validate the one complete candidate before exposing a diff or final confirmation.
- A blank/whitespace-only label must block review with concise product language such as **Add a label to each relationship.** Valid labels are retained exactly rather than normalized after that check.
- A missing or unresolved target must block review with concise product language such as **Choose a component for each relationship.**
- Validation failure preserves the entire backend-held pending set, all relationship rows, accepted snapshot/ref/tree, and source repository. Correcting the rows returns to the same complete candidate path.
- Normal UI must not expose YAML, frontmatter, UUID, parser, candidate tree, canonical, Git ref, or blob terminology. Technical revision/diff inspection remains as already approved.
- The exact unified diff must show the complete pending change set, including expected relationship frontmatter changes and any component Title/Description/new-file changes. Do not add semantic, colorized, or rendered-Markdown diff behavior in I3.2.

### Accepted versus pending workspace

- Before CAS success, accepted index titles/nodes, map nodes/edges, selected accepted documentation, and relationship topology remain exactly those of the loaded accepted snapshot.
- Pending new source/target components remain absent from the accepted index/map. Pending relationship additions, edits, and removals do not preview on the map.
- All kept relationship work remains reachable and editable through **Changes in progress**, including after browser reload against the same running backend.
- Whole-set discard removes the relationship work together with all other pending/review state under the established semantics. Project switching remains blocked while any pending work exists.
- After successful existing CAS, consume the pending set and publish the already-validated successor snapshot. Map, index, documentation, and relationships advance together under the successor commit identity.
- Preserve stale-base, ambiguous post-CAS response, restart reconstruction, same-origin mutation protection, and source-repository isolation behavior.

### Security, authority, and scope

- Keep relationship mutation behind the existing loopback same-origin boundary. Expected Origin is required; missing/wrong Origin is rejected; no permissive CORS is added.
- Browser input selects only the concrete structured relationship operation and authored target/label values. It never becomes arbitrary Git arguments, YAML keys, paths, or object selectors.
- Do not modify the user's source repository or use SQLite as Architecture storage/projection.
- Keep packages and state concrete and Architecture-owned. Do not add a generic form engine, graph editor, repository/service layer, schema/validation framework, command bus, or VCS abstraction.
- Follow the repository QA rule: parameterized asynchronous browser cases are separate runner-owned test cases, never a manual repeated render/unmount/mock-restoration loop.

Exact field layout, select widget choice, local row-key generation, label input length presentation, collision-context formatting, and valid empty-relationship serialization are bounded implementation details. They must remain inside the approved semantics above.

## Required focused validation

Use the real compatible Git executable, real temporary private bare repositories, real filesystem state, real temporary SQLite databases, production HTTP handlers, and the built browser UI where the checkpoint requires them. Do not add fake Git, a test-only candidate loader, browser frontmatter fixtures that bypass backend semantics, or a second graph source.

Keep the matrix bounded to representative complete-candidate, canonical-preservation, validation, accepted-isolation, and regression cases.

### Real-Git candidate and canonical preservation

- Start from a real accepted revision containing:
  - ordinary and duplicate component titles;
  - an existing cycle;
  - multiple differently labelled relationships between the same source and target;
  - at least one component with distinctive frontmatter formatting, H1 bytes, body bytes/line endings, and regular-file mode.
- Through production mutations, keep a text edit, create at least one pending new component, and replace outgoing relationships so one target is that pending component's generated stable ID.
- Prove the one complete candidate resolves accepted and pending-new targets, retains cycles and parallel labels, and is parsed by the existing shared loader into the candidate snapshot.
- Prove a relationship-only edit preserves the exact source H1/body bytes, stable ID value, filename, and regular-file mode. Unchanged files reuse exact base tree entries/blobs/modes.
- Prove adding relationship intent after kept Title/Description intent merges into one component change without losing or normalizing either authored section.
- Prove removing the last relationship yields a valid closed-v1 component and no stale declaration remains.
- Round-trip one representative single-line label containing YAML-sensitive punctuation and Unicode through candidate construction, accepted commit, and reload without changing its authored value.
- Round-trip one bounded valid externally authored label whose parsed string value contains significant whitespace or a line break that would expose trimming/collapse normalization. Prove structured load, unchanged retention, relationship edit, accepted commit, and reload preserve that string value exactly; preserving its original YAML scalar spelling is not required.
- Prove add/edit/remove preserves the relative loaded/source order of surviving declarations and places new rows only at their natural UI insertion point. Also prove that order is not used as domain identity: browser-local row keys and transport details never appear in canonical source.

### Validation and pending retention

- Keep one blank-label row and one missing/unresolved-target case through production handlers. At **Review changes**, prove each blocks review/confirmation with the intended product-language correction and no raw parser/YAML/UUID wording.
- Prove invalid review preserves the complete pending set and exact accepted ref/tree/snapshot. Correct both cases and prove the same candidate path becomes valid.
- Prove relationship mutation advances pending generation, invalidates an older reviewed binding, and cannot be accepted through the old confirmation.
- Race proportionate relationship and Title/Description mutations through the production handler. Prove both intents are accumulated atomically and no partial relationship list is observable.

### Frontend authoring and accepted isolation

- Prove target options are supplied by backend pending authoring state and use stable IDs as values while presenting titles normally.
- Prove only duplicate visible titles receive filename/short-ID context, and pending-new targets are clearly marked in product language without showing raw IDs.
- Prove add, edit, and remove row behavior preserves surviving source order and valid label values exactly; cycles and parallel target rows remain allowed.
- Prove incomplete rows can be kept and retrieved after browser reload against the same backend process.
- In separate runner-owned cases, prove locally dirty relationship controls use the existing keep/leave navigation guard and that leaving affects no previously kept backend change.
- With pending text, new-component, and relationship work present, prove the accepted map/index/documentation/edges remain exact while **Changes in progress** exposes the complete pending work.
- Prove accepted topology changes only after the established successful CAS publishes the validated successor snapshot.
- Preserve representative I3.1 workspace, safe-rendering, discard, project-switch, ambiguous-response, and stale-read-only tests without expanding them into another synthetic UI system.

### Required checks

Before handoff, run:

- `git diff --check`;
- focused real-Git Architecture candidate/loader tests;
- focused production-handler relationship, concurrency, review, CAS, and restart tests;
- uncached full Go tests;
- full Go race tests where applicable to the touched backend paths;
- `go vet ./...`;
- `go mod verify`;
- the repository's ordinary frontend test command following `AGENTS.md`;
- the production frontend build.

Do not add permanent artificial resource limits or alternate QA commands. If any frontend test exhibits runaway resource behavior, stop it immediately, preserve evidence, and diagnose the runner-owned test structure before another run.

## Acceptance criteria

The implementation is ready for independent review only when:

- a human can inspect, add, edit, and remove source-owned outgoing relationship declarations through structured controls in the contextual component editor;
- target choices are backend-supplied and selected by stable identity while normal UI presents titles with collision-only context and a clear pending-new marker;
- one backend-held pending set coherently contains component text changes, pending new components, and relationship replacements, and all mutations share one generation/review invalidation boundary;
- relationship targets resolve against the complete candidate, including a pending new component's generated stable ID;
- cycles and multiple differently labelled relationships between the same source and target remain valid without relationship IDs, taxonomy, lifecycle, or ordering semantics;
- valid authored labels survive structured load/edit/commit/reload without trimming or whitespace normalization, and add/edit/remove preserves the relative source order of surviving declarations without adding reorder behavior;
- incomplete rows may remain quietly non-canonical, while blank labels and missing/unresolved targets block review/acceptance with actionable product language and no pending-data loss;
- relationship-only edits preserve component identity, filename, complete H1/body bytes, regular-file mode, and unchanged tree entries/blobs;
- the existing candidate validation, exact diff, reviewed binding, successor commit, CAS success boundary, snapshot publication, and restart load paths are reused rather than reimplemented;
- accepted map/index/documentation/topology remain unchanged before CAS and advance together only from the validated successor snapshot afterward;
- dirty-editor protection, whole-set discard/project switching, safe Markdown rendering, ambiguous/stale behavior, same-origin protection, source isolation, and no SQLite Architecture projection remain intact;
- no graphical edge editing, draft topology preview, relationship identity/lifecycle/taxonomy, component deletion, explicit refresh, persisted pending state, reconciliation, layout persistence, future vertical, or non-gating I3.1 improvement enters the diff;
- focused/full real-Git, Go, HTTP, race, vet, module, frontend, build, and diff checks pass;
- no approved Architecture, UI, planning, packet, or completion document is edited by the worker.

## Explicit exclusions

Do not implement:

- graphical edge creation, editing, deletion, dragging, or map-based authoring;
- pending/draft topology, title, add, edit, or delete overlays in the accepted map/index;
- stable relationship IDs, per-relationship lifecycle, taxonomy, hierarchy, domain ordering, or a central relationship registry;
- component deletion, inbound-reference handling, filename changes, raw-frontmatter editing, or identity replacement;
- explicit accepted refresh, watcher, polling, fallback, repair, or any I3.3 behavior;
- partial discard, multiple/project-scoped pending sets, cross-process pending persistence, autosave, undo/redo, merge, rebase, reconciliation, or general draft lifecycle;
- persisted/manual map layout, grouping, overlays, source inference, or richer/isometric rendering;
- syntax highlighting, URL-backed workspace restoration, themed scrollbars, diff colorization, rendered/semantic Markdown diff, or other non-gating I3.1 observations;
- history/revert, proposals, export/synchronization, Planning/Agent-Control UI, authentication, remote access, multi-user behavior, or mobile-specific UX;
- generic graph/form/relationship/repository/workflow/security/validation frameworks or Increment 4 work.

## Fresh independent reviewer brief

After the worker produces one conventional implementation commit from the exact worker base, assign one fresh reviewer who did not implement I3.2. Give the reviewer the exact planning baseline, docs-inclusive worker base, complete implementation diff, this packet, governing baselines, completed I3.1 record, and the worker's evidence.

The reviewer checks:

1. **Single pending/candidate path:** relationship changes extend the existing component mutation, generation, candidate construction, validation, review binding, commit, and CAS path; no alternate pending store, graph candidate, serializer, or acceptance endpoint exists.
2. **Complete-candidate targets:** accepted and pending-new targets resolve by stable ID against the complete candidate; browser choices come from backend pending context and do not create a competing Architecture interpretation.
3. **Canonical preservation:** relationship-only edits preserve stable ID value, filename, H1/body bytes, regular-file mode, and unchanged tree entries/blobs; no general lossless-YAML machinery or unrelated reformatting appears.
4. **Relationship semantics and fidelity:** source is implied; direction and free-text label remain meaningful; valid labels are retained exactly after the non-empty-trimmed check; surviving declaration order is preserved through add/edit/remove; cycles and parallel labels work; no stable IDs, taxonomy, lifecycle, deduplication, reorder feature, or ordering meaning is introduced.
5. **Validation UX:** incomplete rows can remain pending; review blocks blank labels/missing or unresolved targets with actionable product language and retains all pending work/accepted authority.
6. **Accepted isolation:** pending relationship/text/new-component changes do not alter accepted map, index, documentation, or topology before CAS; successful publication advances all accepted projections together.
7. **Workspace regressions:** relationship fields participate in dirty-editor protection; Changes in progress, discard/project switching, contextual layout, safe rendering, and I3.1 action feedback remain coherent.
8. **Authority and concurrency:** relationship mutation is same-origin protected, merges atomically with other pending field intents, advances generation, invalidates review, and cannot race into partial/lost state.
9. **Scope and code shape:** no graphical editing, draft overlays, component deletion, refresh/I3.3, persisted drafts, reconciliation, layout work, future UX candidates, generic framework, or other vertical enters.
10. **Evidence:** tests use real Git/filesystem/SQLite and production handlers; exact diff/CAS/restart and source isolation are demonstrated; full bounded checks pass; approved documents remain unchanged.

Any violation of complete-candidate resolution, accepted-only topology, byte preservation, one-path acceptance, or an accepted I3.1 workflow is actionable and blocks the human checkpoint. The reviewer edits no files and reports findings with severity, exact file/line evidence, reproduction evidence, and residual human-checkpoint risks. If findings exist, return them to the same implementation worker for bounded correction, then use a fresh rereview before integration.

## Integration procedure

After a no-actionable-findings review:

1. Verify the implementation head descends from the exact docs-inclusive worker base and the worker worktree is clean.
2. Integrate only the reviewed I3.2 implementation commit(s) without rewriting approved Architecture/UI/planning/packet/completion documents.
3. Verify the integrated worker-base-to-head diff exactly matches the independently reviewed diff.
4. Rerun `git diff --check`, focused real-Git/Architecture/HTTP/concurrency/review/CAS/restart tests, uncached full Go tests, applicable race tests, Go vet, module verification, the ordinary frontend test command, and the production frontend build.
5. Confirm no dependency directory, build output, database, temporary fixture, screenshot, or generated artifact is staged.
6. Start the built real application with an isolated application-data directory, real Git executable, real private bare store, real SQLite association state, and throwaway source repository for the human checkpoint.

Do not begin I3.3 while integration checks or the real human checkpoint remain incomplete.

## Real human checkpoint

Use the built UI served by a genuinely running WorkBraid Go process, the real compatible Git executable, a real private bare Architecture repository, real filesystem and SQLite association state, and a throwaway source repository with recorded HEAD, status, file list, and checksums.

1. Open or initialize a project and create/retain an accepted fixture with enough components to keep a text-edited component distinct from a relationship-only source, including two components with the same visible title so target disambiguation can be observed. Record the exact accepted revision and accepted map topology.
2. Through structured authoring, keep a recognizable Title or Description edit on one accepted component.
3. Add and keep a new component. Open a different accepted source component without changing its Title or Description, then add a relationship targeting that pending new component. Confirm the target is understandable as a new component, is selected by its displayed identity context, and requires no pasted ID.
4. Add outgoing declarations on that source and the pending new component to produce a cycle and two differently labelled relationships between the same source and target. Also select one of the duplicate-title targets and confirm the intended identity is retained. Exercise relationship edit and remove once, then keep the intended final rows; verify the surviving declarations did not gratuitously reorder. Duplicate-title choices must be distinguishable without general UUID/path chrome.
5. Confirm the accepted component index, map nodes, and map edges remain exactly at the recorded accepted revision. The pending new component and every pending relationship remain reachable through **Changes in progress** but absent from accepted topology.
6. Keep one blank-label row and choose **Review changes**. Verify review is blocked with concise product-language guidance, the complete pending set remains editable, and accepted Architecture is unchanged. Correct the label and continue.
7. Keep one row without a selected/resolvable target and choose **Review changes**. Verify the same retention/isolation behavior with product-language guidance. Correct the target and continue.
8. Review the complete exact unified diff. Verify it contains the text/new-component changes and only the expected source frontmatter relationship changes. Record the exact reviewed base revision, candidate tree, and pending generation.
9. Deliberately choose **Update architecture**. Verify the pending set is consumed and one successor revision becomes accepted. Confirm the component index, documentation, map nodes, and map edges advance together; inspect the cycle and both parallel labels.
10. With read-only Git inspection, verify `refs/heads/accepted` names the reported successor; its tree equals the reviewed candidate tree; relationship-only source files preserve their recorded H1/body bytes, stable IDs, filenames, and modes; and untouched component entries remain exact.
11. Stop WorkBraid completely. Start a genuinely new process with the same application-data directory, reopen the project, and verify the identical accepted revision, component identities, documentation, relationships, cycle, parallel edges, and topology reconstruct from canonical Git.
12. Verify the source repository retains its original HEAD, tracked/untracked status, file list, and checksums. Verify SQLite contains no Architecture projection or pending relationship state.

Record **PASS** only if structured controls create the complete coherent pending change, pending-new target resolution works by stable identity without normal UUID authoring, invalid review is actionable and non-destructive, the accepted map remains unchanged before CAS, the complete canonical diff is reviewed, successful acceptance advances all accepted projections together, restart reconstructs identical topology, and source/SQLite isolation holds.

## Stop boundary

I3.2 completes only after integration, fresh independent review, bounded automated real-system checks, and the real human checkpoint pass and are recorded. Stop there. Do not prepare or implement I3.3 explicit refresh until the human explicitly accepts I3.2.
