## Why

The semester/year chart in the students report (`students.tsx`) is coupled to the main table's `appliedFilters()`, causing its data to change when table filters are applied. Each chart should have fully independent filter controls, as the grade chart already does.

## What Changes

- Introduce a dedicated year filter signal for the semester/year chart (`semesterChartYearId`), mirroring how the grade chart uses `gradeChartYearId`.
- Replace `analyticsRowsForCharts` dependency on `appliedChartSemesterIdsOrdered` (derived from table filters) with a chart-specific filtered data source.
- Remove `yearChartPoints` direct read of `appliedFilters().yearId` — use the chart's own year signal instead.

## Capabilities

### New Capabilities

- `independent-chart-filters`: Ensure each chart in the students report has its own independent filter state, decoupled from the main table filters.

### Modified Capabilities

## Impact

- `src/routes/reports/students.tsx` — state management signals, memos for chart data filtering, and chart filter UI controls.
