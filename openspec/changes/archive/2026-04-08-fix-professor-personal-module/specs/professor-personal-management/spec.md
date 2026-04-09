## MODIFIED Requirements

### Requirement: Professor SHALL be able to register their own leaves (Registrar ausencia)
The Gestión de pagos e incapacidades section MUST expose a Registrar ausencia submodule where the logged-in professor can view and create leave records scoped exclusively to their own employee record. The leave creation workflow SHALL have the same fields and validation as the admin leave registration in staff-employees, but the employee is implicitly the logged-in user — no employee picker is shown.

#### Scenario: Professor sees only their own leave records
- **WHEN** a professor opens Registrar ausencia
- **THEN** the page shows only leave records where `employee_id` matches the logged-in professor's employee record
- **THEN** leave records from other employees are not visible

#### Scenario: Professor creates a leave for themselves
- **WHEN** a professor submits the leave creation form with valid dates and type
- **THEN** the system creates a leave record with `employee_id` set to the professor's own employee id
- **THEN** the new leave appears in the professor's leave list

#### Scenario: Leave overlap is validated for the professor
- **WHEN** a professor submits dates that overlap with an existing leave record for their employee
- **THEN** the form shows a validation error and the leave is not created

### Requirement: Gestión de pagos e incapacidades hub SHALL navigate to its submodules
The Gestión de pagos e incapacidades section index page at `/professor/personal` MUST display navigation links to Registrar ausencia and Consultar pagos. A "Volver al inicio" link MUST also be present.

#### Scenario: Hub page shows both submodule links
- **WHEN** a professor navigates to `/professor/personal`
- **THEN** links to Registrar ausencia and Consultar pagos are visible
- **THEN** a link back to the home page is present

### Requirement: Gestión de pagos e incapacidades SHALL resolve the professor's employee record from the authenticated user
Before rendering any submodule content, the system MUST look up the employee record linked to the logged-in user via `employees.userId = authUserId`. The `authUserId` MUST be obtained from the client-side reactive auth state (not from the server request event) to ensure it works during both SSR and client-side navigation. If no linked employee is found, the page MUST display an error state and not attempt to fetch leaves or invoices.

#### Scenario: Employee lookup works during client-side navigation
- **WHEN** a professor navigates to a submodule via client-side routing (SPA navigation)
- **THEN** the system resolves the auth user ID from the client-side auth signal
- **THEN** the employee record is found and submodule content is rendered

#### Scenario: No linked employee shows an error state
- **WHEN** a professor user has no associated employee record
- **THEN** the page renders an error message indicating the profile is not configured
- **THEN** no leave or invoice data is fetched or displayed

## RENAMED Requirements

### Requirement: Professor SHALL be able to register their own leaves (Registrar salida)
- **FROM:** Professor SHALL be able to register their own leaves (Registrar salida)
- **TO:** Professor SHALL be able to register their own leaves (Registrar ausencia)

### Requirement: Gestión personal hub SHALL navigate to its submodules
- **FROM:** Gestión personal hub SHALL navigate to its submodules
- **TO:** Gestión de pagos e incapacidades hub SHALL navigate to its submodules

### Requirement: Gestión personal SHALL resolve the professor's employee record from the authenticated user
- **FROM:** Gestión personal SHALL resolve the professor's employee record from the authenticated user
- **TO:** Gestión de pagos e incapacidades SHALL resolve the professor's employee record from the authenticated user
