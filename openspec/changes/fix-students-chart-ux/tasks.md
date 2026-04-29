## 1. Fix year chart data consistency

- [x] 1.1 Remove `.filter((point) => point.value > 0)` from `yearChartPoints` memo so years with zero students are included

## 2. Reset filters on grouping toggle

- [x] 2.1 Update the "Trimestre" button `onClick` to also reset `semesterChartYearId` and `semesterChartGradeId` to `''`
- [x] 2.2 Update the "Año" button `onClick` to also reset `semesterChartYearId` and `semesterChartGradeId` to `''`

## 3. Per-chart empty state

- [x] 3.1 Replace `hasVisibleChartData` with two memos: `hasGradeChartData` (based on `gradeChartPoints().length > 0`) and `hasSemesterChartData` (based on active grouping's points)
- [x] 3.2 Remove the outer `<Show when={hasVisibleChartData()}>` that wraps both chart panels
- [x] 3.3 Add per-chart conditional rendering: when a chart's data is empty, show a "Sin datos para mostrar." message inside that chart's panel and hide the canvas (e.g., `style="display: none"` on the canvas container)
- [x] 3.4 Keep the loading and error `<Show>` wrappers unchanged (they apply to the whole analytics section)
