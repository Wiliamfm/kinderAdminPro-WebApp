## ADDED Requirements

### Requirement: Chart grouping toggle for semester chart

The "Estudiantes por trimestre" chart SHALL include a toggle control allowing users to switch between "Trimestre" and "Año" grouping modes.

#### Scenario: Toggle displays two options

- **WHEN** the chart section is rendered
- **THEN** a segmented toggle SHALL be displayed above the chart with options "Trimestre" and "Año"
- **AND** "Trimestre" SHALL be selected by default

#### Scenario: Toggle shows active state

- **WHEN** user clicks on a toggle option
- **THEN** that option SHALL be visually indicated as active/selected
- **AND** the chart SHALL update to reflect the new grouping

### Requirement: Trimestre grouping mode

When "Trimestre" is selected, the chart SHALL display distinct student counts grouped by individual semester.

#### Scenario: Default trimester view shows semesters

- **WHEN** "Trimestre" grouping is selected (default)
- **THEN** the chart x-axis SHALL display semester labels (e.g., "2026-1", "2026-2")
- **AND** bars SHALL represent the count of distinct students per semester
- **AND** the default view SHALL show the last 5 semesters

#### Scenario: Trimester view respects grade filter

- **WHEN** "Trimestre" grouping is selected
- **AND** user has selected a specific grade in filters
- **THEN** the chart SHALL display only students from that grade grouped by semester

### Requirement: Año grouping mode

When "Año" is selected, the chart SHALL aggregate and display distinct student counts grouped by academic year.

#### Scenario: Year view aggregates by year

- **WHEN** "Año" grouping is selected
- **THEN** the chart x-axis SHALL display year labels (e.g., "2026", "2025")
- **AND** bars SHALL represent the count of distinct students per year
- **AND** each year's count SHALL be the sum of distinct students across all semesters in that year

#### Scenario: Year view aggregates distinct students across semesters

- **GIVEN** student A has records in semesters 2026-1 and 2026-2
- **WHEN** "Año" grouping is selected with year 2026 active
- **THEN** student A SHALL be counted once for year 2026
- **AND** the year bar SHALL NOT double-count students appearing in multiple semesters

#### Scenario: Year view respects filters

- **WHEN** "Año" grouping is selected
- **AND** user has selected a specific grade in filters
- **THEN** the chart SHALL display only students from that grade aggregated by year

#### Scenario: Year view handles cross-year semesters

- **GIVEN** semester spans 2025-11-01 to 2026-03-15
- **WHEN** "Año" grouping is selected
- **THEN** students from this semester SHALL be counted in BOTH year 2025 and year 2026
- **AND** each year bar SHALL accurately reflect the distinct student count for that year

### Requirement: Chart data derived from analytics records

The year grouping SHALL use the same `BulletinStudentAnalyticsRecord` data as the existing charts, with additional year aggregation.

#### Scenario: Year derived from semester dates

- **WHEN** analytics records are processed for year grouping
- **THEN** the system SHALL extract year from each record's semester using the semester's `start_date` and `end_date`
- **AND** a record SHALL contribute to a year if the semester overlaps with that year

#### Scenario: Year view limits to available years with data

- **WHEN** "Año" grouping is selected
- **THEN** only years with actual student data SHALL be displayed on the x-axis
- **AND** years with zero students SHALL be excluded from the chart
