## Why

The "Estudiantes por trimestre" chart in the students report has multiple UX bugs when toggling between "Trimestre" and "Año" grouping. Switching modes sometimes shows data and sometimes doesn't for the same filters, blank canvases appear with no "no data" feedback, and stale filters carry over between modes causing confusing behavior.

## What Changes

- Show a per-chart "Sin datos" message when a chart has no data points, instead of leaving a blank canvas.
- Reset the semester/year chart's filters (`semesterChartYearId`, `semesterChartGradeId`) when the user toggles between "Trimestre" and "Año" grouping.
- Make `yearChartPoints` consistent with `semesterChartPoints` by removing the `.filter(point => point.value > 0)` that silently hides years with zero students.
- Split `hasVisibleChartData` into per-chart visibility checks so each chart independently shows its own "no data" state instead of the combined Show/hide logic.

## Capabilities

### New Capabilities

- `students-chart-empty-state`: Per-chart empty state handling and filter reset on grouping toggle.

### Modified Capabilities

## Impact

- `src/routes/reports/students.tsx` — chart rendering effects, `hasVisibleChartData` memo, `yearChartPoints` memo, grouping toggle onClick handlers, and chart JSX panels.
