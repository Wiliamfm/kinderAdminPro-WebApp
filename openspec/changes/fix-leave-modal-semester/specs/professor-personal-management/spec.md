## MODIFIED Requirements

### Requirement: Professor SHALL be able to register their own leaves (Registrar ausencia)
The Gestión de pagos e incapacidades section MUST expose a Registrar ausencia submodule where the logged-in professor can view and create leave records scoped exclusively to their own employee record. Leave creation is restricted to the current semester — the semester is automatically assigned and displayed as read-only text. Leave dates MUST fall within the current semester's date boundaries. The leave overlap validation remains unchanged.

#### Scenario: Professor sees only their own leave records
- **WHEN** a professor opens Registrar ausencia
- **THEN** the page shows only leave records where `employee_id` matches the logged-in professor's employee record
- **THEN** leave records from other employees are not visible

#### Scenario: Professor creates a leave for the current semester
- **WHEN** a professor submits the leave creation form with valid dates within the current semester
- **THEN** the system creates a leave record with `employee_id` set to the professor's own employee id and `semester_id` set to the current semester
- **THEN** the new leave appears in the professor's leave list

#### Scenario: Professor cannot create a leave outside semester boundaries
- **WHEN** a professor enters dates that fall outside the current semester's `start_date` to `end_date` range
- **THEN** the form shows a validation error on the affected date field indicating the valid range

#### Scenario: Leave overlap is validated for the professor
- **WHEN** a professor submits dates that overlap with an existing leave record for their employee
- **THEN** the form shows a validation error and the leave is not created
