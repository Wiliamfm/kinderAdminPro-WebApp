## MODIFIED Requirements

### Requirement: Leave management UI SHALL require semester selection
The professor leave create/edit modal SHALL display the semester as read-only text instead of an interactive dropdown. For new leaves, the system MUST automatically assign the current semester (`is_current = true`). For existing leaves, the system MUST display the leave's stored semester. The semester SHALL NOT be changeable by professors.

#### Scenario: New leave displays current semester as text
- **WHEN** a professor opens the leave modal to create a new leave and a current semester exists
- **THEN** the semester is displayed as read-only text showing the current semester's name
- **THEN** the `semesterId` is automatically set to the current semester's ID

#### Scenario: Editing preserves the saved semester as text
- **WHEN** a professor opens an existing leave for editing
- **THEN** the semester field shows the leave's stored semester name as read-only text
- **THEN** the semester value cannot be changed

#### Scenario: Missing semester blocks submission
- **WHEN** a professor attempts to create a leave without a semester (no current semester exists)
- **THEN** the system rejects the submission and shows a validation error for the semester field

### Requirement: Leave management SHALL fail clearly when no current semester is configured
The system SHALL NOT allow professor leave creation when no semester has `is_current = true`. The UI MUST present a clear error message indicating the professor should contact an administrator.

#### Scenario: No current semester shows contact-admin error
- **WHEN** a professor opens the leave modal and no semester has `is_current = true`
- **THEN** the modal displays an error: "No hay un semestre activo configurado. Contacta al administrador."
- **THEN** the confirm button is disabled

### Requirement: Professor leave modal SHALL fetch only the current semester
The professor leave modal SHALL call `getCurrentSemester()` instead of `listSemesterOptions()`. Only one semester record MUST be fetched from the database, not the full collection.

#### Scenario: Modal fetches single current semester record
- **WHEN** a professor opens the leave creation modal
- **THEN** the system queries only for the semester with `is_current = true`
- **THEN** the system does NOT fetch the full list of semesters
