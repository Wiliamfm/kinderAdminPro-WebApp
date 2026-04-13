## ADDED Requirements

### Requirement: Father can view bulletins for each student
The system SHALL display all bulletins (grades/notes) for a selected student, grouped by grade and semester.

#### Scenario: Viewing bulletins for a student
- **WHEN** father clicks on a student in the list
- **THEN** system displays all bulletins for that student grouped by grade and semester

#### Scenario: Student has no bulletins
- **WHEN** father views a student with no bulletins_students records
- **THEN** system displays "No hay boletines registrados para este estudiante."

### Requirement: Bulletin display shows required fields
Each bulletin entry SHALL display: bulletin category, description, semester, grade, note, and comments.

#### Scenario: Bulletin entry displays all fields
- **WHEN** father views a bulletin entry
- **THEN** system shows: Categoría, Descripción, Trimestre, Grado, Nota, Comentarios

### Requirement: Bulletins are ordered by most recent first
The bulletins SHALL be sorted by creation date (newest first).

#### Scenario: Bulletin order
- **WHEN** father views bulletins for a student
- **THEN** bulletins are displayed in descending order by created_at