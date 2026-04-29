## Context

`employee_reports` currently holds a `job_id` FK to `employee_jobs`. Job name and salary are resolved at read time via PocketBase's `expand`. This couples report display to the *current* state of the job record, not the state at the time the report was created.

The frontend is a SolidStart app backed by PocketBase. Key files:
- `src/lib/pocketbase/employee-reports.ts` — data layer (types, CRUD, queries, analytics)
- `src/routes/reports/employees.tsx` — UI (table, form, filters, charts)

## Goals / Non-Goals

**Goals:**
- Snapshot `job_name` and `job_salary` on `employee_reports` at creation time
- Remove the `job_id` relation from `employee_reports`
- Keep the create form convenient (dropdown from `employee_jobs`, auto-fill name/salary)
- Make job fields read-only on edit
- Migrate existing records so no data is lost

**Non-Goals:**
- Changing the `employee_jobs` table or its CRUD
- Changing the `employees.job_id` relation (employees still FK to jobs)
- Snapshotting employee or semester data (only job is denormalized)

## Decisions

### 1. Dropdown with auto-fill on create (not free-text)

The create form still loads `employee_jobs` for a dropdown. When the user selects a job, `job_name` and `job_salary` are derived from the selection and sent in the payload. This keeps the UX consistent while decoupling storage.

**Alternative considered**: Free-text fields for job name and salary. Rejected — introduces typos, inconsistency, and worse UX with no benefit.

### 2. Form options return name + salary (not just id + label)

`listEmployeeReportFormOptions()` currently returns `{ id, label }` for jobs. It will return `{ name, salary }` instead (or in addition), since the form needs both values to populate the snapshot fields.

### 3. Filter by job_name string instead of job_id

Filtering switches from `job_id = "<id>"` to `job_name = "<name>"`. The filter dropdown still loads from `employee_jobs` to populate options, but sends the job *name* as the filter value.

### 4. Analytics group by job_name

Charts that currently aggregate by `job_id` will aggregate by `job_name`. Historical reports with an old job name will appear as a separate group — this is the correct behavior for point-in-time reporting.

### 5. Read-only job fields on edit

When editing an existing report, `job_name` and `job_salary` are displayed but disabled. `EmployeeReportUpdateInput` excludes these fields. Only `employee_id`, `semester_id`, and `comments` remain editable.

## Risks / Trade-offs

- **Job name duplication in filters**: If the same job name exists across renamed versions, they show as separate filter options. → Acceptable for historical accuracy; the filter dropdown loads from `employee_jobs` (current names only), so only current job names appear as filter options. Old names only show in the table/export.
- **Data migration required**: Existing `employee_reports` records must be backfilled with `job_name`/`job_salary` from their current `job_id` before the relation is removed. → User will handle this on the PocketBase side.
