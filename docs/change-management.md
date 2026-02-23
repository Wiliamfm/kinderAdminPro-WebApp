# Change Management Guide

Last updated: 2026-02-23

## Purpose
Define a consistent process for implementing and documenting future changes safely.

## Source Of Truth
- Process baseline: `AGENTS.md`
- Architecture and boundaries: `docs/architecture.md`

## Change Checklist
Use this checklist for every non-trivial change:

1. Scope
- Identify affected routes, components, and PocketBase wrappers.
- Confirm whether auth/rules/schema are impacted.

2. Implementation
- Keep API interactions inside `src/lib/pocketbase/`.
- Keep page components focused on state and rendering.
- Prefer reactive state over hidden DOM fields for internal UI state.

3. Validation
- Run:
  - `bun run test`
  - `bun run build`
- If backend schema/rules changed, verify collection configuration in PocketBase.

4. Documentation
- Update `docs/architecture.md` if responsibilities or data flow changed.
- Update `docs/overview.md` if user-visible scope changed.
- Update `AGENTS.md` if commands/conventions changed.

## Schema And Rules Changes
When changing PocketBase collections/rules:
- Document collection names, field additions/removals, and rule changes.
- Record whether existing records need migration/backfill.
- Note access model impacts (for example `users.is_admin` requirements).

## Future Change Log Template
Use this template in PR description or in a dedicated markdown note:

```md
## Change Record
- Date:
- Scope:
- Routes affected:
- Collections/rules affected:
- Files changed:
- Validation run:
- Migration/backfill notes:
- Risks/rollback:
```
