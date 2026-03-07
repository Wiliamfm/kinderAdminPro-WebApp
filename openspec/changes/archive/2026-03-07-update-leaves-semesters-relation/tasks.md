## 1. Schema and migration

- [x] 1.1 Add the `semester_id` relation field to the PocketBase `leaves` collection without making it required in the first migration step.
- [x] 1.2 Backfill existing leave records with a deterministic default semester, preferring the current semester and otherwise the semester with the latest `end_date`.
- [x] 1.3 Tighten the `leaves` schema so `semester_id` is required after the backfill succeeds.

## 2. Leave data access and UI

- [x] 2.1 Update `src/lib/pocketbase/leaves.ts` types and mapping logic so leave list/create/update operations read and write `semester_id`.
- [x] 2.2 Load semester options for the leave workflow in `src/pages/staff-employees.tsx`, default new leaves to the current semester when available, and preserve the stored semester when editing.
- [x] 2.3 Add the required semester field, empty-state handling, and validation/error messaging to the leave create/edit modal in `src/pages/staff-employees.tsx`.

## 3. Validation and documentation

- [x] 3.1 Add or update tests covering leave semester persistence, current-semester defaulting, edit prefilling, and blocked submission when no semester is selected or available.
- [x] 3.2 Update affected docs to reflect the new `leaves.semester_id` relation and the leave modal semester-selection behavior.
- [x] 3.3 Run the relevant verification commands for the change, including tests and production build validation.
