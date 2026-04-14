## Context

When a student is soft-deleted via `deactivateStudent(id)`, only the `students.active` field is set to `false`. The `students_fathers` junction table records remain, creating orphaned relationships. Fathers with no remaining active students are also left in the system unnecessarily.

Current data model:
```
students --(student_id)--> students_fathers --(father_id)--> fathers --(user_id)--> users
```

## Goals / Non-Goals

**Goals:**
- Cascade soft-delete when `deactivateStudent` is called
- Remove all `students_fathers` junction rows for the deactivated student
- Soft-delete fathers who have no remaining active students
- Hard-delete the linked app user when father is deleted
- All-or-nothing transaction: rollback entire operation on failure

**Non-Goals:**
- Hard deletion of students (only soft-delete supported)
- Batch deletion (support single student only)
- Father-side cascade (handled by existing behavior)

## Decisions

### 1. Operation Order

**Decision:** Delete junction rows first, then soft-delete student, then handle fathers.

**Rationale:** If student soft-delete fails after junctions are deleted, we can re-create junctions from known data. If a father's user deletion fails (final step), we have already done the softer deletes - this is acceptable as user deletion rarely fails and if it does, the father record is already soft-deleted.

```
1. Read: Collect fathers + user_ids (for potential rollback)
2. Hard Delete: Junction rows
3. Soft Delete: student
4. For each father:
   a. Count remaining active students
   b. If 0: soft-delete father
   c. If father has user_id: hard-delete user
```

### 2. Rollback Strategy

**Decision:** Re-create junction links using known father IDs.

**Rationale:** We store the father IDs from step 1. If any failure occurs after junction deletion, we use `createLinksForStudent` to restore relationships.

### 3. Father Already Soft-Deleted

**Decision:** Skip father soft-delete if already `is_active = false`.

**Rationale:** Avoid unnecessary updates.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| PocketBase operation fails mid-way | Catch errors, rollback state using collected data |
| User deletion fails (rare) | Already soft-deleted father; log error, allow operation to succeed |
| Race condition (father gets new student between check and delete) | Count is performed inside operation; small window |

## Migration Plan

1. Modify `src/lib/pocketbase/students.ts` - update `deactivateStudent` function
2. No database migration needed (only app logic changes)
3. Test with existing test suite