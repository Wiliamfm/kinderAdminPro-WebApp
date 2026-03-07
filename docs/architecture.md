# Architecture Reference

Last updated: 2026-03-07

## Purpose
Provide a stable technical reference for module responsibilities, data flow, and key design constraints.

## Source Of Truth
- Route definitions: `src/routes.ts`
- App shell and guards: `src/app.tsx`, `src/lib/auth/guard.ts`
- PocketBase wrappers: `src/lib/pocketbase/*.ts`
- Main leaves workflow UI: `src/pages/staff-employees.tsx`

## Frontend Structure
- `src/pages/`: route-level pages and feature workflows.
- `src/components/`: reusable UI components (for example `Modal.tsx`).
- `src/lib/`: non-UI logic, auth guards, PocketBase API wrappers, helpers.
- `src/test/`: global test setup.

## Table Sorting Standard
- All data columns in page tables and modal tables are sortable via clickable headers.
- Action columns are intentionally not sortable.
- Sort toggle behavior is `asc`/`desc`; selecting a different column starts in `asc`.
- All route and modal tables are paginated with `10` rows per page.
- Sorting for paginated tables is handled server-side so order remains consistent across pages.
- Shared pagination UI controls live in `src/components/PaginationControls.tsx`.

## Form Validation Pattern
- Admin forms use touched-based realtime validation.
- Shared helpers live in `src/lib/forms/realtime-validation.ts`.
- Inline per-field alerts use `src/components/InlineFieldAlert.tsx` and are rendered under inputs/selects/file fields.
- API/backend errors remain as form-level alert blocks (for example submit/network failures).

## Data Access Pattern
- PocketBase SDK initialization and error normalization live in `src/lib/pocketbase/client.ts`.
- Feature modules wrap collection calls and expose typed functions.
- UI pages call wrapper functions via `createResource` and action handlers.
- Wrapper modules use mapper functions to keep camelCase TypeScript semantics while translating to PocketBase snake_case fields (for example `employeeId` <-> `employee_id`).

## Temporal Data Standard
- Canonical temporal format is RFC3339 datetime with timezone offset (for example `2026-02-26T14:30:00-05:00` or UTC `Z` form).
- All temporal fields must use PocketBase `date` type and store offset-aware datetime values.
- New temporal fields should use `*_datetime` naming. Legacy names may remain (for example `date_of_birth`) but still store offset-aware datetime values.
- When UI uses `datetime-local`, wrapper/page logic must convert it before API calls.
- Schema changes involving temporal fields require migration of existing offset-less/date-only values.

## Authorization Model
- App login uses PocketBase `users` auth collection.
- Admin-gated UI behavior uses `users.is_admin` read from auth store.
- Leaves collection rules are admin-only (`@request.auth.is_admin = true`).
- Important distinction: PocketBase dashboard superusers are not the same as `users` records.
- App users management route (`/staff-management/app-users`) is admin-only and redirects non-admin users to `/staff-management`.
- Employee jobs route (`/staff-management/jobs`) is admin-only and redirects non-admin users to `/staff-management`.

## Employee Onboarding Design
- Employee creation is handled in `src/pages/staff-employees.tsx` with an admin-only modal.
- Data flow for create:
  - `users.create` via `src/lib/pocketbase/users.ts` (`is_admin` forced to `false`),
  - `employees.create` via `src/lib/pocketbase/employees.ts` with relations `user_id` and `job_id`,
  - required `employees.document_id` (numeric string, length `4-20`, unique),
  - optional `employees.cv` upload (PDF only, max 10 MB),
  - onboarding trigger via `users.requestPasswordReset`.
- Recovery behavior:
  - if invite email fails, created records are kept,
  - admin can resend onboarding from the employee row action.
- Employee list table includes a `CV` column that renders `Ver CV` when a file exists.
- Employee edit route (`src/pages/staff-employee-edit.tsx`) allows optional CV replacement.
- Onboarding routes:
  - `/auth/set-password` confirms password-reset token and sets initial password.

## App Users Management Design
- UI location: `src/pages/app-users.tsx`.
- Data source: `users` collection via `src/lib/pocketbase/users.ts`.
- Table fields:
  - `name`,
  - `is_admin`,
  - `email`.
- Row actions:
  - edit via modal (`name`, `email`, `is_admin`),
  - delete via confirmation modal.
- Email update behavior:
  - own user email is requested through PocketBase email-change flow (confirmation required),
  - other users email is managed from PocketBase Admin.
- Safety rule:
  - authenticated user cannot delete itself; UI hides self-delete and handler blocks it if attempted.

## Employee Jobs Design
- UI location: `src/pages/staff-jobs.tsx`.
- Data source: `employee_jobs` collection via `src/lib/pocketbase/employee-jobs.ts`.
- Table fields:
  - `name`,
  - `salary`.
