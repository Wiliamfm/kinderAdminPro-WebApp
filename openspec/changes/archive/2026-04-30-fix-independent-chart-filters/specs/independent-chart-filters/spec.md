## ADDED Requirements

### Requirement: Semester/year chart has independent year filter
The semester/year chart ("Estudiantes por trimestre/año") SHALL have its own year filter signal, independent of the main table's applied filters. Changing the table's year filter SHALL NOT affect the chart's displayed data.

#### Scenario: Chart ignores table year filter
- **WHEN** the user applies a year filter on the main table
- **THEN** the semester/year chart data SHALL remain unchanged

#### Scenario: Chart year dropdown filters chart data
- **WHEN** the user selects a year in the semester/year chart's own year dropdown
- **THEN** only semesters belonging to that year SHALL be shown in semester grouping mode
- **AND** only that year SHALL be shown in year grouping mode

#### Scenario: Chart shows all data when no year selected
- **WHEN** the semester/year chart's year dropdown is set to the default (empty/all) value
- **THEN** the chart SHALL display data across all available years and semesters

### Requirement: Consistent data between grouping modes
When switching between semester and year grouping on the semester/year chart, both views SHALL use the same filtered data source based on the chart's own year filter.

#### Scenario: Switching grouping mode preserves filter context
- **WHEN** the user selects a year in the chart's year dropdown
- **AND** the user toggles between "Trimestre" and "Año" grouping
- **THEN** both views SHALL reflect only the data for the selected year

### Requirement: Grade chart remains independent
The existing grade chart's independent filter behavior SHALL NOT be affected by this change.

#### Scenario: Grade chart unaffected
- **WHEN** the user changes filters on the semester/year chart or the main table
- **THEN** the grade chart's displayed data SHALL remain unchanged unless its own filters are modified
