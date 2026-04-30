## Why

The student reports analytics section shows charts but no summary metrics. Administrators need at-a-glance KPIs — unique student count and average note — to quickly assess coverage and performance without interpreting chart bars. The enriched analytics data (from the `enrich-student-analytics-query` change) makes the average note metric possible.

## What Changes

- Add two KPI summary cards above the existing charts in the "Distribución de estudiantes" section: **Unique Students** and **Average Note**.
- KPI cards are filter-aware: they compute from the `analyticsRows()` dataset filtered through the table's `appliedFilters` (year, grade, semester, specific students).
- Cards show loading placeholders while analytics data loads and display zero-state values (`0`, `0.0`) when the dataset is empty.

## Capabilities

### New Capabilities
- `student-kpi-summary`: Two inline KPI cards (unique students, average note) displayed above the student analytics charts, driven by the table's applied filters.

### Modified Capabilities

None.

## Impact

- **Code**: `src/routes/reports/students.tsx` — new memos for KPI computation and JSX for the cards row.
- **Data dependency**: Requires the enriched `BulletinStudentAnalyticsRecord` with `note` field from the `enrich-student-analytics-query` change.
- **Network**: No additional requests — KPIs compute from the existing `bulletinsStudentsAnalytics` resource.
- **Downstream**: None. Self-contained UI addition.
