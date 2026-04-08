## 1. Data Layer

- [x] 1.1 Create `src/lib/pocketbase/dashboard.ts` with server function `getDashboardData()`
- [x] 1.2 Import and use `getCurrentSemester()` from `semesters.ts`
- [x] 1.3 Import and use `listGrades()` from `grades.ts` with professor expansion
- [x] 1.4 Import and use `countActiveStudentsByGradeId()` for each grade
- [x] 1.5 Return aggregated `DashboardData` type with semester, grades array, and totalStudents

## 2. UI Component

- [x] 2.1 Update `src/routes/index.tsx` to use `createResource` for dashboard data
- [x] 2.2 Add loading state while dashboard data fetches
- [x] 2.3 Implement semester banner display (or "Sin semestre activo" fallback)
- [x] 2.4 Implement grades table with columns: Grado, Profesor(a), Estudiantes
- [x] 2.5 Handle null professor with "(Sin asignar)" display
- [x] 2.6 Add total students row at bottom of table
- [x] 2.7 Add empty state message when no grades exist
- [x] 2.8 Keep existing professor view unchanged (use `isProfessor()` check)

## 3. Styling & Navigation

- [x] 3.1 Apply yellow color scheme (bg-yellow-50, border-yellow-300, etc.)
- [x] 3.2 Add quick navigation links to main modules (Staff, Enrollment, Events, Reports)
- [x] 3.3 Ensure responsive layout works on mobile and desktop
- [x] 3.4 Test that backend connectivity status is removed (replaced by dashboard)

## 4. Testing

- [x] 4.1 Test with no semester set - verify "Sin semestre activo" shows
- [x] 4.2 Test with semester set - verify semester name and dates display
- [x] 4.3 Test with grades and professors - verify table displays correctly
- [x] 4.4 Test professor user - verify they still see professor module links
- [x] 4.5 Test admin user - verify full dashboard displays