## ADDED Requirements

### Requirement: Grades SHALL support a one-to-one professor assignment
The `grades` PocketBase collection MUST have a nullable `employee_id` relation field pointing to the `employees` collection. Each grade MAY have at most one assigned professor. A grade with no assignment is valid.

#### Scenario: Grade record stores employee assignment
- **WHEN** an admin assigns a professor to a grade
- **THEN** the grade record's `employee_id` is set to the selected employee's id

#### Scenario: Grade with no assignment is valid
- **WHEN** a grade has `employee_id` set to null or empty
- **THEN** the grade is displayed normally in the enrollment grades list with an empty professor column

### Requirement: Admin SHALL be able to assign a professor to a grade from the grades management page
The enrollment grades page MUST display a "Profesor asignado" column showing the assigned professor's name (or empty if unassigned). Each grade row MUST have an action to open an assignment modal where the admin selects an employee from a dropdown. The modal MUST also allow clearing the current assignment.

#### Scenario: Grades list shows professor assignment column
- **WHEN** an admin opens the enrollment grades page
- **THEN** each grade row displays the assigned professor name or a blank/dash if unassigned

#### Scenario: Admin assigns a professor to a grade
- **WHEN** an admin opens the assignment modal for a grade and selects an employee
- **THEN** the grade record is updated with the selected employee's id
- **THEN** the grades list reflects the new professor name for that grade

#### Scenario: Admin clears a professor assignment
- **WHEN** an admin opens the assignment modal and selects the empty/none option
- **THEN** the grade's `employee_id` is set to null
- **THEN** the professor column shows empty for that grade

### Requirement: `GradeRecord` type SHALL include professor assignment fields
The frontend `GradeRecord` type MUST include `employeeId: string | null` and `employeeName: string` fields. Queries that fetch grades MUST expand the `employee_id` relation to populate these fields.

#### Scenario: Grade list query returns professor name
- **WHEN** grades are fetched with the employee expand
- **THEN** each `GradeRecord` with an assignment has a non-empty `employeeName`
- **THEN** each `GradeRecord` without an assignment has `employeeId: null` and `employeeName: ''`

### Requirement: Only active employees SHALL be selectable as professors for grade assignment
The employee dropdown in the assignment modal MUST list only employees with `active = true`.

#### Scenario: Inactive employees are excluded from assignment dropdown
- **WHEN** an admin opens the grade assignment modal
- **THEN** the employee dropdown does not include employees with `active = false`
