## Why

Employee reports currently reference the `employee_jobs` table via a foreign key (`job_id`). This means if a job's name or salary is later changed, all historical reports retroactively reflect the new values — misrepresenting what was true when the report was created. Reports should be point-in-time snapshots.

## What Changes

- **BREAKING**: Remove the `job_id` relation field from `employee_reports` in PocketBase
- Add `job_name` (text) and `job_salary` (number) fields directly on `employee_reports`, populated at creation time from the selected job
- The create form still uses a dropdown loaded from `employee_jobs`, but saves the name and salary as plain values instead of a FK
- On edit, `job_name` and `job_salary` are read-only (the snapshot is immutable)
- Filtering and analytics switch from `job_id` to `job_name`
- All `expand: 'job_id'` calls are removed from PocketBase queries

## Capabilities

### New Capabilities

- `employee-report-job-snapshot`: Denormalized job data on employee reports — snapshot job name and salary at creation time, read-only on edit, filter/sort/analytics by job name

### Modified Capabilities

_(none — no existing spec requirements change)_

## Impact

- **PocketBase schema**: `employee_reports` collection — remove `job_id` relation, add `job_name` text + `job_salary` number fields
- **Data migration**: Existing records need `job_name`/`job_salary` backfilled from `employee_jobs` before removing `job_id`
- **Frontend data layer**: `src/lib/pocketbase/employee-reports.ts` — types, queries, filters, sort map, expand calls
- **Frontend UI**: `src/routes/reports/employees.tsx` — form inputs, edit mode behavior, filter controls, analytics grouping
- **Tests**: `src/lib/pocketbase/employee-reports.test.ts`, `src/pages/reports-employees.test.tsx`
