## Why

The "Estudiantes por grado" graph in the reports/students route currently derives its semester options from the table's year filter. When a user selects a year in the table filters, the chart automatically filters to only show semesters from that year. This couples the chart's data selection to the table's filter state, limiting the user's ability to explore the chart independently.

## What Changes

- Add independent year selector to "Estudiantes por grado" chart
- Chart's semester dropdown filters based on its own year selection (not the table's filter)
- Table filters remain unchanged and continue controlling the data table

## Capabilities

### New Capabilities
- `independent-chart-year-filter`: Independent year control for the "Estudiantes por grado" chart, allowing users to select a different year than the table filter

### Modified Capabilities
- None

## Impact

- UI: Add year dropdown to the "Estudiantes por grado" chart section
- State: New signal `gradeChartYearId` for chart-specific year filtering
- Logic: Update semester filtering logic to use chart's year instead of table's applied filters