## 1. Filter analytics rows for KPIs

- [ ] 1.1 Add `analyticsRowsForKpis` memo in `src/routes/reports/students.tsx` that filters `analyticsRows()` by `appliedFilters` (grade_id, semester_id, student_id, and year via `resolvedAppliedSemesterIds`)

## 2. Compute KPI values

- [ ] 2.1 Add `kpiUniqueStudents` memo that counts distinct `student_id` values from `analyticsRowsForKpis`
- [ ] 2.2 Add `kpiAverageNote` memo that computes the arithmetic mean of `note` values from `analyticsRowsForKpis`, formatted as a string with one decimal place (fallback `"0.0"`)

## 3. Render KPI cards

- [ ] 3.1 Add a KPI cards row (flex container) in the analytics section between the section header and the charts grid, inside the existing loading/error Show guards
- [ ] 3.2 Render "Estudiantes únicos" card displaying `kpiUniqueStudents()` value
- [ ] 3.3 Render "Promedio nota" card displaying `kpiAverageNote()` value

## 4. Verify

- [ ] 4.1 Run existing tests in `src/pages/reports-students.test.tsx` and confirm they pass without changes
- [ ] 4.2 Verify KPI cards update when table filters are applied and cleared
