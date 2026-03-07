## Context

`leaves` currently stores only `employee_id`, `start_datetime`, and `end_datetime`, while other semester-aware features in the project use an explicit `semester_id` relation to `semesters`. The leave management UI in `src/pages/staff-employees.tsx` lets admins create and edit leave ranges, but it does not currently capture semester context.

This change introduces a data-model update, a legacy-data backfill, and a form contract change in the same workflow. That makes the implementation more than a simple field addition: existing leave rows must remain valid, the modal must enforce the new required input, and leave-related wrappers and consumers must be able to read and persist the semester relation consistently.

Stakeholders are admin users managing employee leave history and any downstream features that need leave records grouped by a semester without re-deriving membership from leave dates.

## Goals / Non-Goals

**Goals:**
- Add a `semester_id` relation to `leaves` and make it required once existing data has been backfilled.
- Update the leave create/edit modal in `src/pages/staff-employees.tsx` to require a semester selection.
- Preserve editability of historical leave records by allowing historical semester assignment instead of forcing the current semester only.
- Backfill legacy leave rows with a deterministic default semester so the rollout is repeatable and auditable.
- Update leave wrappers, tests, and documentation so the semester relation is treated as part of the leave record contract.

**Non-Goals:**
- Redesign leave overlap validation, pagination, or sorting behavior beyond what is needed to carry `semester_id`.
- Create a new semesters management workflow or seed new semester records automatically.
- Rework unrelated invoice or employee reporting UX outside the leave-related data contract.
- Introduce server-side aggregation or reporting APIs as part of this artifact.

## Decisions

### 1. Add `semester_id` to the `leaves` record contract across schema, wrapper, and UI layers

The canonical leave model will become:
- `employee_id`
- `semester_id`
- `start_datetime`
- `end_datetime`

`src/lib/pocketbase/leaves.ts` will be updated so list/create/update operations map `semester_id` alongside the existing temporal fields. Leave-facing TypeScript types should expose `semesterId`, and list responses may also expose `semesterName` when the relation is expanded for display needs.

This keeps the data contract aligned with other semester-scoped collections and removes the need for leaves to be semester-agnostic at persistence time.

Alternative considered:
- Keep `leaves` schema unchanged and continue deriving semester from date overlap everywhere. Rejected because this change exists specifically to make semester an explicit relation, not an inferred property.

### 2. The leave modal will use a required semester selector, with current-semester defaulting only for new rows

The leave modal in `src/pages/staff-employees.tsx` should load semester options and render a required select field in the create/edit form. For new leaves, the form should preselect the current semester when one exists to reduce admin friction. For edits, the form should preserve and show the leave’s stored semester instead of overwriting it with the current one.

The selector should remain editable rather than read-only. Historical leave corrections are a valid admin workflow, and forcing the current semester would make backfilled or older leave records harder to repair.

If there are no semesters available, the modal should block submission and show a clear admin-facing error rather than attempting to create an invalid leave.

Alternative considered:
- Use a read-only current semester, matching invoice creation. Rejected because leave records may need to point to past semesters and editing old leaves is already part of the workflow.
- Infer semester from the leave dates and hide the field. Rejected because the requirement is to include a required semester parameter in the form and persisted record.

### 3. Roll out the required relation with a two-phase migration

Because legacy leave rows already exist, the safest implementation is:
1. Add `semester_id` as a relation on `leaves` without enforcing required validation yet.
2. Backfill existing leave rows with a default semester.
3. Make `semester_id` required once all rows are populated.

This avoids a broken intermediate state where old rows fail validation before a backfill can be applied.

Alternative considered:
- Add the field as required immediately and rely on one-time manual fixes. Rejected because it risks blocking deployments and creates avoidable recovery work if any legacy rows are missed.

### 4. Legacy leave backfill should be deterministic, not random

Although any existing semester could satisfy the user-visible requirement for legacy rows, the migration should choose a stable default semester:
- prefer the current semester when one exists,
- otherwise fall back to the most recently ending semester.

This produces repeatable migration behavior, gives admins a sensible default, and makes the backfill explainable if legacy records are reviewed later.

Alternative considered:
- Pick a random semester for each legacy leave. Rejected because it is not reproducible, makes audits harder, and can create inconsistent results across environments.

### 5. Downstream leave consumers should prefer the explicit semester relation after migration

Any leave-related consumer that currently treats semester membership as derived data should be updated to read `semester_id` as the primary source of truth once the field exists. During rollout, relation-aware code can remain tolerant of old shapes only if needed for migration sequencing, but the steady-state model should be explicit relation usage rather than overlap-derived grouping.

This keeps leave behavior consistent with the new persistence contract and avoids long-term drift between stored semester intent and inferred semester calculations.

Alternative considered:
- Keep downstream consumers permanently overlap-based even after adding `semester_id`. Rejected because it would undermine the purpose of the new relation and allow persisted data and reporting logic to diverge.

## Risks / Trade-offs

- [No semesters exist in an environment during rollout] -> Treat at least one semester record as a deployment prerequisite; block new leave submissions and fail the backfill clearly instead of silently inserting invalid data.
- [Backfilled semester values may not reflect the original historical intent of legacy leaves] -> Use a deterministic default, document the rule, and keep the semester editable in the admin UI so records can be corrected later.
- [Updating downstream consumers may conflict with earlier overlap-based assumptions] -> Move consumers to `semester_id` deliberately and cover the new contract with wrapper and UI tests so regressions surface quickly.
- [Adding another required field increases modal friction] -> Preselect the current semester for new leaves when possible and preserve touched-based validation messaging so the form remains predictable.

## Migration Plan

1. Update the PocketBase `leaves` collection schema to add relation field `semester_id -> semesters`.
2. Ship wrapper and UI support that can read and write `semester_id` in the leave modal flow.
3. Run a backfill for existing leave rows using current semester first, otherwise latest semester by `end_date`.
4. Tighten the schema so `semester_id` becomes required for all future writes.
5. Update tests and documentation for the new leave record contract and any affected leave consumers.
6. Validate the change with the relevant test/build commands before rollout.

Rollback strategy:
- Relax the required constraint on `semester_id` if deployment needs to be reversed.
- Revert frontend and wrapper changes that require the field.
- Keep backfilled values in place; they are additive and do not prevent returning to an optional relation temporarily.

## Open Questions

- None. The implementation can proceed with an editable required semester selector, deterministic legacy backfill, and a two-phase relation rollout.
