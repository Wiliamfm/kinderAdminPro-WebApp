## ADDED Requirements

### Requirement: Invoice file upload works without Seroval error
The system SHALL allow staff users to upload an invoice PDF file when submitting employee invoices without causing a server unavailable error.

#### Scenario: Upload new invoice file
- **WHEN** staff user fills in invoice form, selects a PDF file for invoice, and clicks "Guardar cambios"
- **THEN** the system uploads the invoice file to PocketBase and saves the invoice record successfully

#### Scenario: Replace existing invoice file
- **WHEN** staff user edits an invoice that already has a file, selects a new PDF file, and submits
- **THEN** the system replaces the existing invoice file with the new one

#### Scenario: Upload without invoice file
- **WHEN** staff user submits invoice without selecting a new file
- **THEN** the system validates and saves other invoice fields correctly