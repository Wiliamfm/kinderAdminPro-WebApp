## ADDED Requirements

### Requirement: Independent year selector for "Estudiantes por grado" chart
The "Estudiantes por grado" chart in the reports/students page SHALL have an independent year selector that controls which semesters appear in the chart's semester dropdown, separate from the table filters.

#### Scenario: Chart displays year selector
- **WHEN** the reports/students page loads
- **THEN** the "Estudiantes por grado" chart section displays a year dropdown above the existing semester dropdown

#### Scenario: Chart year selection filters semesters
- **WHEN** user selects a year in the chart's year dropdown
- **THEN** the semester dropdown shows only semesters associated with that year

#### Scenario: Chart year selection is independent from table
- **WHEN** user selects "2024" in table filters and applies it
- **AND** user selects "2023" in the chart's year dropdown
- **THEN** the chart displays semesters from 2023, while the table shows data from 2024

#### Scenario: Chart year selector defaults to empty (all years)
- **WHEN** page loads with no chart year selected
- **THEN** the semester dropdown shows all available semesters

#### Scenario: Clearing chart year resets to all semesters
- **WHEN** user has a year selected in the chart
- **AND** user changes the dropdown to empty/blank
- **THEN** the semester dropdown resets to show all available semesters