## ADDED Requirements

### Requirement: Employee reports SHALL expose a leaves-per-employee analytics chart
The employee reports page SHALL render a dedicated analytics chart for leave activity per employee. The chart MUST use leave-record counts as its metric, and it MUST provide a semester selector that controls the chart dataset.

#### Scenario: Admin views leave analytics on the employee reports page
- **WHEN** an admin opens the employee reports page
- **THEN** the page shows a leaves-per-employee chart in addition to the existing employee analytics charts
- **THEN** the chart includes a semester filter control

#### Scenario: Leave chart counts leave records per employee
- **WHEN** the selected semester contains multiple leave records for the same employee
- **THEN** the chart count for that employee equals the number of matching leave records in that semester

### Requirement: Leave analytics SHALL default to the current semester for active employees
On initial page load, the leave analytics chart SHALL default to the current semester and MUST count only employees whose current `active` status is `true`. If no semester is marked as current, the chart SHALL fall back to the most recently ending semester when one exists.

#### Scenario: Current semester default limits data to active employees
- **WHEN** the page loads and a current semester exists
- **THEN** the leave chart automatically selects that semester
- **THEN** the chart excludes leave records for employees whose current `active` status is `false`

#### Scenario: Missing current semester falls back to the latest semester
- **WHEN** the page loads and no semester is marked current but semester history exists
- **THEN** the leave chart automatically selects the semester with the most recent `end_date`

### Requirement: Leave analytics SHALL include historical employee leave records for manual semester filtering
When an admin explicitly selects a semester in the leave analytics filter, the chart SHALL include leave records from any employee whose leave overlaps that semester, regardless of the employee's current `active` status. This historical view MUST not be restricted to currently active employees.

#### Scenario: Historical semester includes inactive employees
- **WHEN** an admin selects a past semester that contains leave records for an employee who is now inactive
- **THEN** the leave chart includes that employee in the selected semester results

#### Scenario: Changing the semester replaces the default active-only dataset
- **WHEN** an admin changes the leave chart semester filter after the initial page load
- **THEN** the chart recomputes the dataset for the selected semester without applying the default active-only restriction

### Requirement: Semester-filtered leave analytics SHALL use overlapping leave dates
The system SHALL treat a leave record as part of a semester whenever the leave date range overlaps the semester date range. A leave record that overlaps more than one semester MUST be counted in each overlapping semester's dataset.

#### Scenario: Leave overlaps a semester boundary
- **WHEN** a leave starts before a semester ends and ends after that semester starts
- **THEN** the leave is included in that semester's chart results

#### Scenario: Leave spans two semesters
- **WHEN** a leave overlaps two semester date ranges
- **THEN** the leave is included when either semester is selected
