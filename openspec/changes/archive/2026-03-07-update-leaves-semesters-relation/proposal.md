## Why

Leaves currently do not store a direct semester relation, which makes semester-scoped leave workflows depend on derived date overlap instead of explicit data. Adding a required semester link now aligns leaves with the rest of the reporting model and lets the staff leave form capture the semester intentionally.

## What Changes

- Add a required `semester_id` relation to the `leaves` collection.
- Update the leave create/edit modal in `src/pages/staff-employees.tsx` to capture a required semester value when saving a leave.
- Backfill existing leave records with a default semester so the new required relation can be enforced for legacy data.
- Update leave-related data access, validation, and downstream consumers to read and persist the semester relation consistently.

## Capabilities

### New Capabilities
- `employee-leaves-semester-linking`: Store each leave with a required semester relation and require the leave management UI to create and edit that relation.

### Modified Capabilities

## Impact

- PocketBase `leaves` schema and migration/backfill data.
- Leave wrapper logic in `src/lib/pocketbase/leaves.ts` and related tests.
- Employee leave modal workflow in `src/pages/staff-employees.tsx`.
- Documentation covering leaves data flow and any leave reporting behavior that currently derives semester membership from date overlap.