- Row actions:
  - create via modal,
  - edit via modal,
  - delete via confirmation modal.
- Safety rule:
  - delete is blocked when one or more active employees are linked to the job.
- Migration note:
  - employees now use relation `employees.job_id` (required) instead of legacy `employees.job` and `employees.salary`.
  - existing employees were backfilled to the default job `Cargo por definir`.
  - employees include required unique `document_id` (numeric string, length `4-20`) with generated backfill for legacy rows.

## Leaves Feature Design
- UI location: `src/pages/staff-employees.tsx` modal under employee actions.
- Table behavior:
  - sorted by `start_datetime` descending,
  - paginated (`10` rows/page),
  - row action to edit and prefill form.
- Form behavior:
  - accepts `datetime-local` inputs,
  - converts local input to offset-aware ISO datetime before API calls (persisted as UTC `Z`),
  - validates `end > start`,
  - blocks overlap using API check.
- Edit mode:
  - tracked with reactive state (`editingLeaveId`),
  - submit performs create or update depending on edit state.

## Invoices Data Model
- `invoice_files` collection stores invoice file attachments.
- `invoices` collection stores one-to-many employee invoices:
  - relation `employee_id` -> `employees` (n:1),
  - relation `file_id` -> `invoice_files` (n:1),
  - relation `semester_id` -> `semesters` (n:1, required),
  - text field `name` for normalized original filename plus datetime suffix (`YYYYMMDD_HHMM`),
  - `creation_datetime` autodate (`onCreate: true`),
  - `update_datetime` autodate (`onCreate: true`, `onUpdate: true`),
  - access rules mirror admin-only leaves access.
- UI behavior in `src/pages/staff-employees.tsx`:
  - upload action appears as a dedicated icon in each employee row (admin only),
  - upload flow is `invoice_files.create` then `invoices.create` with current active semester (`is_current = true`),
  - create is blocked when there is no active semester,
  - semester value is required and rendered as a read-only field in invoice modal forms,
  - invoice table rows include a replace action that uploads a new file and updates `invoices.file_id` without changing `invoices.semester_id`,
  - invoice list is filtered by `employee_id` and sorted by `-update_datetime`,
  - filename shown in history table comes from `invoices.name`,
  - displayed date column uses `update_datetime` fallback to `creation_datetime`.

