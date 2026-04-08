## Context

The current home page (`src/routes/index.tsx`) displays minimal information:
- For admins: just backend connectivity status
- For professors: module links

The application already has data access functions for semesters (`getCurrentSemester()`), grades (`listGrades()` with professor expansion), and student counts (`countActiveStudentsByGradeId()`). These are used in various parts of the application but not on the home page.

## Goals / Non-Goals

**Goals:**
- Display current semester name and date range prominently
- Show all grades with assigned professor name and active student count
- Provide quick navigation to main modules (staff, enrollment, events, reports)
- Maintain yellow color scheme consistent with the rest of the app
- Keep professor view unchanged (they should still see their module links, not the dashboard)

**Non-Goals:**
- Real-time updates (page refresh is sufficient)
- Interactive filtering/sorting of grade data
- Drill-down to individual student details from the dashboard
- Authentication changes
- New API endpoints (uses existing server functions)

## Decisions

1. **Server-side data aggregation over client-side** - Create `getDashboardData()` in `src/lib/pocketbase/dashboard.ts` that fetches semester, all grades, and student counts in one server call. This reduces multiple round trips between client and server.

2. **Table layout over card grid for grades** - A table is more compact and readable when showing multiple grades with consistent columns (Grade, Profesor, Estudiantes). Cards would be too verbose for 6-8 grades.

3. **SolidJS createResource for data fetching** - The existing pattern in the app uses `createResource` for async server data. Following this pattern maintains consistency and provides built-in loading states.

4. **Graceful empty states** - If no semester is set, show "Sin semestre activo". If no grades exist, show a message. No hard failures.

## Risks / Trade-offs

- **[Risk] Performance with many grades** → [Mitigation] Student counts are fetched per grade. For 10+ grades, consider parallel fetch or caching. Currently acceptable for typical school (6-8 grades).

- **[Risk] Professor view complexity** → [Mitigation] The current `isProfessor()` check already distinguishes views. Dashboard shows only for non-professors (admin roles). Professors keep their existing module links.

- **[Risk] Missing data fields** → [Mitigation] Handle null/undefined gracefully: display "Sin asignar" when professor is null, "0" when no students.