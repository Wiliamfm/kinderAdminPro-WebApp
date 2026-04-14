## ADDED Requirements

### Requirement: Father can register new students from portal
A logged-in father SHALL be able to register a new student linked to their account without creating a new user account.

#### Scenario: Father opens registration modal
- **WHEN** father clicks "Registrar nuevo estudiante" button in father-portal
- **THEN** system opens a modal with student registration form

#### Scenario: Form displays student fields only
- **WHEN** father views the registration modal
- **THEN** system displays only student fields (name, grade, date_of_birth, etc.) and relationship selector
- **AND** father data fields are NOT displayed (read from logged-in user)

#### Scenario: Father selects relationship to student
- **WHEN** father selects relationship from dropdown
- **THEN** system saves the selected relationship (father/mother/other) when creating the link

### Requirement: Student document_id uniqueness validated on blur
The system SHALL validate that the student document_id is unique before form submission.

#### Scenario: Document ID is unique
- **WHEN** father enters a document_id and field loses focus
- **AND** no student exists with that document_id
- **THEN** system allows form submission

#### Scenario: Document ID already exists
- **WHEN** father enters a document_id and field loses focus
- **AND** a student already exists with that document_id
- **THEN** system displays error "Ya existe un estudiante con este documento"

### Requirement: Student created with pending status
The system SHALL create the student with pending status (not active, not accepted).

#### Scenario: Successful student registration
- **WHEN** father fills all required fields and submits the form
- **AND** document_id is unique
- **THEN** system creates the student record with active=true, accepted=false
- **AND** system creates a students_fathers link with father's ID and selected relationship
- **AND** student appears in father's student list with "Pendiente" status

### Requirement: Success feedback after registration
The system SHALL show success feedback and update the student list after successful registration.

#### Scenario: Registration success
- **WHEN** student is successfully created
- **THEN** system closes the modal
- **AND** system displays success message "Tu solicitud está pendiente de aprobación"
- **AND** system refreshes the student list to show the new student
