## Why

Professors can view their students but cannot record academic observations or grades against institutional bulletins. The Gestión de Estudiantes module needs to close this gap so professors can create and update bulletin entries per student for the current semester directly from the student list.

## What Changes

- Student rows in `/professor/students` become clickable links to a new detail page.
- Grade filter dropdown is removed; students are now displayed flat with grade section headers.
- New page `/professor/students/:id` shows all bulletins defined for the student's grade and lets the professor enter or edit a note and comments per bulletin for the current semester.
- Bulletin entries from past semesters are shown in a collapsed accordion (read-only, descending order) below the active table.
- `semester_id` is always the current semester and is never exposed as an editable field.
- The `bulletins_students` collection gains professor-level create/update permissions (scoped to their assigned grades).
- A new sync script configures those collection rules in PocketBase.
- **BREAKING** (spec): `professor-student-view` requirement "view SHALL be read-only" is superseded — the page now routes to a write-capable detail view.

## Capabilities

### New Capabilities

- `professor-student-grading`: Detail page (`/professor/students/:id`) where a professor records or edits note + comments for each bulletin in the student's grade for the current semester, with a read-only accordion for past-semester history.

### Modified Capabilities

- `professor-student-view`: Student rows are now clickable (navigate to detail page); grade filter dropdown is replaced by flat grade-header grouping; the read-only constraint is removed from the list page itself (write actions live on the detail page).

## Impact

- **New file**: `src/pages/professor-student-detail.tsx`
- **Modified file**: `src/pages/professor-students.tsx` (grouping + row links)
- **Modified file**: `src/routes.ts` (add `/professor/students/:id`)
- **New lib function**: `listBulletinsByGradeId` in `src/lib/pocketbase/bulletins.ts`
- **New lib function**: `listBulletinStudentsByStudentAndGrade` in `src/lib/pocketbase/bulletins-students.ts`
- **New script**: `scripts/sync-bulletins-students-professor-rules.sh`
- **PocketBase**: `bulletins_students` collection rules updated for professor role
