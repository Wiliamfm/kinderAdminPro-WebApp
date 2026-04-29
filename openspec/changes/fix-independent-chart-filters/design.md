## Context

The students report page (`src/routes/reports/students.tsx`) has two charts:
1. **Grade chart** — "Estudiantes por grado" — has its own independent year/semester filter signals (`gradeChartYearId`, `gradeChartSemesterId`).
2. **Semester/Year chart** — "Estudiantes por trimestre/año" — currently depends on the main table's `appliedFilters()` for its data source.

The grade chart correctly uses a self-contained filter chain:
`gradeChartYearId` → `gradeChartFilteredSemesters` → `chartSemesterIdsOrdered` → `analyticsRowsForGradeChart`

The semester/year chart has two coupling points to the table:
- `analyticsRowsForCharts` reads `appliedChartSemesterIdsOrdered`, which derives from `resolvedAppliedSemesterIds()` → `appliedFilters()`.
- `yearChartPoints` directly reads `appliedFilters().yearId` to decide which years to display.

## Goals / Non-Goals

**Goals:**
- Decouple the semester/year chart from the main table's `appliedFilters()`.
- Give the semester/year chart its own year filter signal, following the same pattern as the grade chart.
- Ensure switching grouping mode (semester ↔ year) shows consistent, independently-filtered data.

**Non-Goals:**
- Refactoring the grade chart (it already works correctly).
- Extracting charts into reusable components (a separate concern).
- Changing the table filtering behavior.

## Decisions

**1. Add `semesterChartYearId` signal**
Mirror the grade chart pattern: a new `createSignal('')` that the semester/year chart's year dropdown controls. This keeps the approach consistent — both charts use the same state pattern.

**2. Create `semesterChartFilteredSemesters` and `semesterChartSemesterIdsOrdered` memos**
Derive the semester/year chart's visible semesters from `semesterChartYearId` instead of `appliedFilters()`. This mirrors `gradeChartFilteredSemesters` / `chartSemesterIdsOrdered`.

**3. Replace `analyticsRowsForCharts` data source**
Instead of filtering by `appliedChartSemesterIdsOrdered`, filter by the new `semesterChartSemesterIdsOrdered`. This breaks the coupling to table filters.

**4. Update `yearChartPoints` to use `semesterChartYearId`**
Replace `appliedFilters().yearId` with `semesterChartYearId()` for determining visible years.

**5. Add year dropdown to the semester/year chart UI**
Add a year `<select>` element matching the grade chart's existing year dropdown pattern.

## Risks / Trade-offs

- **Slightly more state**: Two additional signals and memos. Acceptable — mirrors an existing, proven pattern.
- **UX change**: The semester/year chart will no longer react to table filter changes. This is the desired behavior per user feedback.
