## ADDED Requirements

### Requirement: Admin sets initial password when creating an employee
When creating a new employee, the admin SHALL provide a password and a password confirmation for the professor's account. The system MUST validate the password client-side before submission.

#### Scenario: Password fields are present in the create modal
- **WHEN** the admin opens the create employee modal
- **THEN** the modal SHALL display a "Contraseña" password input and a "Confirmar contraseña" password input

#### Scenario: Weak password is rejected
- **WHEN** the admin submits the create form with a password that does not meet complexity requirements (min 8 chars, one uppercase, one lowercase, one number, one symbol)
- **THEN** the system SHALL display an inline validation error and NOT submit the form

#### Scenario: Mismatched confirmation is rejected
- **WHEN** the admin submits the create form with a password and a non-matching confirmation
- **THEN** the system SHALL display a validation error and NOT submit the form

#### Scenario: Valid password creates the account immediately usable
- **WHEN** the admin submits a valid create form including a compliant password
- **THEN** the system SHALL create the user account with that password (no email sent) and the professor SHALL be able to log in with it immediately

### Requirement: Email-based onboarding is removed
The system SHALL NOT send any onboarding or password-setup emails when creating an employee. The per-row "Reenviar invitación" action SHALL be removed from the employee list.

#### Scenario: No email sent after employee creation
- **WHEN** a new employee is successfully created
- **THEN** the system SHALL NOT call any email-sending function and SHALL NOT display an invitation notice

#### Scenario: No resend button in employee list
- **WHEN** the admin views the employee list
- **THEN** there SHALL be no "Reenviar invitación" button per row

### Requirement: Password setup page is removed
The `/auth/set-password` route and its page component SHALL be deleted as it is no longer reachable.

#### Scenario: Route does not exist
- **WHEN** a user navigates to `/auth/set-password`
- **THEN** the application SHALL render the 404 page
