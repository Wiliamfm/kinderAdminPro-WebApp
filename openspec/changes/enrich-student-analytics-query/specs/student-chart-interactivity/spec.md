## ADDED Requirements

> **Note:** This spec outlined the general objective for future proposal #5 (Chart Interactivity & UX). Some items have been explored and promoted to their own changes. The remaining items are still pending exploration.

### Explored — now separate changes

- **Chart animated transitions**: Fully designed and specified as its own change: `chart-animated-transitions`. See `openspec/changes/chart-animated-transitions/` for the authoritative spec, design, and tasks. Covers `chart.update()` lifecycle, smooth bar animations, semester/year shared canvas, and empty-data handling.

### Still to explore

#### Requirement: Click-to-filter from chart bars
Clicking a bar in either chart SHALL apply the corresponding filter to the data table and scroll the table into view.

##### Scenario: Click a grade bar
- **WHEN** the user clicks a bar in the "Estudiantes por grado" chart representing grade "Grado 3"
- **THEN** the table filter for grade SHALL be set to "Grado 3", filters SHALL be applied, and the page SHALL scroll to the table

##### Scenario: Click a semester bar
- **WHEN** the user clicks a bar in the "Estudiantes por trimestre" chart representing a specific semester
- **THEN** the table filter for semester SHALL be set to that semester, filters SHALL be applied, and the page SHALL scroll to the table

#### Requirement: Enhanced chart tooltips
Chart tooltips SHALL display enriched information beyond the bar value.

##### Scenario: Tooltip on grade chart bar
- **WHEN** the user hovers over a bar in the grade chart
- **THEN** the tooltip SHALL show: grade name, unique student count, average note for that grade, and total report count for that grade

##### Scenario: Tooltip on semester chart bar
- **WHEN** the user hovers over a bar in the semester chart
- **THEN** the tooltip SHALL show: semester name, unique student count, average note for that semester, and total report count for that semester