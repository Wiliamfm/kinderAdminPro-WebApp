## 1. Backend permissions (sync script)

- [x] 1.1 Create `scripts/sync-bulletins-students-professor-rules.sh` that updates `bulletins_students` collection rules: list/view scoped to `grade_id.employee_id.user_id = @request.auth.id || admin`, create allows professor role, update scoped to grade ownership, delete admin-only
- [x] 1.2 Run `scripts/sync-bulletins-students-professor-rules.sh` and verify rules applied in PocketBase admin

## 2. Data layer — new lib functions

- [x] 2.1 Add `listBulletinsByGradeId(gradeId: string): Promise<BulletinRecord[]>` to `src/lib/pocketbase/bulletins.ts` using `getFullList` with `grade_id` and `is_deleted != true` filter, sorted by `description`
- [x] 2.2 Add `listBulletinStudentsByStudentAndGrade(studentId: string, gradeId: string): Promise<BulletinStudentRecord[]>` to `src/lib/pocketbase/bulletins-students.ts` using `getFullList` filtered by `student_id`, `grade_id`, and `is_deleted != true`

## 3. List page refactor (`professor-students.tsx`)

- [x] 3.1 Remove grade filter dropdown signal and UI
- [x] 3.2 Replace single student table with `<For each={grades}>` rendering a grade-name section header followed by a nested `<For>` of that grade's students
- [x] 3.3 Make each student row a clickable element that navigates to `/professor/students/{student.id}` (use `useNavigate` or an `<A>` link)
- [x] 3.4 Verify empty states still render correctly (no employee record, no grades, no students)

## 4. New route

- [x] 4.1 Import `ProfessorStudentDetailPage` (lazy or direct) in `src/routes.ts`
- [x] 4.2 Add route `{ path: '/professor/students/:id', component: ProfessorStudentDetailPage }` to the routes array

## 5. Detail page — scaffold and data loading (`professor-student-detail.tsx`)

- [x] 5.1 Create `src/pages/professor-student-detail.tsx` with access guard: load employee, load grades for employee, if student's grade not in professor's grades redirect to `/professor/students`
- [x] 5.2 Load student via `getStudentById(params.id)` and derive `grade_id`
- [x] 5.3 Load current semester via `getCurrentSemester()`
- [x] 5.4 Load bulletins for the grade via `listBulletinsByGradeId(grade_id)` and existing entries via `listBulletinStudentsByStudentAndGrade(student_id, grade_id)` — build a lookup map keyed by `bulletin_id`
- [x] 5.5 Render student header: name, grade name, document ID, current semester name (display only)
- [x] 5.6 Show a banner and disable actions when no current semester is configured

## 6. Detail page — active-semester bulletin table

- [x] 6.1 Render one row per bulletin with columns: bulletin description, note, comments, action
- [x] 6.2 Rows default to view mode: show saved note and comments (or dashes if no entry), with "Editar" or "Agregar" button
- [x] 6.3 Clicking the action button enters edit mode for that row (number input for note, textarea for comments); any previously open row closes first
- [x] 6.4 Implement Save: call `createBulletinStudent` or `updateBulletinStudent` with `bulletin_id`, `student_id`, `grade_id`, current `semester_id`; on success return row to view mode with updated values
- [x] 6.5 Implement Cancel: return row to view mode with original values, no API call
- [x] 6.6 Show inline error message on the row if the save fails

## 7. Detail page — history accordion

- [x] 7.1 Partition entries into current-semester and past-semester groups
- [x] 7.2 Render past entries in a collapsible section (collapsed by default) using a toggle signal + `Show`; sort descending by `created_at`
- [x] 7.3 History rows are read-only (no action column); display bulletin description, note, comments, and semester name
- [x] 7.4 Do not render the history section at all when there are no past entries

## 8. Validation and edge cases

- [x] 8.1 Note field: accept decimals, enforce min 0 max 10 (or project-appropriate range) client-side before saving
- [x] 8.2 Guard against saving when `note` is empty (required field)
- [x] 8.3 Handle loading and error states for all resources on the detail page (show spinner or error message)
- [x] 8.4 Back button on detail page navigates to `/professor/students`
