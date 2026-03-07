## Why

The employee reports page currently summarizes employee report records, but it does not show leave activity, which limits visibility into staffing trends by semester. This change is needed now to let admins compare current active-employee leave usage by default while still being able to review historical leave records across past semesters.

## What Changes

- Extend the employee reports experience with a new chart that shows leaves per employee.
- Add semester-aware filtering for the new leave chart so admins can review leave activity for the current semester or any historical semester.
- Make the default leave analytics view show leaves for active employees in the current semester when a current semester exists.
- Include historical leave records in the semester filter results instead of restricting analytics to only currently active employees.
- Align report data loading and empty-state behavior so the new chart works with the existing employee reports page and admin-only reporting flow.

## Capabilities

### New Capabilities
- `employee-leaves-reporting`: Adds semester-filtered leave analytics to the employee reports page, including a default current-semester view for active employees and historical leave views across semesters.

### Modified Capabilities
- None.

## Impact

- Affected UI: `src/pages/reports-employees.tsx` charts, filters, and empty states.
- Affected data access: PocketBase wrappers for employee reporting/leaves and semester-aware analytics loading in `src/lib/pocketbase/`.
- Affected systems: employee leaves data, employee active-state filtering, semester selection/current-semester defaults, and related report page tests.
