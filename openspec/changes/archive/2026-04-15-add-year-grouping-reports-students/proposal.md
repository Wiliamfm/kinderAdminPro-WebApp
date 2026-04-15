## Why

The `/reports/students` page currently allows filtering by grade, semester, and specific students. However, users need to visualize data grouped by academic year (derived from semester dates) instead of individual semesters. Additionally, the "Estudiantes por trimestre" chart should support grouping by year to provide a higher-level view of enrollment trends.

## What Changes

- Add a new "Año" (Year) filter dropdown in the reports students page filters section
- Year options are derived from semester `start_date` and `end_date` fields
- When a year is selected, the semester filter shows only semesters belonging to that year
- If a semester spans multiple years, it appears under each year it overlaps
- Add a toggle to the "Estudiantes por trimestre" chart: "Trimestre" vs "Año" grouping
- When "Año" is selected, chart aggregates data by academic year instead of individual semesters
- Table behavior remains unchanged - only the filter and chart grouping are affected

## Capabilities

### New Capabilities

- `reports-students-year-filter`: Filter bulletins students reports by academic year derived from semester dates
- `reports-students-year-grouping`: Group enrollment analytics chart by academic year

### Modified Capabilities

<!-- No existing spec-level requirements change -->

## Impact

- **Frontend changes only** - no backend schema changes
- Affects `src/routes/reports/students.tsx`
- Affects `src/lib/pocketbase/bulletins-students.ts` - `listBulletinStudentFormOptions()` needs to include year data
- Chart.js toggle logic for the semester chart component
