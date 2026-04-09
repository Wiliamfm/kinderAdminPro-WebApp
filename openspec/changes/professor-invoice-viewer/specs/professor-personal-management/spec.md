## MODIFIED Requirements

### Requirement: Professor SHALL be able to view their own invoices (Consultar pagos)
The Gestión de pagos e incapacidades section MUST expose a Consultar pagos submodule where the logged-in professor can view invoice records filtered by their own employee id. The view is read-only — professors MUST NOT be able to create, edit, or delete invoices. Professors SHALL be able to preview invoice PDFs in a modal, download individual invoices, and bulk download multiple selected invoices.

#### Scenario: Professor sees only their own invoices
- **WHEN** a professor opens Consultar pagos
- **THEN** the page shows only invoices where `employee_id` matches the logged-in professor's employee record
- **THEN** invoices for other employees are not visible

#### Scenario: No create or edit actions are available
- **WHEN** a professor views the Consultar pagos page
- **THEN** no create, edit, or delete buttons are rendered

#### Scenario: Professor can access invoice files
- **WHEN** a professor views the Consultar pagos page
- **THEN** each invoice row is clickable to preview the PDF
- **THEN** checkboxes are available for selecting invoices for bulk download
