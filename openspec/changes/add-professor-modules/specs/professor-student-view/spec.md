## ADDED Requirements

### Requirement: Professor SHALL see only students in their assigned grades (Gestión de Estudiantes)
The Gestión de Estudiantes page MUST show only active students whose `grade_id` is one of the grades assigned to the logged-in professor (via `grades.employee_id`). Students in unassigned grades MUST NOT appear.

#### Scenario: Professor sees students from their assigned grades
- **WHEN** a professor with grades A and B assigned opens Gestión de Estudiantes
- **THEN** the page lists only active students in grades A and B
- **THEN** students from grade C (unassigned to this professor) are not shown

#### Scenario: Professor with no assigned grades sees empty state
- **WHEN** a professor has no grades assigned (no grade has their employee_id)
- **THEN** the page renders an empty state message
- **THEN** no student rows are displayed

### Requirement: Professor student view SHALL be read-only
The Gestión de Estudiantes page for professors MUST NOT render any create, edit, or delete actions. All columns are display-only.

#### Scenario: No action buttons in professor student view
- **WHEN** a professor views the student list
- **THEN** no add, edit, or deactivate buttons are present

### Requirement: Professor student view SHALL display grade grouping or filtering
The student list MUST indicate which grade each student belongs to. When the professor is assigned to multiple grades, a grade filter MUST allow narrowing the list to a single grade.

#### Scenario: Grade column is visible
- **WHEN** a professor views the student list with students from multiple grades
- **THEN** each student row displays the grade name

#### Scenario: Grade filter narrows the list
- **WHEN** a professor selects a specific grade in the filter
- **THEN** only students belonging to that grade are shown

### Requirement: Professor student view SHALL resolve grades via employee record
The page MUST first fetch the employee record for the logged-in user, then fetch grades assigned to that employee, then fetch students. If the employee lookup yields no record, the page MUST show an error state.

#### Scenario: Missing employee record shows error state
- **WHEN** a professor user has no linked employee record
- **THEN** the page shows an error state and no student data is fetched
