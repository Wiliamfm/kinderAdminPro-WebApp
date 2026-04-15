## 1. Data Layer - Add Year Support to Form Options

- [x] 1.1 Add `years: number[]` property to `SemesterOption` type in `src/lib/pocketbase/bulletins-students.ts`
- [x] 1.2 Add `YearOption` type definition with `id` and `label` fields
- [x] 1.3 Add `years: YearOption[]` to `BulletinStudentFormOptions` type
- [x] 1.4 Update `listBulletinStudentFormOptions()` to derive years from semester `start_date` and `end_date`
- [x] 1.5 Ensure years are sorted in descending order and deduplicated

## 2. UI Layer - Add Year Filter Dropdown

- [x] 2.1 Add `yearId: string` to `ReportFilters` type in `src/routes/reports/students.tsx`
- [x] 2.2 Update `createEmptyReportFilters()` to include `yearId: ''`
- [x] 2.3 Add `yearLookupInput` signal for optional year search (if many years)
- [x] 2.4 Add year dropdown HTML element before the semester dropdown in filters section
- [x] 2.5 Populate year dropdown with "Todos los años" option plus derived years
- [x] 2.6 Update `setFilterField()` to handle `yearId` field
- [x] 2.7 Ensure year filter appears in apply/clear filter flow

## 3. UI Layer - Filter Semester Dropdown by Year

- [x] 3.1 Create `filteredSemesters()` memo that filters semesters based on selected year
- [x] 3.2 If year is selected, include semester only if its `years` array contains the selected year
- [x] 3.3 If no year selected, show all semesters
- [x] 3.4 Update semester dropdown in filters section to use `filteredSemesters()` instead of `formOptions().semesters`
- [x] 3.5 Handle edge case: selected semester becomes invalid when year changes (auto-clear or show warning)

## 4. Data Layer - Update Table Query for Year Filter

- [x] 4.1 Update `BulletinStudentListOptions` to include optional `semesterIds?: string[]` for batch filtering
- [x] 4.2 Update `buildFilterExpression()` to support filtering by multiple semester IDs
- [x] 4.3 When year is selected in `appliedFilters()`, resolve year to matching semester IDs
- [x] 4.4 Pass resolved `semesterIds` to `listBulletinsStudentsPage()` query

## 5. UI Layer - Add Chart Grouping Toggle

- [x] 5.1 Add `semesterChartGrouping` signal with type `SemesterChartGrouping = 'semester' | 'year'`
- [x] 5.2 Initialize with `'semester'` as default
- [x] 5.3 Add segmented toggle UI above the "Estudiantes por trimestre" chart section
- [x] 5.4 Style toggle to show active state (e.g., yellow background for selected)
- [x] 5.5 Connect toggle to `semesterChartGrouping` signal

## 6. Chart Layer - Implement Year Grouping Data Logic

- [x] 6.1 Create `yearChartPoints` memo similar to `semesterChartPoints`
- [x] 6.2 When grouping by year, aggregate distinct students by year instead of semester
- [x] 6.3 Use semester's `years` array to determine which years a semester contributes to
- [x] 6.4 Ensure deduplication: a student appearing in multiple semesters of same year counts once
- [x] 6.5 Extract year labels from the grouped data for chart x-axis

## 7. Chart Layer - Update Chart.js Rendering

- [x] 7.1 Create separate `createEffect` for year chart rendering
- [x] 7.2 Render year chart when `semesterChartGrouping` is `'year'`
- [x] 7.3 Apply same Chart.js configuration (bar chart, colors, border radius) as semester chart
- [x] 7.4 Update chart label to "Estudiantes (por año)" or similar
- [x] 7.5 Handle cleanup when switching between grouping modes

## 8. Testing

- [x] 8.1 Add unit tests for year derivation from semester dates
- [x] 8.2 Add unit tests for cross-year semester handling
- [x] 8.3 Add unit tests for semester filtering by year
- [x] 8.4 Add unit tests for year chart aggregation logic
- [x] 8.5 Run existing tests to ensure no regressions
- [ ] 8.6 Manual testing: verify filter combinations work correctly

## 9. Documentation

- [x] 9.1 Update `docs/implementations/feature_reports_students.md` with year filtering notes
- [x] 9.2 Run `bun run build` to verify no TypeScript errors
