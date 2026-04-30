## Context

The student reports page (`src/routes/reports/students.tsx`) has an analytics section with bar charts for student distribution by grade and semester. The data comes from `listBulletinStudentsAnalyticsRecords()` which returns `BulletinStudentAnalyticsRecord[]` — currently containing `student_id`, `grade_id`, `semester_id`. The `enrich-student-analytics-query` change adds `note`, `bulletin_id`, and `category_name` to this record.

The page already has table-level filters (`appliedFilters`: year, grade, semester, specific students) that drive the paginated table query. The analytics resource (`bulletinsStudentsAnalytics`) loads the full dataset independently — it is not filtered server-side.

## Goals / Non-Goals

**Goals:**
- Display two KPI cards (unique students, average note) above the charts
- KPIs compute from analytics data filtered client-side using the table's `appliedFilters`
- Handle loading, empty, and error states consistently with existing chart patterns

**Non-Goals:**
- Reusable KPI card component (inline implementation for now)
- Server-side filtering of the analytics query
- Additional KPI metrics beyond the two decided
- KPI cards for the employees report page

## Decisions

### Filter analytics rows for KPIs using the same logic as the table

**Choice:** Create a new `analyticsRowsForKpis` memo that filters `analyticsRows()` by `appliedFilters` — matching by `grade_id`, `semester_id`, and `student_id`. Year filtering reuses the existing `resolvedAppliedSemesterIds` memo (which resolves a year selection into its semester IDs).

**Alternative considered:** Compute KPIs from the unfiltered `analyticsRows()`. Rejected because we decided KPIs should be filter-aware so they reflect what the user is currently looking at in the table.

### Compute KPIs as derived memos

**Choice:** Two `createMemo` signals — `kpiUniqueStudents` (count of distinct `student_id`) and `kpiAverageNote` (arithmetic mean of `note` values, one decimal). Both derive from `analyticsRowsForKpis`.

**Alternative considered:** A single memo returning an object with both values. Either works; two separate memos are simpler and avoid recomputing one when only the other's dependencies change. In practice they share the same source so this is negligible — using a single memo with an object is also acceptable.

### Inline card markup in the analytics section

**Choice:** Render the KPI cards as a simple flex row of styled divs directly in the JSX, between the section header and the charts grid. No separate component file.

**Alternative considered:** Extracting a `KpiCard` component. Deferred — with only two cards and no reuse elsewhere, inline is simpler and avoids premature abstraction.

## Risks / Trade-offs

**Depends on enrichment change** → The average note KPI requires the `note` field on `BulletinStudentAnalyticsRecord`. If this change is implemented before `enrich-student-analytics-query`, the `note` field won't exist. Mitigation: tasks should be ordered so enrichment lands first, or the average note card gracefully shows `0.0` when `note` is missing/undefined.

**Client-side filtering of full dataset** → The analytics query fetches all non-deleted records with `getFullList`. Filtering happens in-browser. For the current expected data sizes (~500 records) this is fine. If the dataset grows significantly, this would need server-side filtering — but that's out of scope.
