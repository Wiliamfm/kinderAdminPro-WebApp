## ADDED Requirements

### Requirement: Home dashboard displays current semester
The dashboard SHALL display the current active semester name and date range prominently when a semester is marked as current.

#### Scenario: Semester exists
- **WHEN** a semester with `is_current = true` exists in the system
- **THEN** the dashboard SHALL display "Semestre actual: {name}" with date range from start_date to end_date

#### Scenario: No current semester
- **WHEN** no semester has `is_current = true`
- **THEN** the dashboard SHALL display "Sin semestre activo" instead of semester info

### Requirement: Home dashboard shows grade overview with professor and student count
The dashboard SHALL display a table listing all grades with their assigned professor and count of active students.

#### Scenario: Grades exist with professors
- **WHEN** grades exist in the system with assigned professors
- **THEN** the dashboard SHALL display a table with columns: Grado, Profesor(a), Estudiantes
- **AND** each row SHALL show grade name, professor name, and active student count
- **AND** the table SHALL include a footer row showing total students

#### Scenario: Grade has no assigned professor
- **WHEN** a grade has no employee_id assigned (null)
- **THEN** the dashboard SHALL display "(Sin asignar)" in the professor column

#### Scenario: No grades exist
- **WHEN** no grades exist in the system
- **THEN** the dashboard SHALL display "No hay grados registrados" message

### Requirement: Home dashboard provides quick navigation
The dashboard SHALL display clickable links to main application modules for quick access.

#### Scenario: Display module links
- **WHEN** the dashboard renders
- **THEN** it SHALL display links to: Gestión de Personal, Gestión de Matrícula, Gestión de Eventos, Informes
- **AND** each link SHALL navigate to the corresponding route (/staff-management, /enrollment-management, /event-management, /reports)

### Requirement: Professor users see simplified view
The dashboard SHALL detect professor role and display the existing professor module links instead of the full dashboard.

#### Scenario: User is a professor (not admin)
- **WHEN** the current user has role 'professor' and does not have role 'admin'
- **THEN** the dashboard SHALL display the professor module links (personal, students, events) instead of the full dashboard
- **AND** the semester/grade information SHALL NOT be displayed