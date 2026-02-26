# Architecture Reference

Last updated: 2026-02-26

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
  - onboarding trigger via `users.requestPasswordReset`.
- Recovery behavior:
  - if invite email fails, created records are kept,
  - admin can resend onboarding from the employee row action.
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
  - text field `name` for normalized original filename plus datetime suffix (`YYYYMMDD_HHMM`),
  - `creation_datetime` autodate (`onCreate: true`),
  - `update_datetime` autodate (`onCreate: true`, `onUpdate: true`),
  - access rules mirror admin-only leaves access.
- UI behavior in `src/pages/staff-employees.tsx`:
  - upload action appears as a dedicated icon in each employee row (admin only),
  - upload flow is `invoice_files.create` then `invoices.create`,
  - invoice table rows include a replace action that uploads a new file and updates `invoices.file_id`,
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

## Testing Architecture
- Runner: Vitest (`vitest.config.ts`).
- UI tests: `src/pages/*.test.tsx`.
- Data-layer tests: `src/lib/pocketbase/*.test.ts`.
- Setup: `src/test/setup.ts`.
