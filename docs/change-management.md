# Change Management Guide

Last updated: 2026-02-26

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
- Confirm whether temporal fields are impacted (`*_date*`, `*_datetime*`, timestamps).

2. Implementation
- Keep API interactions inside `src/lib/pocketbase/`.
- Keep page components focused on state and rendering.
- Prefer reactive state over hidden DOM fields for internal UI state.
- Ensure temporal values are represented as datetime with timezone offset.

3. Validation
- Run:
  - `bun run test`
  - `bun run build`
- If backend schema/rules changed, verify collection configuration in PocketBase.
- If temporal fields changed, verify offset-aware datetime values are persisted and rendered correctly.
- If form validation UX changed, update or add UI tests for realtime inline field alerts and submit blocking behavior.

4. Documentation
- Update `docs/architecture.md` if responsibilities or data flow changed.
- Update `docs/overview.md` if user-visible scope changed.
- Update `AGENTS.md` if commands/conventions changed.

## Schema And Rules Changes
When changing PocketBase collections/rules:
- Document collection names, field additions/removals, and rule changes.
- Record whether existing records need migration/backfill.
- Note access model impacts (for example `users.is_admin` requirements).
- For temporal fields, migrate date-only or offset-less values to datetime with timezone offset.

## Future Change Log Template
Use this template in PR description or in a dedicated markdown note:

```md
## Change Record
- Date:
- Scope:
- Routes affected:
- Collections/rules affected:
- Temporal fields impacted:
- Files changed:
- Validation run:
- Migration/backfill notes:
- Timezone migration notes:
- Risks/rollback:
```
