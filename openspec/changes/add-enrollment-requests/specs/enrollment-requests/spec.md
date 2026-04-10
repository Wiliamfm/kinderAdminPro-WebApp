## ADDED Requirements

### Requirement: Admin can view pending enrollment requests
The system SHALL display a table listing all pending enrollment requests where `active = false`, `accepted = false`, and `rejected = null`. Each row SHALL show the student's name, document ID, grade, birth place, department, father name, and creation timestamp.

#### Scenario: Page loads with pending requests
- **WHEN** an admin navigates to `/enrollment-management/requests`
- **THEN** the page displays a table with pending enrollment requests
- **AND** each row shows: name, document, grade, birth place, department, father, created date
- **AND** an Actions column with Accept (checkmark) and Reject (X) buttons

#### Scenario: No pending requests exist
- **WHEN** an admin navigates to `/enrollment-management/requests` and no pending requests exist
- **THEN** the page displays "No hay solicitudes pendientes."

### Requirement: Admin can accept an enrollment request
When an admin clicks the Accept button on a pending request, the system SHALL update that student's record to set `accepted = true` and `active = true`, effectively enrolling the student.

#### Scenario: Admin accepts a pending request
- **WHEN** an admin clicks the Accept (checkmark) button on a pending request row
- **THEN** the student's record is updated with `accepted = true` and `active = true`
- **AND** the row is removed from the pending requests table
- **AND** no error message is shown

#### Scenario: Accept action fails due to server error
- **WHEN** an admin clicks the Accept button and the server returns an error
- **THEN** an error message is displayed to the user
- **AND** the request remains in the pending table

### Requirement: Admin can reject an enrollment request
When an admin clicks the Reject button on a pending request, the system SHALL update that student's record to set `rejected` to the current timestamp, effectively soft-deleting the request.

#### Scenario: Admin rejects a pending request
- **WHEN** an admin clicks the Reject (X) button on a pending request row
- **THEN** the student's record is updated with `rejected = NOW()`
- **AND** the row is removed from the pending requests table
- **AND** no error message is shown

#### Scenario: Reject action fails due to server error
- **WHEN** an admin clicks the Reject button and the server returns an error
- **THEN** an error message is displayed to the user
- **AND** the request remains in the pending table

### Requirement: Page requires enrollment module access
The enrollment requests page SHALL only be accessible to users with the `enrollment` module permission (admins). Users without this permission SHALL be redirected.

#### Scenario: User without enrollment permission accesses the page
- **WHEN** a user without enrollment permission navigates to `/enrollment-management/requests`
- **THEN** the user is redirected to the home page