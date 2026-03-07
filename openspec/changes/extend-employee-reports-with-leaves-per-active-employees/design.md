## Context

`src/pages/reports-employees.tsx` already renders the admin-only employee reports page with Chart.js-based analytics, option loading, and semester/job filters for `employee_reports` data. The new requirement extends that page with leave analytics, but the `leaves` collection does not store a `semester_id`; it only stores `employee_id`, `start_datetime`, and `end_datetime`.

Employee active state already exists in the `employees` collection as `active`, and semester boundaries already exist in `semesters` with `start_date`, `end_date`, and `is_current`. That means the new chart can be built without schema changes, but semester filtering must be derived from leave date ranges instead of a direct relation.

Stakeholders are admin users who need a default view of current staffing impact and the ability to inspect historical leave activity by semester from the same reporting surface.

## Goals / Non-Goals

**Goals:**
- Add a third analytics chart to the employee reports page that shows leave counts per employee.
- Default that chart to the current semester and restrict the initial view to active employees.
- Allow semester selection to inspect historical leave activity, including leave records for employees who are no longer active.
- Reuse the existing report page architecture, option loading, and Chart.js patterns with minimal disruption.
- Keep the implementation inside the current frontend and PocketBase wrapper boundaries without introducing schema migrations.

**Non-Goals:**
- Redesign the existing employee report table, export flow, or the two current analytics charts.
- Add new PocketBase collections, fields, or server-side aggregation endpoints.
- Introduce a new UI control for toggling active vs. inactive employees beyond the required default behavior.
- Change leave creation/editing behavior in `src/pages/staff-employees.tsx`.
- Report leave duration in days or hours; this change is limited to leave-record counts per employee.

## Decisions

### 1. Keep leave analytics inside the existing employee reports page

The new chart will be added to `src/pages/reports-employees.tsx` alongside the current job and semester charts. This keeps all employee reporting in one route, reuses the page’s admin guard, loading model, empty-state conventions, and existing chart lifecycle handling.

Alternative considered:
- Create a separate leave reports page. Rejected because the requirement is an extension of the existing employee reports workflow and would duplicate filter/loading patterns.

### 2. Add a dedicated leave analytics loader that returns raw leave rows plus employee metadata

The frontend will use a new PocketBase wrapper for leave analytics rather than overloading `employee-reports.ts`. The wrapper will read leave records with expanded employee data and return the minimum fields needed for charting: leave id, employee id, employee name/document label, employee active flag, `start_datetime`, and `end_datetime`.

This keeps the concern aligned with the source collection (`leaves`) and avoids coupling leave analytics to the `employee_reports` record model.

Alternative considered:
- Extend `listEmployeeReportsAnalyticsRecords()` to also fetch leaves. Rejected because leave analytics do not come from the `employee_reports` collection and would blur module responsibilities.

### 3. Semester membership for a leave is derived by date-range overlap

Because leaves do not have `semester_id`, a leave will be considered part of a semester when its interval overlaps the semester interval:

- `leave.start_datetime <= semester.end_date`
- `leave.end_datetime >= semester.start_date`

If a leave spans multiple semesters, it will appear in each overlapping semester. This preserves historical accuracy for long-running leaves and matches the requirement to include historical leave activity by semester.

Alternative considered:
- Assign a leave to only the semester containing `start_datetime`. Rejected because cross-semester leaves would disappear from later semesters even though they affect staffing there.

### 4. The chart metric is count of leave records per employee

The new chart will aggregate the number of leave records per employee for the selected semester, not total days absent. This matches the stated requirement of "leaves per employee", keeps the implementation aligned with current record-level data, and avoids introducing date-duration business rules.

Alternative considered:
- Aggregate duration in days/hours. Rejected because it changes the meaning of the chart and requires additional rules for partial-day and timezone handling.

### 5. Default state is current semester + active employees only, with historical inclusion on manual semester filtering

On initial load, the leave chart will auto-select the current semester using semester metadata and will count only employees whose current `active` flag is `true`. After the user changes the semester selector, the chart will use the selected semester and include leave records for any employee, active or inactive, so historical semesters reflect the employee population that had leave activity in that period.

If no semester is marked `is_current = true`, the page should fall back to the most recently ending semester to avoid an empty default chart when semester history exists.

Alternative considered:
- Keep active-only filtering for every semester. Rejected because it would hide historical leave records for employees who are no longer active.
- Add an explicit active/inactive toggle. Rejected as unnecessary scope for the current request.

### 6. Reuse current semester data by extending the report page context, not by adding a new dependency

The implementation should reuse existing semester data sources. The simplest path is to extend the report page’s data-loading context so semester options include enough metadata to identify the current semester and ordering, or to fetch current semester details from `src/lib/pocketbase/semesters.ts` during page setup.

This avoids new dependencies and keeps the default-state logic grounded in the same semester records used by the selector.

Alternative considered:
- Hard-code the "current" semester from list order or name. Rejected because sort order by name is not a reliable temporal source of truth.

## Risks / Trade-offs

- [Semester-overlap logic may be misunderstood for cross-semester leaves] -> Document the overlap rule in tests and keep the chart label/filter copy explicit about semester-based leave inclusion.
- [Client-side aggregation could become slower as leave history grows] -> Fetch only fields required for analytics, keep aggregation to a single pass over the raw rows, and revisit server-side aggregation only if usage volume proves it necessary.
- [Defaulting to active employees only on first load may feel inconsistent after filter changes] -> Keep the behavior intentional and predictable: initial view is operational/current, manual semester selection is historical/complete.
- [Current semester may be missing or misconfigured] -> Fallback to the most recently ending semester when available; otherwise show the existing empty-state pattern with guidance.

## Migration Plan

No PocketBase schema migration is required.

Implementation and rollout steps:
1. Add a leave analytics wrapper that returns raw leave rows with expanded employee metadata.
2. Extend report page semester context so the leave chart can default to the current or fallback semester.
3. Add the new leave chart and semester selector to `src/pages/reports-employees.tsx`.
4. Add/update tests for default filtering, historical semester behavior, overlap semantics, and empty states.
5. Validate with `bun run test` and `bun run build`.

Rollback strategy:
- Revert the frontend/page and wrapper changes; no persisted data transformation is involved.

## Open Questions

- None at this stage. The implementation can proceed with the overlap-based semester rule, record-count metric, and current-semester default described above.
