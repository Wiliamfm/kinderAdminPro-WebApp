## ADDED Requirements

### Requirement: Unique field error detection helper
The system SHALL provide a reusable function `isUniqueFieldError(error, fieldName)` that detects PocketBase unique constraint violations for any specified field.

#### Scenario: Detect document_id duplicate
- **WHEN** a PocketBase create operation fails with duplicate document_id
- **THEN** `isUniqueFieldError(error, 'document_id')` returns `true`

#### Scenario: Detect name duplicate
- **WHEN** a PocketBase create operation fails with duplicate name (grades, semesters)
- **THEN** `isUniqueFieldError(error, 'name')` returns `true`

#### Scenario: Detect email duplicate  
- **WHEN** a PocketBase create operation fails with duplicate email
- **THEN** `isUniqueFieldError(error, 'email')` returns `true`

#### Scenario: Non-unique error returns false
- **WHEN** a PocketBase create operation fails with a non-unique error (e.g., required field missing)
- **THEN** `isUniqueFieldError(error, 'document_id')` returns `false`

### Requirement: Field label translation
The system SHALL provide a function `getUniqueFieldLabel(fieldName)` that returns the Spanish label for unique field names.

#### Scenario: Document ID label
- **WHEN** `getUniqueFieldLabel('document_id')` is called
- **THEN** it returns `"documento"`

#### Scenario: Name label
- **WHEN** `getUniqueFieldLabel('name')` is called
- **THEN** it returns `"nombre"`

#### Scenario: Email label
- **WHEN** `getUniqueFieldLabel('email')` is called
- **THEN** it returns `"correo electrónico"`

#### Scenario: Unknown field
- **WHEN** `getUniqueFieldLabel('unknown_field')` is called
- **THEN** it returns `"unknown_field"` (fallback to field name)

### Requirement: Contextual error messages
The PocketBase wrapper functions SHALL catch unique field errors and throw localized error messages indicating which field caused the conflict.

#### Scenario: Employee document_id duplicate
- **WHEN** creating an employee with a duplicate document_id
- **THEN** the error message is "El documento ya está registrado"

#### Scenario: Student document_id duplicate
- **WHEN** creating a student (via public registration) with a duplicate document_id
- **THEN** the error message is "El documento ya está registrado"

#### Scenario: Father document_id duplicate
- **WHEN** creating a father with a duplicate document_id
- **THEN** the error message is "El documento ya está registrado"

#### Scenario: Grade name duplicate
- **WHEN** creating a grade with a duplicate name
- **THEN** the error message is "El nombre ya está en uso"

#### Scenario: Semester name duplicate
- **WHEN** creating a semester with a duplicate name
- **THEN** the error message is "El nombre ya está en uso"

### Requirement: Fallback for unparseable errors
When the error response cannot be parsed for field information, the system SHALL fall back to the generic translated error.

#### Scenario: Unknown error format
- **WHEN** PocketBase returns an error in an unexpected format
- **THEN** the error message is the generic "No se pudo crear el registro" (not "Value must be unique")