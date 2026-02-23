# Architecture Reference

Last updated: 2026-02-23

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

## Data Access Pattern
- PocketBase SDK initialization and error normalization live in `src/lib/pocketbase/client.ts`.
- Feature modules wrap collection calls and expose typed functions.
- UI pages call wrapper functions via `createResource` and action handlers.
- Wrapper modules use mapper functions to keep camelCase TypeScript semantics while translating to PocketBase snake_case fields (for example `employeeId` <-> `employee_id`).

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
  - converts to ISO UTC before API calls,
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

## Testing Architecture
- Runner: Vitest (`vitest.config.ts`).
- UI tests: `src/pages/*.test.tsx`.
- Data-layer tests: `src/lib/pocketbase/*.test.ts`.
- Setup: `src/test/setup.ts`.
