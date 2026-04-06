## ADDED Requirements

### Requirement: Professor SHALL be able to register their own leaves (Registrar salida)
The Gestión personal section MUST expose a Registrar salida submodule where the logged-in professor can view and create leave records scoped exclusively to their own employee record. The leave creation workflow SHALL have the same fields and validation as the admin leave registration in staff-employees, but the employee is implicitly the logged-in user — no employee picker is shown.

#### Scenario: Professor sees only their own leave records
- **WHEN** a professor opens Registrar salida
- **THEN** the page shows only leave records where `employee_id` matches the logged-in professor's employee record
- **THEN** leave records from other employees are not visible

#### Scenario: Professor creates a leave for themselves
- **WHEN** a professor submits the leave creation form with valid dates and type
- **THEN** the system creates a leave record with `employee_id` set to the professor's own employee id
- **THEN** the new leave appears in the professor's leave list

#### Scenario: Leave overlap is validated for the professor
- **WHEN** a professor submits dates that overlap with an existing leave record for their employee
- **THEN** the form shows a validation error and the leave is not created

### Requirement: Professor SHALL be able to view their own invoices (Consultar pagos)
The Gestión personal section MUST expose a Consultar pagos submodule where the logged-in professor can view invoice records filtered by their own employee id. The view is read-only — professors MUST NOT be able to create, edit, or delete invoices.

#### Scenario: Professor sees only their own invoices
- **WHEN** a professor opens Consultar pagos
- **THEN** the page shows only invoices where `employee_id` matches the logged-in professor's employee record
- **THEN** invoices for other employees are not visible

#### Scenario: No create or edit actions are available
- **WHEN** a professor views the Consultar pagos page
- **THEN** no create, edit, or delete buttons are rendered

### Requirement: Gestión personal hub SHALL navigate to its submodules
The Gestión personal section index page at `/professor/personal` MUST display navigation links to Registrar salida and Consultar pagos. A "Volver al inicio" link MUST also be present.

#### Scenario: Hub page shows both submodule links
- **WHEN** a professor navigates to `/professor/personal`
- **THEN** links to Registrar salida and Consultar pagos are visible
- **THEN** a link back to the home page is present

### Requirement: Gestión personal SHALL resolve the professor's employee record from the authenticated user
Before rendering any submodule content, the system MUST look up the employee record linked to the logged-in user via `employees.userId = authUserId`. If no linked employee is found, the page MUST display an error state and not attempt to fetch leaves or invoices.

#### Scenario: No linked employee shows an error state
- **WHEN** a professor user has no associated employee record
- **THEN** the page renders an error message indicating the profile is not configured
- **THEN** no leave or invoice data is fetched or displayed
