## Why

The current home page only shows backend connectivity status for admins and professor module links for teachers. It lacks meaningful overview information that helps users understand the current state of the school - which semester is active, how many students are enrolled per grade, and who is assigned as professor to each grade. This dashboard will provide immediate visibility into key school metrics at a glance.

## What Changes

- Replace the minimal home page with a comprehensive dashboard
- Display current semester information prominently
- Show a table of all grades with assigned professors and student counts
- Include quick navigation links to main modules
- Remove the old backend connectivity status check (replaced by dashboard)
- Keep the professor-specific view unchanged (they still see their module links)

## Capabilities

### New Capabilities

- `home-dashboard`: Main dashboard showing semester, grades overview with professors and student counts

### Modified Capabilities

(None - this is a new feature without changes to existing requirements)

## Impact

- **New File**: `src/lib/pocketbase/dashboard.ts` - Data aggregation for dashboard
- **Modified File**: `src/routes/index.tsx` - New dashboard UI component
- **Dependencies**: Uses existing `semesters.ts`, `grades.ts` functions
- **No breaking changes** to existing functionality