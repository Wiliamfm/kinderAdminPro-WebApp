## ADDED Requirements

### Requirement: Father can open contact modal
The system SHALL display a "Contactar" button in the father portal that opens a modal dialog when clicked.

#### Scenario: Button click opens modal
- **WHEN** father clicks the "Contactar" button in the portal header
- **THEN** a modal dialog opens with employee selection, subject input, body textarea, and action buttons

### Requirement: Father can select employees to contact
The system SHALL display a multi-select dropdown listing all active employees with format "Name - email". The father MUST select at least one employee to send a message.

#### Scenario: Employee list loads
- **WHEN** the contact modal opens
- **THEN** the system fetches all active employees using `listActiveEmployees()` and displays them in the multi-select dropdown with format "{name} - {email}"

#### Scenario: Father selects employees
- **WHEN** father selects one or more employees from the multi-select
- **THEN** the selected employee IDs are stored for sending

#### Scenario: No employees selected prevents send
- **WHEN** father attempts to send without selecting any employee
- **THEN** the system displays an error message and does not send the email

### Requirement: Subject field auto-prefixes father information
The system SHALL prepend "{fatherEmail} - {fatherName}:" to the subject line. The father enters their custom subject after the colon.

#### Scenario: Subject field displays prefix
- **WHEN** the contact modal opens
- **THEN** the subject input displays the prefix "{fatherEmail} - {fatherName}:" where the father enters their custom subject after the colon

#### Scenario: Father enters custom subject
- **WHEN** father types in the subject field after the prefix
- **THEN** the custom text is appended to form the complete subject

### Requirement: Father can compose message body
The system SHALL provide a textarea for the father to compose their message body. The body MUST NOT be empty when sending.

#### Scenario: Body textarea available
- **WHEN** the contact modal opens
- **THEN** a textarea is available for composing the message body

#### Scenario: Empty body prevents send
- **WHEN** father attempts to send with an empty body
- **THEN** the system displays an error message and does not send the email

### Requirement: Email sent to selected employees via existing infrastructure
The system SHALL send the composed email to all selected employees using the existing `sendEventEmail()` function which handles DB persistence and SMTP delivery.

#### Scenario: Send button clicked with valid form
- **WHEN** father clicks "Enviar" with at least one employee selected and non-empty subject and body
- **THEN** the system calls `sendEventEmail()` with the composed subject and body, and selected employee recipients

#### Scenario: Email persisted to database
- **WHEN** `sendEventEmail()` is called
- **THEN** the email is saved to the `email_messages` table and recipients are saved to `email_message_recipients` table

#### Scenario: Email sent via SMTP
- **WHEN** `sendEventEmail()` processes recipients
- **THEN** each recipient with a valid email receives the message via SMTP

### Requirement: Success feedback displayed after send
The system SHALL display a success message after the email is sent successfully.

#### Scenario: Send successful
- **WHEN** `sendEventEmail()` completes without error
- **THEN** a success message is displayed to the father

### Requirement: Error feedback displayed on failure
The system SHALL display an error message if the email send fails.

#### Scenario: Send fails
- **WHEN** `sendEventEmail()` throws an error
- **THEN** an error message is displayed to the father explaining the failure

### Requirement: Modal can be closed without sending
The system SHALL allow the father to close the modal without sending a message by clicking "Cancelar" or the modal close button.

#### Scenario: Cancel closes modal
- **WHEN** father clicks "Cancelar" or the modal close button
- **THEN** the modal closes and no email is sent