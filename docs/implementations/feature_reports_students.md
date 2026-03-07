# Implementation Spec: `bulletins_students` Collection And Reports `Estudiantes` Page

Last updated: 2026-03-07  
Status: Implemented

## Documentation Compliance
- Sensitive data policy: compliant (no secrets, credentials, or PII included).
- Any future examples in this file must use placeholders and redacted values only.

## Summary
Implement a new PocketBase collection named `bulletins_students` and a new admin-only reports page `Estudiantes` under the reports module.

The page must follow the existing bulletins CRUD table patterns:
- sortable columns,
- paginated list,
- create/edit/delete via modal dialogs,
- soft delete using `is_deleted`,
- audit metadata (`created_by`, `updated_by`, `created_at`, `updated_at`).
- a chart section below the table with:
  - students by grade (semester cross-filter),
  - students by semester (grade cross-filter),
  - default all-grades + last-5 semesters view,
  - distinct-student aggregation by `student_id`.

Chosen decisions:
- access model: admin-only,
- relation field name: `student_id`,
- delete policy: non-cascade required relations for `bulletin_id`, `student_id`, `grade_id`, `semester_id`.

## Important Interfaces Or Schema Changes

### Public Route Changes
- Add route: `/reports/students`
- Keep reports entry route: `/reports`
- Add index link in reports section: `Estudiantes -> /reports/students`

### New PocketBase Collection
- Name: `bulletins_students`
- Type: `base`
- Rules:
  - `listRule`: `@request.auth.is_admin = true`
  - `viewRule`: `@request.auth.is_admin = true`
  - `createRule`: `@request.auth.is_admin = true`
  - `updateRule`: `@request.auth.is_admin = true`
  - `deleteRule`: `@request.auth.is_admin = true`

Fields:
- `bulletin_id` relation to `bulletins` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `student_id` relation to `students` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `grade_id` relation to `grades` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `semester_id` relation to `semesters` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `note` number (required, integer-only, `min=1`, suggested `max=10000`)
- `comments` text (optional)
- `created_by` relation to `users` (required, single select)
- `updated_by` relation to `users` (required, single select)
- `created_at` autodate (`onCreate=true`, `onUpdate=false`)
- `updated_at` autodate (`onCreate=true`, `onUpdate=true`)
- `is_deleted` bool (optional, default handled by app)

### New Frontend Data Wrapper
Add `src/lib/pocketbase/bulletins-students.ts` exporting:
- `BulletinStudentRecord`
- `BulletinStudentCreateInput`
- `BulletinStudentUpdateInput`
- `BulletinStudentListSortField`
- `BulletinStudentListSortDirection`
- `PaginatedBulletinsStudentsResult`
- `listBulletinsStudentsPage(page, perPage, options?)`
- `createBulletinStudent(payload)`
- `updateBulletinStudent(id, payload)`
- `softDeleteBulletinStudent(id)`
- `listBulletinStudentFormOptions()`
- `BulletinStudentAnalyticsRecord`
- `listBulletinStudentsAnalyticsRecords()`

## Implementation Plan

### 1) Backend Collection Setup
Create `bulletins_students` in PocketBase admin/API using the schema and rules above.

Data handling requirements:
- `create` must set:
  - `created_by = authUserId`
  - `updated_by = authUserId`
  - `is_deleted = false`
- `update` must refresh:
  - `updated_by = authUserId`
- soft delete must set:
  - `is_deleted = true`
  - `updated_by = authUserId`

### 2) Data Layer Implementation
In `src/lib/pocketbase/bulletins-students.ts`:
- map snake_case PB records to typed TS records,
- use `expand` for normalized display fields:
  - `bulletin_id`
  - `bulletin_id.category_id`
  - `student_id`
  - `grade_id`
  - `semester_id`
  - `created_by`
  - `updated_by`
- filter lists by `is_deleted != true`,
- implement sort map with relation-aware expressions:
  - `bulletin_label -> bulletin_id.category_id.name` (primary proxy)
  - `student_name -> student_id.name`
  - `grade_name -> grade_id.name`
  - `semester_name -> semester_id.name`
  - direct fields for `note`, `comments`, `created_at`, `updated_at`,
  - user-name fields for author columns.

### 3) Reports Page
Create `src/pages/reports-students.tsx` with:
- admin guard redirecting non-admin users to `/reports`,
- heading and summary consistent with current UI language,
- table with columns:
  - `Boletin` (rendered as `category: description`)
  - `Estudiante` (`students.name`)
  - `Grado` (`grades.name`)
  - `Semestre` (`semesters.name`)
  - `Nota`
  - `Comentarios`
  - `Creado`
  - `Actualizado`
  - `Creado por`
  - `Actualizado por`
  - `Acciones` (admin only)
- sort behavior using existing `SortableHeaderCell`,
- pagination using `PaginationControls` and `DEFAULT_TABLE_PAGE_SIZE`,
- create/edit/delete modals using existing `Modal` component,
- touched-based realtime validation for form fields:
  - required relations,
  - required `note` integer > 0,
  - optional `comments`.

### 4) Reports Module Wiring
Update:
- `src/routes.ts` to register `/reports/students`,
- `src/lib/section-index.ts` to add reports link:
  - label: `Estudiantes`
  - href: `/reports/students`
  - `requiresAdmin: true`,
- `src/pages/reports.tsx` to filter links by admin role (same pattern used in staff/enrollment index pages).

### 5) Documentation Updates
Update root docs:
- `docs/overview.md`:
  - include new route and workflow summary,
- `docs/architecture.md`:
  - add `bulletins_students` data model section,
  - add reports `Estudiantes` page design notes and data flow.

### 6) Chart Analytics Section
In `src/pages/reports-students.tsx`:
- render chart form below the main table,
- add chart controls:
  - `Semestre (para gráfico por grado)`,
  - `Grado (para gráfico por semestre)`,
- draw two vertical bar charts with Chart.js,
- use distinct `student_id` counting per bucket to avoid duplicate row overcount,
- default to all grades and last 5 semesters when the related chart filter is `Todos`.

## Test Cases And Scenarios

### Data Layer Tests
Create `src/lib/pocketbase/bulletins-students.test.ts`:
- list query uses expected sort/filter/expand,
- create sets audit fields and defaults,
- update refreshes `updated_by`,
- soft delete sets `is_deleted=true` and `updated_by`,
- analytics query fetches minimal fields with `is_deleted != true`,
- analytics mapper excludes incomplete rows,
- missing authenticated user fails with clear error,
- errors are normalized and rethrown.

### Page Tests
Create `src/pages/reports-students.test.tsx`:
- redirects non-admin users to `/reports`,
- renders normalized row values (`category: description`, `student_name`),
- create modal flow submits expected payload,
- edit modal flow submits expected payload,
- delete flow triggers soft-delete call,
- sortable header changes request sort params,
- pagination triggers page fetch,
- initial chart render uses all grades and last 5 semesters,
- chart cross-filters recalculate buckets correctly,
- chart empty state renders when analytics query has no rows,
- validation blocks invalid `note` values (empty, zero, negative, non-integer where applicable).

### Validation Commands
- `bun run test`
- `bun run build`

## Assumptions And Defaults
- Field typo `studend_id` is corrected to `student_id`.
- Access is admin-only for both backend rules and UI behavior.
- Delete restrictions rely on relation integrity (`cascadeDelete=false`) for hard deletes.
- Existing bulletin soft delete behavior remains unchanged unless later explicitly revised.
- `note` uses integer semantics and minimum value `1`.
- Route slug is `/reports/students` to match current route naming conventions.
