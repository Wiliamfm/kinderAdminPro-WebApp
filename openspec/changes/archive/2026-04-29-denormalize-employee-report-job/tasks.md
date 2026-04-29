## 1. PocketBase Migration

- [x] 1.1 Add `job_name` (text) and `job_salary` (number) fields to `employee_reports` collection in PocketBase
- [x] 1.2 Backfill existing `employee_reports` records: copy `name` and `salary` from the related `employee_jobs` record into `job_name` and `job_salary`
- [x] 1.3 Remove the `job_id` relation field from `employee_reports` collection

## 2. Types and Data Layer

- [x] 2.1 Update `EmployeeReportRecord` type: remove `job_id`, keep `job_name`, add `job_salary`
- [x] 2.2 Update `EmployeeReportCreateInput`: replace `job_id` with `job_name` (string) and `job_salary` (number)
- [x] 2.3 Update `EmployeeReportUpdateInput` to exclude `job_name` and `job_salary` (no longer same as create)
- [x] 2.4 Update `EmployeeReportAnalyticsRecord`: replace `job_id` with `job_name`
- [x] 2.5 Update `mapEmployeeReportRecord`: read `job_name` and `job_salary` directly from record instead of expanding `job_id`
- [x] 2.6 Update `mapEmployeeReportPayload`: send `job_name` and `job_salary` instead of `job_id`
- [x] 2.7 Remove `job_id` from all `expand:` parameters in PocketBase queries
- [x] 2.8 Update `EMPLOYEE_REPORT_SORT_FIELD_MAP`: change `job_name` mapping from `'job_id.name'` to `'job_name'`
- [x] 2.9 Update `buildFilterExpression`: filter by `job_name` instead of `job_id`
- [x] 2.10 Update `EmployeeReportListOptions`: change `jobId` to `jobName` (string filter)

## 3. Form Options

- [x] 3.1 Update job options in `listEmployeeReportFormOptions` to return `{ name, salary }` instead of `{ id, label }`
- [x] 3.2 Update `EmployeeReportFormOptions` type to reflect the new job option shape

## 4. UI — Create Form

- [x] 4.1 Update the create form job dropdown to send `job_name` and `job_salary` in the payload based on the selected job
- [x] 4.2 Verify the dropdown still displays job names and is sorted alphabetically

## 5. UI — Edit Form

- [x] 5.1 Display `job_name` and `job_salary` as read-only (disabled) fields in the edit form
- [x] 5.2 Ensure the edit submission does not include `job_name` or `job_salary` in the update payload

## 6. UI — Filters and Analytics

- [x] 6.1 Update the job filter control to send `job_name` instead of `job_id`
- [x] 6.2 Update the employees-by-job chart to group by `job_name` instead of `job_id`
- [x] 6.3 Update the export function to include `job_salary` in the exported data if applicable

## 7. Tests

- [x] 7.1 Update `employee-reports.test.ts`: adjust types, mock data, and assertions for `job_name`/`job_salary` fields
- [x] 7.2 Update `reports-employees.test.tsx`: adjust form and filter tests for the new field structure
