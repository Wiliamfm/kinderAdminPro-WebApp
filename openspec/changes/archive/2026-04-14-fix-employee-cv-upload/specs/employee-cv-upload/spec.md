## ADDED Requirements

### Requirement: Employee CV file upload works without 503 error
The system SHALL allow staff users to upload a CV PDF file when editing an employee record without causing a server unavailable error.

#### Scenario: Upload new CV file
- **WHEN** staff user fills in employee form, selects a PDF file for CV, and clicks "Guardar cambios"
- **THEN** the system uploads the CV file to PocketBase and saves the employee record successfully

#### Scenario: Replace existing CV file
- **WHEN** staff user edits an employee that already has a CV, selects a new PDF file, and submits
- **THEN** the system replaces the existing CV file with the new one

#### Scenario: Upload without CV file
- **WHEN** staff user edits employee without selecting a new CV file
- **THEN** the system preserves the existing CV file (if any) and saves other fields

#### Scenario: Invalid file type rejected
- **WHEN** staff user selects a non-PDF file for CV upload
- **THEN** the system shows validation error before submitting
