## ADDED Requirements

### Requirement: Employee report stores job name and salary as plain values

The `employee_reports` collection SHALL store `job_name` (text) and `job_salary` (number) directly on the record, not as a foreign key to `employee_jobs`. These values represent the job's state at the time the report was created.

#### Scenario: Creating a report snapshots current job data
- **WHEN** a user creates an employee report and selects a job from the dropdown
- **THEN** the system saves the selected job's current `name` as `job_name` and current `salary` as `job_salary` on the report record

#### Scenario: Job data is preserved after the source job changes
- **WHEN** a job's name or salary is updated in `employee_jobs` after a report was created
- **THEN** the report record retains the original `job_name` and `job_salary` from creation time

### Requirement: Job fields are read-only on edit

When editing an existing employee report, `job_name` and `job_salary` SHALL NOT be editable. The update payload SHALL exclude these fields.

#### Scenario: Editing a report does not allow changing job fields
- **WHEN** a user opens the edit form for an existing employee report
- **THEN** the `job_name` and `job_salary` fields are displayed as read-only (disabled)

#### Scenario: Update payload excludes job fields
- **WHEN** a user submits an edit to an employee report
- **THEN** the update request does not include `job_name` or `job_salary` in the payload

### Requirement: Create form loads jobs from employee_jobs for selection

The create form SHALL present a dropdown populated from the `employee_jobs` collection. Selecting a job auto-fills the `job_name` and `job_salary` values for the payload.

#### Scenario: Job dropdown is populated from employee_jobs
- **WHEN** the create form loads
- **THEN** the job dropdown displays all jobs from `employee_jobs` sorted by name, each showing the job name

#### Scenario: Selecting a job populates name and salary
- **WHEN** a user selects a job from the dropdown
- **THEN** `job_name` is set to the selected job's name and `job_salary` is set to the selected job's salary

### Requirement: Reports are filtered by job name

Filtering employee reports by job SHALL use `job_name` (text match) instead of `job_id` (relation match).

#### Scenario: Filtering by job name
- **WHEN** a user selects a job filter on the reports list
- **THEN** only reports where `job_name` matches the selected job's name are shown

### Requirement: Reports are sorted by job name directly

Sorting by job name SHALL use the `job_name` field directly instead of traversing the `job_id` relation.

#### Scenario: Sorting by job name
- **WHEN** a user sorts the reports table by job name
- **THEN** reports are sorted alphabetically by the `job_name` field

### Requirement: Analytics group by job name

Employee report analytics (charts) SHALL aggregate by `job_name` instead of `job_id`.

#### Scenario: Employees-by-job chart uses job name
- **WHEN** the employees-by-job chart is rendered
- **THEN** it groups and counts employees by the `job_name` field from report records

### Requirement: No expand on job relation in queries

All PocketBase queries for `employee_reports` SHALL NOT include `job_id` in expand parameters. The `job_name` and `job_salary` fields are read directly from the record.

#### Scenario: List query does not expand job
- **WHEN** a paginated list of employee reports is fetched
- **THEN** the PocketBase query does not include `job_id` in the `expand` parameter
