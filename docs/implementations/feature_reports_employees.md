# Implementation Spec: `employee_reports` Collection And Reports `Empleados` Page

Last updated: 2026-03-07  
Status: Completed

## Documentation Compliance
- Sensitive data policy: compliant (no secrets, credentials, or PII included).
- Any future examples in this file must use placeholders and redacted values only.

## Summary
Implement a new PocketBase collection named `employee_reports` and a new admin-only reports page `Empleados` under the reports module.

The page follows the same workflow pattern used in reports students:
- sortable columns,
- paginated list,
- create/edit/delete via modal dialogs,
- soft delete using `is_deleted`,
- audit metadata (`created_by`, `updated_by`, `created_at`, `updated_at`),
- chart section with:
  - employees by job (semester cross-filter),
  - employees by semester (job cross-filter),
  - default all-jobs + last-5 semesters view,
  - distinct-employee aggregation by `employee_id`.

Chosen decisions:
- access model: admin-only,
- relation fields: `employee_id`, `job_id`, `semester_id`,
- no `note` field in this collection,
- delete policy: non-cascade required relations for `employee_id`, `job_id`, `semester_id`.

## Important Interfaces Or Schema Changes

### Public Route Changes
- Add route: `/reports/employees`
- Keep reports entry route: `/reports`
- Add index link in reports section: `Empleados -> /reports/employees`

### New PocketBase Collection
- Name: `employee_reports`
- Type: `base`
- Rules:
  - `listRule`: `@request.auth.is_admin = true`
  - `viewRule`: `@request.auth.is_admin = true`
  - `createRule`: `@request.auth.is_admin = true`
  - `updateRule`: `@request.auth.is_admin = true`
  - `deleteRule`: `@request.auth.is_admin = true`

Fields:
- `employee_id` relation to `employees` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `job_id` relation to `employee_jobs` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `semester_id` relation to `semesters` (required, `minSelect=1`, `maxSelect=1`, `cascadeDelete=false`)
- `comments` text (optional)
- `created_by` relation to `users` (required, single select)
- `updated_by` relation to `users` (required, single select)
- `created_at` autodate (`onCreate=true`, `onUpdate=false`)
- `updated_at` autodate (`onCreate=true`, `onUpdate=true`)
- `is_deleted` bool (optional, default handled by app)

### New Frontend Data Wrapper
Add `src/lib/pocketbase/employee-reports.ts` exporting:
- `EmployeeReportRecord`
- `EmployeeReportCreateInput`
- `EmployeeReportUpdateInput`
- `EmployeeReportListSortField`
- `EmployeeReportListSortDirection`
- `PaginatedEmployeeReportsResult`
- `listEmployeeReportsPage(page, perPage, options?)`
- `createEmployeeReport(payload)`
- `updateEmployeeReport(id, payload)`
- `softDeleteEmployeeReport(id)`
- `listEmployeeReportFormOptions()`
- `EmployeeReportAnalyticsRecord`
- `listEmployeeReportsAnalyticsRecords()`

## Implementation Plan

### 1) Backend Collection Setup
Create `employee_reports` in PocketBase admin/API using the schema and rules above.

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
In `src/lib/pocketbase/employee-reports.ts`:
- map snake_case PB records to typed TS records,
- use `expand` for normalized display fields:
  - `employee_id`
  - `job_id`
  - `semester_id`
  - `created_by`
  - `updated_by`
- filter lists by `is_deleted != true`,
- implement sort map with relation-aware expressions:
  - `employee_name -> employee_id.name`
  - `job_name -> job_id.name`
  - `semester_name -> semester_id.name`
  - direct fields for `comments`, `created_at`, `updated_at`,
  - user-name fields for author columns.

### 3) Reports Page
Create `src/pages/reports-employees.tsx` with:
- admin guard redirecting non-admin users to `/reports`,
- heading and summary consistent with current UI language,
- table with columns:
  - `Empleado`
  - `Cargo`
  - `Semestre`
  - `Comentarios`
  - `Creado`
  - `Actualizado`
  - `Creado por`
  - `Actualizado por`
  - `Acciones` (admin only)
- sort behavior using existing `SortableHeaderCell`,
- pagination using `PaginationControls` and `DEFAULT_TABLE_PAGE_SIZE`,
- create/edit/delete modals using existing `Modal` component,
- touched-based realtime validation for required relation fields:
  - `employee_id`
  - `job_id`
  - `semester_id`
  - optional `comments`.

### 4) Reports Module Wiring
Update:
- `src/routes.ts` to register `/reports/employees`,
- `src/lib/section-index.ts` to add reports link:
  - label: `Empleados`
  - href: `/reports/employees`
  - `requiresAdmin: true`.

### 5) Documentation Updates
Update root docs:
- `docs/overview.md`:
  - include new route and workflow summary,
- `docs/architecture.md`:
  - add `employee_reports` data model section,
  - add reports `Empleados` page design notes and data flow.

### 6) Chart Analytics Section
In `src/pages/reports-employees.tsx`:
- render chart form below the main table,
- add chart controls:
  - `Semestre (para gráfico por cargo)`,
  - `Cargo (para gráfico por semestre)`,
- draw two vertical bar charts with Chart.js,
- use distinct `employee_id` counting per bucket to avoid duplicate row overcount,
- default to all jobs and last 5 semesters when the related chart filter is `Todos`.

## Test Cases And Scenarios

### Data Layer Tests
Create `src/lib/pocketbase/employee-reports.test.ts`:
- list query uses expected sort/filter/expand,
- create sets audit fields and defaults,
- update refreshes `updated_by`,
- soft delete sets `is_deleted=true` and `updated_by`,
- analytics query fetches minimal fields with `is_deleted != true`,
- analytics mapper excludes incomplete rows,
- missing authenticated user fails with clear error,
- errors are normalized and rethrown.

### Page Tests
Create `src/pages/reports-employees.test.tsx`:
- redirects non-admin users to `/reports`,
- renders normalized row values (`employee_name`, `job_name`, `semester_name`),
- create modal flow submits expected payload,
- edit modal flow submits expected payload,
- delete flow triggers soft-delete call,
- sortable header changes request sort params,
- pagination triggers page fetch,
- initial chart render uses all jobs and last 5 semesters,
- chart cross-filters recalculate buckets correctly,
- chart empty state renders when analytics query has no rows,
- validation blocks create when required relation fields are empty.

### Validation Commands
- `bun run test`
- `bun run build`

## Assumptions And Defaults
- Collection field set intentionally excludes `note`.
- Access is admin-only for both backend rules and UI behavior.
- Delete restrictions rely on relation integrity (`cascadeDelete=false`) for hard deletes.
- Route slug is `/reports/employees` to match current route naming conventions.
