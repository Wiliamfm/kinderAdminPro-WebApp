## 1. Add chart year state

- [x] 1.1 Create `gradeChartYearId` signal in `src/routes/reports/students.tsx`
- [x] 1.2 Initialize with empty string (all years by default)

## 2. Create semester filtering logic

- [x] 2.1 Create `gradeChartFilteredSemesters` memo that filters semesters based on `gradeChartYearId`
- [x] 2.2 Follow pattern similar to `filteredSemesters` but using chart's year instead of table filter
- [x] 2.3 Handle empty year selection (show all semesters)

## 3. Update chart data computation

- [x] 3.1 Modify `chartSemesterIdsOrdered` to use `gradeChartYearId` when set, otherwise fall back to existing logic
- [x] 3.2 Add effect to validate selected semester still exists in filtered list

## 4. Add UI year selector

- [x] 4.1 Add year dropdown above existing semester selector in "Estudiantes por grado" chart section
- [x] 4.2 Use label "Año (gráfico)" to distinguish from table filter
- [x] 4.3 Populate with same year options as table filter

## 5. Validation and testing

- [x] 5.1 Test that chart year selection filters semester dropdown options
- [x] 5.2 Test that chart and table year selections are independent
- [x] 5.3 Verify chart renders correctly with different year selections
