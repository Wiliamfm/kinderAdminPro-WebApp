## Context

The professor portal already loads students grouped by the professor's assigned grades (`grades.employee_id → employees`). The `bulletins_students` collection is the existing write target for academic observations; it is currently admin-only and used by the reports module. This change extends it to professors, scoped to their own grades.

The stack is SolidJS + PocketBase. Existing professor pages follow the pattern: load employee → load grades → load data. The detail page follows the same pattern plus loading bulletins and existing entries.

## Goals / Non-Goals

**Goals:**
- Replace the grade filter dropdown on `/professor/students` with flat grade-header grouping and clickable rows.
- New `/professor/students/:id` page shows bulletins for the student's grade and the professor's entries for the current semester.
- Inline editing (note + comments) per bulletin row; no separate modal.
- Collapsed accordion below the active table for past-semester entries (read-only, descending by semester).
- `semester_id` is always derived from `getCurrentSemester()`; never user-selectable.
- New sync script grants professors create/update on `bulletins_students` scoped to their grades.

**Non-Goals:**
- Professors cannot delete bulletin entries (admin only).
- Professors cannot create or manage bulletins themselves (admin scope).
- No pagination on the detail page bulletin list (bulletin count per grade is small).
- No offline or optimistic update support.

## Decisions

### Inline editing vs. modal
Inline editing is used because each row maps 1:1 to a bulletin and the fields are minimal (note + comments). A modal would add unnecessary navigation overhead for what is essentially a two-field form per row.

Rows render in two modes:
- **View mode**: note and comments shown as text; "Editar" / "Agregar" button on the right.
- **Edit mode**: note becomes a number input; comments becomes a textarea; Save + Cancel buttons replace the action button. Only one row can be in edit mode at a time.

### Semester derivation
The current semester is loaded once via `getCurrentSemester()`. Its ID is attached to every create/update call. The professor never sees or changes it. If no semester is marked current, the create/edit action is disabled with an explanatory message.

### Past-semester history accordion
`listBulletinStudentsByStudentAndGrade` returns all entries for the student. Entries are partitioned:
- `current`: `semester_id === currentSemester.id`
- `history`: everything else, sorted descending by `created_at`

The history section is a single `<details>` / `<summary>` element (or a `Show`-gated div with a toggle signal). It is collapsed by default.

### Data loading on detail page
Four parallel resources on mount:
1. `getStudentById(id)` — student + grade_id
2. `getEmployeeByUserId(authUserId)` — to verify the professor owns the grade
3. `getCurrentSemester()` — current semester
4. After grade_id known: `listBulletinsByGradeId(grade_id)` + `listBulletinStudentsByStudentAndGrade(student_id, grade_id)` — these two can be fetched in parallel once grade_id resolves

Access guard: if the student's grade is not in the professor's assigned grades, redirect to `/professor/students`.

### New lib functions

**`listBulletinsByGradeId(gradeId: string): Promise<BulletinRecord[]>`**
`pb.collection('bulletins').getFullList({ filter: pb.filter('grade_id = {:id} && is_deleted != true', { id: gradeId }), sort: 'description' })`

**`listBulletinStudentsByStudentAndGrade(studentId: string, gradeId: string): Promise<BulletinStudentRecord[]>`**
Reuses the existing `listBulletinsStudentsPage` filter pattern but as a `getFullList`, filtering on `student_id` + `grade_id` + `is_deleted != true`.

### PocketBase rules for `bulletins_students`

| Operation | Rule |
|-----------|------|
| list      | `grade_id.employee_id.user_id = @request.auth.id \|\| @request.auth.is_admin = true` |
| view      | same as list |
| create    | `@request.auth.roles ?= "professor" \|\| @request.auth.is_admin = true` |
| update    | `grade_id.employee_id.user_id = @request.auth.id \|\| @request.auth.is_admin = true` |
| delete    | `@request.auth.is_admin = true` |

## Risks / Trade-offs

- **No bulletin entry yet for current semester → professor sees "Agregar" for every row on first visit.** This is expected and desirable; no mitigation needed.
- **Race condition on inline save** — if two tabs save the same entry simultaneously, the second write wins silently. Low risk for this use case; no mitigation.
- **Grade ownership check is client-side** — the PocketBase update rule enforces server-side ownership, so an unauthorized save attempt will receive a 403 and surface an error to the professor.
- **`getCurrentSemester()` returns null** — create/edit actions are disabled; a banner informs the professor no active semester is configured. This mirrors the leaves module pattern.
