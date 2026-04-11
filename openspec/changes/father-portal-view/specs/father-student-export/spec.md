## ADDED Requirements

### Requirement: Father can export student bulletins as PDF
The system SHALL generate a PDF export of bulletins for a specific student.

#### Scenario: Export student bulletins
- **WHEN** father clicks "Exportar" on a student row
- **THEN** system downloads a PDF file with that student's bulletins

#### Scenario: Export with no bulletins
- **WHEN** father attempts to export a student with no bulletins
- **THEN** system shows error message "No hay boletines para exportar."

### Requirement: PDF follows same format as reports export
The exported PDF SHALL use the same layout as the Reports module student export.

#### Scenario: PDF format matches reports
- **WHEN** father exports bulletins
- **THEN** PDF is grouped by grade and semester, with columns: Estudiante, Documento, Categoría, Descripción, Nota, Comentarios