## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Professor student view SHALL be read-only
**Reason**: Write actions are now available on the student detail page (`/professor/students/:id`). The list page itself remains display-only, but the overall view is no longer read-only end-to-end.
**Migration**: No user-facing migration needed. The list page still has no inline edit controls; all writes occur on the detail page.
