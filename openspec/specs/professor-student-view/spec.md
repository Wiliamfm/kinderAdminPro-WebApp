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

### Requirement: Professor student view SHALL display grade grouping or filtering
The student list MUST display students grouped under flat grade-section headers (one header per assigned grade, sorted by grade name). The grade filter dropdown MUST be removed. Each student row MUST be a clickable link that navigates to `/professor/students/:id`.

#### Scenario: Students displayed under grade headers
- **WHEN** a professor with grades A and B opens Gestión de Estudiantes
- **THEN** a section header for grade A appears above grade A students
- **THEN** a section header for grade B appears above grade B students
- **THEN** no filter dropdown is rendered

#### Scenario: Clicking a student row navigates to detail page
- **WHEN** the professor clicks any student row
- **THEN** the browser navigates to `/professor/students/{student_id}`

#### Scenario: Single grade — header still shown
- **WHEN** a professor is assigned to exactly one grade
- **THEN** that grade's header is rendered above its students
- **THEN** no filter dropdown is rendered

### Requirement: Professor student view SHALL resolve grades via employee record
The page MUST first fetch the employee record for the logged-in user, then fetch grades assigned to that employee, then fetch students. If the employee lookup yields no record, the page MUST show an error state.

#### Scenario: Missing employee record shows error state
- **WHEN** a professor user has no linked employee record
- **THEN** the page shows an error state and no student data is fetched
