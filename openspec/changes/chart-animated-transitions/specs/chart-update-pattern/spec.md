## ADDED Requirements

### Requirement: Charts use update-in-place lifecycle
Each student report chart instance SHALL be created once when its canvas element mounts, and SHALL use `chart.update()` to apply data changes reactively. Chart instances SHALL NOT be destroyed and recreated on data changes.

#### Scenario: Chart created on canvas mount
- **WHEN** the canvas element for a chart becomes available
- **THEN** a Chart.js instance SHALL be created with the initial chart configuration (type, styling, options) and empty data

#### Scenario: Chart updated on data change
- **WHEN** the reactive chart points memo produces new values
- **THEN** the existing chart instance's `data.labels`, `data.datasets[0].data`, and `data.datasets[0].label` SHALL be updated and `chart.update()` SHALL be called

#### Scenario: Chart destroyed on component cleanup
- **WHEN** the reports page component unmounts
- **THEN** all chart instances SHALL be destroyed via `chart.destroy()`

### Requirement: Data transitions are animated
Chart bars SHALL animate smoothly when data changes, using Chart.js's default update transition animation.

#### Scenario: Filter change triggers bar animation
- **WHEN** the user changes a chart filter (semester, grade, or year) causing new data points
- **THEN** the chart bars SHALL animate from their previous values to the new values instead of the chart flickering

#### Scenario: Grouping toggle triggers animation
- **WHEN** the user switches between semester and year grouping on the semester/year chart
- **THEN** the chart SHALL animate to display the new grouping's data

### Requirement: Semester and year chart share a single update path
The semester distribution chart and year distribution chart, which share a single canvas, SHALL be managed by a single reactive update that reads the current grouping mode to select the appropriate data points.

#### Scenario: Semester grouping selected
- **WHEN** `semesterChartGrouping` is `'semester'`
- **THEN** the chart SHALL display `semesterChartPoints` data with semester-specific labels and styling

#### Scenario: Year grouping selected
- **WHEN** `semesterChartGrouping` is `'year'`
- **THEN** the chart SHALL display `yearChartPoints` data with year-specific labels and styling

### Requirement: Empty data handled via update
When chart data becomes empty, the chart instance SHALL be updated with empty arrays rather than destroyed. Visibility of the chart card is controlled by existing visibility memos.

#### Scenario: Data becomes empty
- **WHEN** chart points memo returns an empty array
- **THEN** the chart SHALL be updated with `labels: []` and `data: []` and SHALL remain as a live instance

#### Scenario: Data returns after being empty
- **WHEN** chart points memo returns data after previously being empty
- **THEN** the chart SHALL animate to display the new data without being recreated

### Requirement: Chart output is visually identical
The refactored charts SHALL produce identical visual output (bar colors, border radius, axis configuration, legend visibility, responsive behavior) to the current implementation.

#### Scenario: Grade chart appearance preserved
- **WHEN** the grade chart renders with data
- **THEN** it SHALL use background color `#facc15`, border color `#ca8a04`, border width 1, border radius 6, max bar thickness 48, no legend, y-axis starting at zero with integer ticks

#### Scenario: Semester/year chart appearance preserved
- **WHEN** the semester or year chart renders with data
- **THEN** it SHALL use background color `#93c5fd`, border color `#2563eb`, with the same bar and axis configuration as the grade chart
