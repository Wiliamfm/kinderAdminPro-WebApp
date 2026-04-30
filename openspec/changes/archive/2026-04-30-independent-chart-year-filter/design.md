## Context

The "Estudiantes por grado" chart in `/reports/students` displays a bar chart of unique students per grade. Currently, the semester dropdown in this chart section filters semesters based on the table's applied year filter (`appliedFilters().yearId`). This means:
- User selects year in table filters → applies → chart only shows semesters from that year
- User cannot explore the chart with a different year than the table

## Goals / Non-Goals

**Goals:**
- Add independent year selector to the "Estudiantes por grado" chart
- Chart's semester dropdown filters based on its own year selection
- Table filters continue working independently

**Non-Goals:**
- Modify data fetching (use existing analytics data)
- Change the second chart ("Estudiantes por trimestre")
- Add year selector to other charts

## Decisions

1. **Add new signal `gradeChartYearId`** instead of reusing existing signals
   - Keeps chart state independent from table state
   - Follows existing pattern: `gradeChartSemesterId` is already independent

2. **Reuse existing semester filtering logic** with new year source
   - Create new `gradeChartFilteredSemesters` memo that filters based on `gradeChartYearId`
   - Reuse similar pattern to `filteredSemesters` in table filters

3. **Add year dropdown above semester dropdown** in chart UI
   - Familiar pattern: similar to table filter layout
   - Position: above the existing semester selector

## Risks / Trade-offs

- **Risk**: Adding more UI elements increases cognitive load
  - **Mitigation**: Keep dropdowns minimal, add helpful placeholder text

- **Risk**: Two year selectors on same page could confuse users
  - **Mitigation**: Clear labels - table filter says "Año" (table context), chart filter says "Año (gráfico)"