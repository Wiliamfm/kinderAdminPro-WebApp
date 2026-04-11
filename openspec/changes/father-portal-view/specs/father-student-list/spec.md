## ADDED Requirements

### Requirement: Father can view list of linked students
The system SHALL display all students linked to the authenticated father/mother/guardian sorted alphabetically by name.

#### Scenario: Father with linked students
- **WHEN** father logs in and navigates to the father portal
- **THEN** system displays a list of all linked students with their name, grade, and status

#### Scenario: Father with no linked students
- **WHEN** father logs in and has no students linked
- **THEN** system displays a message "No hay estudiantes vinculados. Contacte al administrador."

### Requirement: Student status is displayed correctly
The system SHALL display each student's enrollment status based on their record fields.

#### Scenario: Student is active and accepted
- **WHEN** student's record has active=true and accepted=true
- **THEN** display status as "Activo"

#### Scenario: Student is active but pending acceptance
- **WHEN** student's record has active=true and accepted=false
- **THEN** display status as "Pendiente"

#### Scenario: Student was rejected
- **WHEN** student's record has a rejected timestamp
- **THEN** display status as "Rechazado"

#### Scenario: Student is inactive
- **WHEN** student's record has active=false and no rejected timestamp
- **THEN** display status as "Desactivado"

### Requirement: Student shows grade information
Each student in the list SHALL display the grade name they are enrolled in.

#### Scenario: Student in a grade
- **WHEN** student has a grade_id linked
- **THEN** display the grade name in the student list