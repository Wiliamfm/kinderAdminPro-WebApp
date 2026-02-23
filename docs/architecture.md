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