## Students Data Model
- `students` collection stores enrollment student records with admin-only access.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `name` (required text),
  - `grade_id` (required relation to `grades`, one student belongs to one grade),
  - `date_of_birth` (required `date`, datetime with timezone offset),
  - `birth_place` (required text),
  - `department` (required text),
  - `document_id` (required text, digits only, unique index),
  - `weight` (optional number, decimal allowed),
  - `height` (optional number, decimal allowed),
  - `blood_type` (required single select: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`),
  - `social_security` (optional text),
  - `allergies` (optional text),
  - `active` (optional bool used for soft delete, where active list filters `active = true`).
- Frontend modules:
  - list/create/soft-delete page: `src/pages/enrollment-students.tsx`,
  - edit page: `src/pages/enrollment-student-edit.tsx`,
  - wrapper/API access: `src/lib/pocketbase/students.ts`.
- Routing:
  - `/enrollment-management/students`,
  - `/enrollment-management/students/:id`.

## Fathers Data Model
- `fathers` collection stores student parent/tutor records with admin-only access.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `full_name` (required text),
  - `document_id` (required text, unique index),
  - `phone_number` (optional text),
  - `occupation` (optional text),
  - `company` (optional text),
  - `email` (optional email, non-unique),
  - `address` (optional text),
  - `is_active` (optional bool used for soft delete, where active lists filter `is_active != false`).
- Indexes:
  - `CREATE UNIQUE INDEX idx_fathers_document_id ON fathers (document_id)`.
- Frontend modules:
  - list/create/soft-delete page: `src/pages/enrollment-tutors.tsx`,
  - edit page: `src/pages/enrollment-tutor-edit.tsx`,
  - wrapper/API access: `src/lib/pocketbase/fathers.ts`.
- Routing:
  - `/enrollment-management/tutors`,
  - `/enrollment-management/tutors/:id`.

## Student-Father Relation Model
- `students_fathers` collection models n:n links between `students` and `fathers`.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `student_id` (required relation to `students`, `maxSelect = 1`),
  - `father_id` (required relation to `fathers`, `maxSelect = 1`),
  - `relationship` (required single select: `father`, `mother`, `other`),
  - `created_at` (autodate, set on create, not updated on edit).
- Indexes:
  - `CREATE UNIQUE INDEX idx_students_fathers_student_father ON students_fathers (student_id, father_id)`,
  - `CREATE INDEX idx_students_fathers_father_id ON students_fathers (father_id)`,
  - `CREATE INDEX idx_students_fathers_created_at ON students_fathers (created_at)`.
- Frontend usage:
  - relation management helpers live in `src/lib/pocketbase/students-fathers.ts`,
  - all `students_fathers` reads use `sort: created_at,id`,
  - student and tutor create/edit forms use repeatable link rows (`counterpart + relationship`),
  - both flows enforce at least one linked counterpart on create and edit.

## Grades Data Model
- `grades` collection stores enrollment grades with admin-only access.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `name` (required text, unique index),
  - `capacity` (required integer number greater than 0).
- Relation behavior:
  - `students.grade_id` defines a one-to-many relation (`grades` -> many `students`),
  - grade deletion is blocked at UI level when active students are linked to the target grade.
- Frontend modules:
  - list/create/edit/delete page: `src/pages/enrollment-grades.tsx`,
  - wrapper/API access: `src/lib/pocketbase/grades.ts`.
- Routing:
  - `/enrollment-management/grades`.

## Semesters Data Model
- `semesters` collection stores enrollment semester periods with admin-only access.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `name` (required text, unique index),
  - `start_date` (required `date`, datetime with timezone offset),
  - `end_date` (required `date`, datetime with timezone offset),
  - `is_current` (bool, default `false`; omitted/null inputs are persisted as `false`),
  - `created_at` (autodate, set on create),
  - `updated_at` (autodate, set on create and update).
- Indexes:
  - `CREATE UNIQUE INDEX idx_semesters_name ON semesters (name)`.
  - `CREATE UNIQUE INDEX idx_semesters_single_current ON semesters (is_current) WHERE is_current = true`.
- Semesters business rules:
  - only one semester can have `is_current = true` at the same time,
  - when a create/edit action sets one semester as current, any previously current semester is automatically set to `false`,
  - when `is_current = true`, date validation requires `start_date <= today <= end_date`.
- Frontend modules:
  - list/create page: `src/pages/enrollment-semesters.tsx`,
  - edit page: `src/pages/enrollment-semester-edit.tsx`,
  - wrapper/API access: `src/lib/pocketbase/semesters.ts`.
- Routing:
  - `/enrollment-management/semesters`,
  - `/enrollment-management/semesters/:id`.

## Bulletins Data Model
- `bulletin_categories` collection stores bulletin categories with admin-only access.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- `bulletin_categories` fields:
  - `name` (required text, unique index),
  - `description` (required text),
  - `created_at` (autodate, set on create),
  - `updated_at` (autodate, set on create and update).
- Indexes:
  - `CREATE UNIQUE INDEX idx_bulletin_categories_name ON bulletin_categories (name)`.
- `bulletins` collection stores student academic-history bulletin records with admin-only access.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- `bulletins` fields:
  - `category_id` (required relation to `bulletin_categories`, `maxSelect = 1`),
  - `grade_id` (required relation to `grades`, `maxSelect = 1`),
  - `description` (required text),
  - `created_by` (required relation to `users`, `maxSelect = 1`),
  - `updated_by` (required relation to `users`, `maxSelect = 1`),
  - `created_at` (autodate, set on create),
  - `updated_at` (autodate, set on create and update),
  - `is_deleted` (bool used for soft delete, where active list filters `is_deleted != true`).
- Frontend modules:
  - list/create/edit/delete page: `src/pages/enrollment-bulletins.tsx`,
  - wrappers/API access: `src/lib/pocketbase/bulletin-categories.ts` and `src/lib/pocketbase/bulletins.ts`.
- Deletion behavior:
  - `bulletins` delete action is soft delete (`is_deleted = true`),
  - `bulletin_categories` delete action is hard delete and blocked in UI when linked bulletins exist.
- Routing:
  - `/enrollment-management/bulletins`.

## Reports Students Data Model
- `bulletins_students` collection stores report rows linking bulletin, student, grade, and semester.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `bulletin_id` (required relation to `bulletins`, `maxSelect = 1`, `cascadeDelete = false`),
  - `student_id` (required relation to `students`, `maxSelect = 1`, `cascadeDelete = false`),
  - `grade_id` (required relation to `grades`, `maxSelect = 1`, `cascadeDelete = false`),
  - `semester_id` (required relation to `semesters`, `maxSelect = 1`, `cascadeDelete = false`),
  - `note` (required integer number, minimum `1`),
  - `comments` (optional text),
  - `created_by` (required relation to `users`, `maxSelect = 1`),
  - `updated_by` (required relation to `users`, `maxSelect = 1`),
  - `created_at` (autodate, set on create),
  - `updated_at` (autodate, set on create and update),
  - `is_deleted` (bool used for soft delete, where active list filters `is_deleted != true`).
- Frontend modules:
  - list/create/edit/delete page: `src/pages/reports-students.tsx`,
  - wrapper/API access: `src/lib/pocketbase/bulletins-students.ts`.
- Data flow:
  - list queries are paginated and server-sorted with relation expansions for bulletin, category, student, grade, semester, and users,
  - default list sort is `created_at` descending; users can switch sort through column headers,
  - list filters are server-side and combined with `AND` for `grade_id`, `semester_id`, and exact selected `student_id` values,
  - filter form includes specific-student datalist search by `students.document_id`; suggestions appear only after typing and selecting one or more students applies exact `student_id` matches for those selections,
  - suggestion labels use `document_id (name)`,
  - filter form uses explicit apply/clear actions; clear restores default filters and `created_at` descending sort,
  - export action fetches all rows matching currently applied filters and generates one PDF grouped by `grade` then `semester`,
  - within each PDF group, rows are sorted by bulletin `category` then bulletin `description`,
  - exported student PDF columns are `Estudiante`, `Documento`, `Categoria`, `Descripcion`, `Nota`, `Comentarios`,
  - chart section below the table renders two vertical bar charts (Chart.js): students by grade and students by semester,
  - charts use cross-filters: semester select filters the grade chart, and grade select filters the semester chart,
  - default chart scope shows all grades and only the last 5 semesters from current option lists,
  - chart aggregation counts distinct students (`student_id`) per bucket to avoid duplicate report-row overcount,
  - chart analytics data is fetched from `bulletins_students` with minimal fields (`student_id`, `grade_id`, `semester_id`) and `is_deleted != true`,
  - create and update actions enforce audit metadata from authenticated user (`created_by`, `updated_by`),
  - delete action is logical delete (`is_deleted = true`) with `updated_by` refresh.
- Routing:
  - `/reports/students`.

## Reports Employees Data Model
- `employee_reports` collection stores report rows linking employee, job, and semester.
- Access rules:
  - `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`: `@request.auth.is_admin = true`.
- Fields:
  - `employee_id` (required relation to `employees`, `maxSelect = 1`, `cascadeDelete = false`),
  - `job_id` (required relation to `employee_jobs`, `maxSelect = 1`, `cascadeDelete = false`),
  - `semester_id` (required relation to `semesters`, `maxSelect = 1`, `cascadeDelete = false`),
  - `comments` (optional text),
  - `created_by` (required relation to `users`, `maxSelect = 1`),
  - `updated_by` (required relation to `users`, `maxSelect = 1`),
  - `created_at` (autodate, set on create),
  - `updated_at` (autodate, set on create and update),
  - `is_deleted` (bool used for soft delete, where active list filters `is_deleted != true`).
- Frontend modules:
  - list/create/edit/delete page: `src/pages/reports-employees.tsx`,
  - wrapper/API access: `src/lib/pocketbase/employee-reports.ts`.
- Data flow:
  - list queries are paginated and server-sorted with relation expansions for employee, job, semester, and users,
  - default list sort is `created_at` descending; users can switch sort through column headers,
  - list filters are server-side and combined with `AND` for `job_id`, `semester_id`, and exact selected `employee_id` values,
  - filter form includes specific-employee datalist search by `employees.document_id`; suggestions appear only after typing and selecting one or more employees applies exact `employee_id` matches for those selections,
  - suggestion labels use `document_id (name)`,
  - filter form uses explicit apply/clear actions; clear restores default filters and `created_at` descending sort,
  - export action fetches all rows matching currently applied filters (ignoring pagination) and generates one CSV file,
  - employee CSV export uses current table sort and includes columns `Empleado`, `Documento`, `Cargo`, `Semestre`, `Comentarios`, `Creado`,
  - chart section below the table renders two vertical bar charts (Chart.js): employees by job and employees by semester,
  - charts use cross-filters: semester select filters the job chart, and job select filters the semester chart,
  - default chart scope shows all jobs and only the last 5 semesters from current option lists,
  - chart aggregation counts distinct employees (`employee_id`) per bucket to avoid duplicate report-row overcount,
  - chart analytics data is fetched from `employee_reports` with minimal fields (`employee_id`, `job_id`, `semester_id`) and `is_deleted != true`,
  - create and update actions enforce audit metadata from authenticated user (`created_by`, `updated_by`),
  - delete action is logical delete (`is_deleted = true`) with `updated_by` refresh.
- Routing:
  - `/reports/employees`.

## Testing Architecture
- Runner: Vitest (`vitest.config.ts`).
- UI tests: `src/pages/*.test.tsx`.
- Data-layer tests: `src/lib/pocketbase/*.test.ts`.
- Setup: `src/test/setup.ts`.
