## Why

The professor leave creation modal is broken: the semester dropdown doesn't properly default and allows selection of unrelated semesters. Professors should only create leaves for the current semester, so the selector is unnecessary complexity. Additionally, leave dates are not validated against semester boundaries, allowing invalid records where a leave falls outside its assigned semester.

## What Changes

- **Replace semester `<select>` with read-only text** in the professor leave modal — display the current semester name, no dropdown.
- **Fetch only `getCurrentSemester()`** instead of `listSemesterOptions()` when the modal opens — one record, not the full collection.
- **Add client-side date boundary validation** — leave `start_datetime` and `end_datetime` must fall within the current semester's `start_date` and `end_date`.
- **Add server-side date boundary validation** — `createEmployeeLeave` and `updateEmployeeLeave` must reject leaves whose dates fall outside the linked semester's boundaries.
- **Show error state** when no semester has `is_current = true` — disable submission and display a clear message.
- **Lock semester on edit** — when editing an existing leave, display the leave's semester as plain text (never editable by professors).

## Capabilities

### New Capabilities
- `leave-semester-boundary-validation`: Server-side and client-side validation ensuring leave dates fall within the assigned semester's date range.

### Modified Capabilities
- `employee-leaves-semester-linking`: Semester selection changes from a dropdown of all semesters to a read-only display of the current semester. The "leave management UI SHALL require semester selection" requirement is replaced by automatic assignment of the current semester.
- `professor-personal-management`: Professor leave creation is scoped to the current semester only, with date boundary enforcement.

## Impact

- **Frontend**: `src/routes/professor/personal/leaves.tsx` — modal rework (remove select, add text display, update resources and validation). Remove dependency on `listSemesterOptions` import for this route.
- **Frontend**: `src/lib/pocketbase/leaves.ts` — `createEmployeeLeave` and `updateEmployeeLeave` gain semester date boundary checks server-side.
- **Frontend**: Leave form validation logic updated with semester boundary checks.
- **Backend (PocketBase)**: No schema changes needed — `semester_id` relation and `is_current` flag already exist.
- **Admin leave modal** (`staff-management/employees.tsx`): Not affected — admins retain the full semester dropdown.
