## 1. Add Chart-Specific State

- [x] 1.1 Add `semesterChartYearId` / `setSemesterChartYearId` signal (mirrors `gradeChartYearId`)
- [x] 1.2 Add `semesterChartFilteredSemesters` memo that filters semesters by `semesterChartYearId` (mirrors `gradeChartFilteredSemesters`)
- [x] 1.3 Add `semesterChartSemesterIdsOrdered` memo deriving semester IDs from `semesterChartFilteredSemesters` (mirrors `chartSemesterIdsOrdered`)

## 2. Decouple Chart Data Source

- [x] 2.1 Update `analyticsRowsForCharts` to filter by `semesterChartSemesterIdsOrdered` instead of `appliedChartSemesterIdsOrdered`
- [x] 2.2 Update `semesterChartPoints` to use `semesterChartSemesterIdsOrdered` instead of `appliedChartSemesterIdsOrdered` for `visibleSemesterIds`
- [x] 2.3 Update `yearChartPoints` to use `semesterChartYearId()` instead of `appliedFilters().yearId`

## 3. Add Reset Effect

- [x] 3.1 Add `createEffect` to reset `semesterChartGradeId` when the filtered semesters change (mirrors grade chart's existing reset effect)

## 4. Add Year Dropdown UI

- [x] 4.1 Add a year `<select>` dropdown to the semester/year chart section, bound to `semesterChartYearId` / `setSemesterChartYearId`

## 5. Cleanup

- [x] 5.1 Remove `appliedChartSemesterIdsOrdered` memo if no longer used elsewhere
