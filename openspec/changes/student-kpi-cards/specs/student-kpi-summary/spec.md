## ADDED Requirements

### Requirement: KPI cards row above charts
The analytics section SHALL display a row of KPI summary cards between the section header ("Distribución de estudiantes") and the charts grid.

#### Scenario: Cards visible when analytics loaded
- **WHEN** the analytics data finishes loading
- **THEN** two KPI cards SHALL be visible: "Estudiantes únicos" and "Promedio nota"

### Requirement: Unique students KPI
The "Estudiantes únicos" card SHALL display the count of distinct `student_id` values from the filtered analytics dataset.

#### Scenario: Unique students with data
- **WHEN** the filtered analytics dataset contains records with `student_id` values `["s1", "s1", "s2", "s3"]`
- **THEN** the card SHALL display `3`

#### Scenario: Unique students with no data
- **WHEN** the filtered analytics dataset is empty
- **THEN** the card SHALL display `0`

### Requirement: Average note KPI
The "Promedio nota" card SHALL display the arithmetic mean of all `note` values from the filtered analytics dataset, formatted with one decimal place.

#### Scenario: Average note with data
- **WHEN** the filtered analytics dataset contains records with `note` values `[7, 8, 9]`
- **THEN** the card SHALL display `8.0`

#### Scenario: Average note with no data
- **WHEN** the filtered analytics dataset is empty
- **THEN** the card SHALL display `0.0`

### Requirement: KPIs are filter-aware
The KPI values SHALL be computed from the analytics dataset filtered by the table's applied filters (year, grade, semester, specific students), using the same filter resolution logic as the table query.

#### Scenario: KPIs update when table filters are applied
- **WHEN** the user applies a table filter for grade "Grado 3"
- **THEN** the KPI cards SHALL recompute using only analytics records where `grade_id` matches "Grado 3"

#### Scenario: KPIs update when year filter is applied
- **WHEN** the user applies a table filter for year "2025"
- **THEN** the KPI cards SHALL recompute using only analytics records whose `semester_id` belongs to a semester associated with year 2025

#### Scenario: KPIs reflect all data when no filters applied
- **WHEN** no table filters are applied
- **THEN** the KPI cards SHALL compute from the full analytics dataset

### Requirement: KPI loading state
The KPI card area SHALL show a loading placeholder while analytics data is loading, consistent with the existing chart loading state.

#### Scenario: Analytics loading
- **WHEN** the analytics resource is in a loading state
- **THEN** the KPI card area SHALL display a loading placeholder instead of cards

### Requirement: KPI error state
The KPI card area SHALL not render when the analytics resource has an error. The existing analytics error message already covers this.

#### Scenario: Analytics error
- **WHEN** the analytics resource has an error
- **THEN** the KPI cards SHALL NOT be rendered (the existing error banner handles this)
