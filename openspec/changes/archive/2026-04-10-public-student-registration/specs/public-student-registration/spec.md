## ADDED Requirements

### Requirement: Public registration page accessible
The system SHALL provide a public registration route at `/register` that is accessible without authentication.

#### Scenario: Unauthenticated user accesses registration
- **WHEN** a user navigates to `/register` without being authenticated
- **THEN** the registration form is displayed without redirecting to login

#### Scenario: Authenticated user accesses registration
- **WHEN** an authenticated user navigates to `/register`
- **THEN** the registration form is displayed (same as unauthenticated)

### Requirement: Student information collection
The registration form SHALL collect the following student information:
- name (required)
- grade_id (required, must be active grade)
- date_of_birth (required)
- birth_place (required)
- department (required)
- document_id (required, numeric only)
- weight (optional)
- height (optional)
- blood_type (required)
- social_security (optional)
- allergies (optional)

#### Scenario: Form displays all student fields
- **WHEN** the user views the registration page
- **THEN** all student fields are displayed with appropriate labels and input types

#### Scenario: Required fields validated on submit
- **WHEN** user submits with empty required fields
- **THEN** validation errors are displayed inline for each missing field

#### Scenario: Numeric fields validated
- **WHEN** user enters non-numeric value in document_id, weight, or height
- **THEN** appropriate validation error is displayed

### Requirement: Father/Guardian information collection
The registration form SHALL collect the following father information:
- full_name (required)
- document_id (required, numeric only)
- phone_number (required)
- occupation (required)
- company (optional)
- email (required)
- address (required)
- relationship (required, one of: father, mother, other)

#### Scenario: Father form displays all required fields
- **WHEN** the user scrolls to father section
- **THEN** all father fields are displayed with appropriate labels

#### Scenario: Relationship selector has correct options
- **WHEN** user views the relationship dropdown
- **THEN** options are: Padre, Madre, Otro

### Requirement: Data submission creates pending enrollment
Upon form submission, the system SHALL:
1. Create a father record with is_active=true
2. Create a student record with active=true, accepted=false
3. Create a link between student and father with the selected relationship

#### Scenario: Successful submission
- **WHEN** user submits valid form
- **THEN** student is created with active=true, accepted=false
- **AND** father is created with is_active=true
- **AND** link between them is created
- **AND** success message is displayed

#### Scenario: Partial creation failure
- **WHEN** student creation succeeds but father creation fails
- **THEN** student creation is rolled back
- **AND** error message is displayed

#### Scenario: Link creation failure
- **WHEN** student and father created but link fails
- **THEN** both student and father are deleted
- **AND** error message is displayed

### Requirement: Success confirmation display
After successful submission, the system SHALL display a message indicating the enrollment is pending approval.

#### Scenario: Success message displayed
- **WHEN** form submission completes successfully
- **THEN** message "Tu solicitud está pendiente de aprobación" is displayed
- **AND** form is no longer displayed