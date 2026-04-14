## Why

When a student is soft-deleted (deactivated), their relationships with fathers remain in the `students_fathers` junction table. This leaves orphaned records that still reference the deleted student. Additionally, fathers are left in the system even when they no longer have any active students assigned to them, creating unnecessary data that clutters the system.

## What Changes

- Modify `deactivateStudent` function to cascade-delete the student-father relationships
- When a student is deactivated, hard-delete all rows in `students_fathers` that reference that student
- For each linked father, check if they have other active students
- If a father has no more active students, soft-delete the father (`is_active = false`)
- If the father has a linked app user, hard-delete the user record
- Implement all-or-nothing transaction: rollback on any failure

## Capabilities

### New Capabilities

- `student-father-cascade-delete`: Handles cascading soft-delete of student and cleanup of related fathers when a student is deactivated

### Modified Capabilities

- None

## Impact

- **Code**: `src/lib/pocketbase/students.ts` - modify `deactivateStudent` function
- **Dependencies**: Uses existing functions from `students-fathers.ts` and `fathers.ts`