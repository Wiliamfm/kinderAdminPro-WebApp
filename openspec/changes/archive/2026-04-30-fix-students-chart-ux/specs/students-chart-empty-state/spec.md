## ADDED Requirements

### Requirement: Per-chart empty state message
Each chart panel SHALL display a "Sin datos para mostrar." message when its data points array is empty. The chart canvas SHALL be hidden (not removed from DOM) when there is no data.

#### Scenario: Grade chart has no data
- **WHEN** `gradeChartPoints` returns an empty array
- **THEN** the grade chart panel SHALL display "Sin datos para mostrar." instead of a blank canvas

#### Scenario: Semester chart has no data in semester mode
- **WHEN** `semesterChartGrouping` is 'semester' and `semesterChartPoints` returns an empty array
- **THEN** the semester chart panel SHALL display "Sin datos para mostrar." instead of a blank canvas

#### Scenario: Year chart has no data in year mode
- **WHEN** `semesterChartGrouping` is 'year' and `yearChartPoints` returns an empty array
- **THEN** the semester chart panel SHALL display "Sin datos para mostrar." instead of a blank canvas

#### Scenario: One chart has data while the other does not
- **WHEN** the grade chart has data but the semester/year chart does not (or vice versa)
- **THEN** the chart with data SHALL render normally and the empty chart SHALL show its own "Sin datos" message independently

### Requirement: Reset filters on grouping toggle
When the user toggles between "Trimestre" and "Año" grouping, the chart's year and grade filters SHALL be reset to their default (empty) values.

#### Scenario: Toggle from Trimestre to Año
- **WHEN** the user clicks the "Año" grouping button
- **THEN** `semesterChartYearId` and `semesterChartGradeId` SHALL be reset to empty strings
- **AND** the year chart SHALL render with unfiltered data

#### Scenario: Toggle from Año to Trimestre
- **WHEN** the user clicks the "Trimestre" grouping button
- **THEN** `semesterChartYearId` and `semesterChartGradeId` SHALL be reset to empty strings
- **AND** the semester chart SHALL render with unfiltered data

### Requirement: Consistent zero-value handling across grouping modes
`yearChartPoints` SHALL include years with zero students in its output, consistent with how `semesterChartPoints` includes semesters with zero students. Years SHALL NOT be silently filtered out.

#### Scenario: Year with zero students
- **WHEN** a year exists in `yearIdsOrdered` but has zero matching students
- **THEN** that year SHALL appear in the chart with a value of 0

### Requirement: Independent chart visibility
Each chart panel SHALL independently determine its own visibility. The rendering of one chart SHALL NOT depend on whether the other chart has data.

#### Scenario: Only grade chart has data
- **WHEN** `gradeChartPoints` has data but the active semester/year grouping has no data
- **THEN** the grade chart SHALL render normally and the semester/year panel SHALL show its empty state message

#### Scenario: Only semester chart has data
- **WHEN** the active semester/year grouping has data but `gradeChartPoints` is empty
- **THEN** the semester/year chart SHALL render normally and the grade panel SHALL show its empty state message
