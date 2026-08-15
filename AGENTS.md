# WorkBraid agent guide

Planning is human-driven. Do not solo product or architecture decisions.

**Authority, in order:** the human, then approved documents under `docs/`, then the active implementation plan. Ignore scratch, throwaway, or unmentioned notes.

If a product or architecture decision is missing, stop. State the decision, why it matters now, the smallest options, trade-offs, and a recommendation. Do not silently invent schema, lifecycle, or UI ahead of an approved document.

Do not edit approved documents unless the human asks. A needed change to an approved document is a stop, not a drive-by edit.

Follow `docs/ui-v0.md` for approved product language and visual direction.

## How to work

- A previously accepted real workflow failing freezes feature work. Reproduce the broken invariant before adding features. Do not keep shipping around a broken core.
- Do not bypass the product to keep moving. If the intended loop is broken, stop and fix it. Driving Git, a terminal, or a provider by hand while calling the work done is not progress.
- Green unit tests are not done. A feature is done when the real application, through production paths, using its real authorities (Git, filesystem, and whatever else the approved docs name), survives restart.
- Tests must implement the same product. A fixture must not grant a capability production does not have. Fakes of real authorities do not count.
- Owning domains keep their own state and approval rules. A shared shell or a shared agent does not merge them.
- SQLite is not an event bus. Operational writes stay rare and purposeful.
- Do not modify the user's project unless they have explicitly configured that.
- Show only actions and state that exist now. Do not add disabled future controls or chrome for unimplemented features.
- Conventional commits. Do not commit build output, dependencies, or `*.db`.

## Code shape

One loopback Go process serves the built UI from the same origin. Bind a literal loopback IP. The browser is a client. The backend owns durable transitions.

Git: real executable, fixed args, no shell, no hooks, pagers, or signing. Tests use temporary real repos.

Keep packages concrete and small. No generic framework, ORM, repository layer, VCS interface, or validation engine. No types added only so a later feature will not paint us into a corner.

Follow the approved documents under `docs/` for store layout, refs, schema, language, and look. Do not invent a parallel contract.
