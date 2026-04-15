## ADDED Requirements

### Requirement: Year filter dropdown in reports students page

The reports students page SHALL include a new "Año" (Year) dropdown filter alongside the existing grade and semester filters.

#### Scenario: Year options are derived from semesters

- **WHEN** the form options are loaded
- **THEN** the system SHALL derive unique years from all semesters by extracting the year from both `start_date` and `end_date` fields
- **AND** the year dropdown SHALL be populated with these derived years in descending order

#### Scenario: Year filter appears before semester filter

- **WHEN** the user views the reports students filters section
- **THEN** the year dropdown SHALL appear in the filter row before the semester dropdown
- **AND** the filter order SHALL be: [Año] → [Grado] → [Trimestre] → [Estudiantes]

#### Scenario: Year filter shows "Todos los años" option

- **WHEN** the year dropdown is rendered
- **THEN** the first option SHALL be "Todos los años" with empty value
- **AND** selecting this option SHALL show all semesters regardless of year

### Requirement: Semester filter respects year selection

When a year is selected in the year filter, the semester dropdown SHALL only show semesters whose date range overlaps with the selected year.

#### Scenario: Semester shown when start_date falls in selected year

- **WHEN** semester has `start_date` = "2026-01-15" and year "2026" is selected
- **THEN** this semester SHALL appear in the semester dropdown

#### Scenario: Semester shown when end_date falls in selected year

- **WHEN** semester has `end_date` = "2026-04-15" and year "2026" is selected
- **THEN** this semester SHALL appear in the semester dropdown

#### Scenario: Cross-year semester appears in both years

- **WHEN** semester has `start_date` = "2025-11-01" and `end_date` = "2026-03-15"
- **THEN** this semester SHALL appear when year "2025" is selected
- **AND** this semester SHALL appear when year "2026" is selected

#### Scenario: No year selected shows all semesters

- **WHEN** year filter is set to "Todos los años" (empty value)
- **THEN** the semester dropdown SHALL show all semesters
- **AND** the semester dropdown SHALL show the "Todos los trimestres" option first

### Requirement: Year filter affects data queries

When a year is selected, the system SHALL filter bulletin student records to only include records whose semester belongs to the selected year.

#### Scenario: Table data filtered by year

- **WHEN** user selects year "2026" and applies filters
- **THEN** the table SHALL display only bulletin student records where the semester's `start_date` or `end_date` falls within year 2026
- **AND** records from semesters outside year 2026 SHALL NOT appear

#### Scenario: Year filter combined with semester filter

- **WHEN** user selects year "2026" AND selects specific semester "2026-1"
- **THEN** the table SHALL display only bulletin student records for semester "2026-1"
- **AND** the semester filter SHALL be constrained to show only semesters in year 2026

### Requirement: Year filter state persistence

The year filter SHALL follow the same apply/clear pattern as other filters.

#### Scenario: Year filter requires apply button

- **WHEN** user changes the year dropdown selection
- **THEN** the filter SHALL NOT take effect until the "Aplicar filtros" button is clicked
- **AND** the "Limpiar" button SHALL reset the year filter to "Todos los años"

#### Scenario: Year filter affects chart data

- **WHEN** user selects year "2026" and applies filters
- **THEN** the "Estudiantes por grado" chart SHALL reflect only students from semesters in year 2026
- **AND** the "Estudiantes por año" chart grouping SHALL show data for year 2026
