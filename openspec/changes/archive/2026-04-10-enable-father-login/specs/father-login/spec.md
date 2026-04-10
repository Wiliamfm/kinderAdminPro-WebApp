## ADDED Requirements

### Requirement: Father can register with password
The system SHALL allow fathers registering a student through the public enrollment form to create a user account by providing a password.

#### Scenario: Successful registration with password
- **WHEN** father fills out registration form with valid student data, father data, and password (minimum 8 characters)
- **THEN** system creates a user account in the users collection with the father's email as username and the provided password
- **AND** system creates a father record in the fathers collection
- **AND** system creates a student record in the students collection
- **AND** system links the student to the father in the students_fathers collection

#### Scenario: Password too short
- **WHEN** father enters a password with fewer than 8 characters
- **THEN** system displays validation error "La contraseña debe tener al menos 8 caracteres"

#### Scenario: Passwords do not match
- **WHEN** father enters different values in password and password confirmation fields
- **THEN** system displays validation error "Las contraseñas no coinciden"

#### Scenario: Email already in use
- **WHEN** father registers with an email that already has a user account
- **THEN** system displays error "El correo electrónico ya está en uso"

### Requirement: Father can log in with email and password
The system SHALL allow fathers who have registered to log in using their email and password.

#### Scenario: Successful login
- **WHEN** father enters email and correct password on login page
- **THEN** system authenticates the user and redirects to the appropriate dashboard

#### Scenario: Invalid credentials
- **WHEN** father enters email with incorrect password
- **THEN** system displays error "Email o contraseña incorrectos" and does not authenticate

### Requirement: Father has father role
The system SHALL assign the 'father' role to users created through public enrollment.

#### Scenario: Father role assigned on registration
- **WHEN** father successfully registers with password
- **THEN** the created user account has roles array containing 'father'

#### Scenario: Father role enables parent features
- **WHEN** authenticated user with 'father' role accesses the system
- **THEN** system grants access to parent-specific features (bulletins, reports, student information)