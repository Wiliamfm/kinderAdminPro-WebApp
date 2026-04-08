## ADDED Requirements

### Requirement: Email workflow SHALL be implemented as TypeScript server functions
The email sending workflow currently in `pb_hooks/main.pb.js` SHALL be ported to TypeScript server functions under `src/lib/server/email/`. The Resend SDK (`resend` npm package) SHALL replace raw HTTP calls.

#### Scenario: Email server function is callable from event pages
- **WHEN** a user triggers email sending from the event management UI
- **THEN** a `"use server"` function handles the request
- **THEN** the function executes entirely on the server

### Requirement: Recipient resolution SHALL support all source types
The server SHALL resolve email recipients from multiple source types: individual students, employees, grade groups (all students in a grade), and fathers/guardians. Each source type SHALL query PocketBase to get email addresses.

#### Scenario: Recipients from a grade group
- **WHEN** email is sent to a grade group
- **THEN** the server queries all active students in that grade from PocketBase
- **THEN** each student's email is included in the recipient list

#### Scenario: Recipients from father/guardian links
- **WHEN** email is sent to fathers of selected students
- **THEN** the server resolves father records linked to each student
- **THEN** father email addresses are included in the recipient list

#### Scenario: Recipients from individual employees
- **WHEN** email is sent to specific employees
- **THEN** the server retrieves each employee's email from PocketBase

### Requirement: Recipient deduplication SHALL prevent duplicate emails
The server SHALL deduplicate recipients by email address before sending. When the same email appears from multiple sources, it SHALL be sent only once, but all sources SHALL be tracked.

#### Scenario: Same email from student and father
- **WHEN** a student and their father share the same email address
- **THEN** only one email is sent to that address
- **THEN** the delivery record tracks both sources

#### Scenario: Employee appears in multiple selection groups
- **WHEN** an employee is selected individually and also appears in a group
- **THEN** only one email is sent to that employee

### Requirement: Email body SHALL be built from text with HTML escaping
The server SHALL convert plain text email content to HTML, escaping special characters to prevent XSS. Line breaks SHALL be converted to `<br>` tags.

#### Scenario: Text with special characters is escaped
- **WHEN** email text contains `<`, `>`, `&`, or `"`
- **THEN** the HTML body escapes these characters
- **THEN** the email renders safely without executing scripts

#### Scenario: Line breaks are preserved
- **WHEN** email text contains newline characters
- **THEN** the HTML body includes `<br>` tags at each line break

### Requirement: Delivery tracking SHALL record status per recipient
The server SHALL create delivery tracking records in PocketBase for each recipient. Each record SHALL include the recipient email, source type, send status (success/failure), and error message if applicable.

#### Scenario: Successful delivery is tracked
- **WHEN** an email is sent successfully via Resend
- **THEN** a PocketBase record is created with status "sent" for that recipient

#### Scenario: Failed delivery is tracked with error
- **WHEN** an email fails to send via Resend
- **THEN** a PocketBase record is created with status "failed" and the error message

#### Scenario: Batch delivery tracks each recipient independently
- **WHEN** emails are sent to 10 recipients and 2 fail
- **THEN** 8 records have status "sent" and 2 have status "failed"

### Requirement: Resend API key SHALL be a server-only secret
The Resend API key SHALL be read from `process.env.RESEND_API_KEY` in server functions only. It SHALL never appear in client-side code or be exposed via `VITE_*` prefix.

#### Scenario: API key not in client bundle
- **WHEN** the production client JavaScript is inspected
- **THEN** no Resend API key value appears in the code

### Requirement: pb_hooks email endpoint SHALL be removed after verification
After the TypeScript email workflow is verified to produce identical behavior, the `pb_hooks/main.pb.js` file SHALL be removed. No custom PocketBase hooks SHALL remain.

#### Scenario: pb_hooks removed
- **WHEN** the email migration is verified complete
- **THEN** `pb_hooks/main.pb.js` is deleted
- **THEN** PocketBase runs without custom hooks

#### Scenario: Parity verification before removal
- **WHEN** the TypeScript email workflow is tested
- **THEN** it produces the same recipient resolution, deduplication, and delivery tracking as the pb_hooks version
