## 1. Schema And Data Access

- [x] 1.1 Add `employee_id` nullable relation field to the `grades` collection in the sync script and run it against the database.
- [x] 1.2 Add `getEmployeeByUserId(userId: string)` to `src/lib/pocketbase/employees.ts`; returns `EmployeeRecord | null`.
- [x] 1.3 Extend `GradeRecord` type with `employeeId: string | null` and `employeeName: string`; update `mapGradeRecord` to expand the `employee_id` relation and add `listGradesByEmployeeId(employeeId: string)` to `src/lib/pocketbase/grades.ts`.
- [x] 1.4 Add `listActiveStudentsByGradeIds(gradeIds: string[])` to `src/lib/pocketbase/students.ts`; filters by `grade_id` in the provided list and `active = true`.

## 2. Authorization And Navigation

- [x] 2.1 Extend `canAccessModule()` in `src/lib/pocketbase/auth.ts` to return `true` for `professor-personal`, `professor-students`, and `professor-events` when the user has the `professor` role; add these keys to the `ProtectedModule` type.
- [x] 2.2 Add professor section entries to `src/lib/section-index.ts` (keys: `professor-personal`, `professor-students`, `professor-events`) with appropriate Spanish labels and `requiredModules`.
- [x] 2.3 Update `src/pages/home.tsx` to branch on role: show professor module cards for `professor` role, existing admin grid for `admin` role.
- [x] 2.4 Update `src/components/Navbar.tsx` to route professor users to their section index and ensure admin routes are not accessible to professors.

## 3. Employee Role Enforcement

- [x] 3.1 Update `createEmployeeUser` in `src/lib/pocketbase/users.ts` to set `roles: ['professor']` instead of `[]`.
- [x] 3.2 Add a helper or extend `listAppUsersPage` to flag which users have a linked employee record (via `getEmployeeByUserId` per user or a bulk employee list keyed by `userId`).
- [x] 3.3 Update `src/pages/app-users.tsx` to render the roles field as read-only for employee-linked users; no save action for roles when locked.

## 4. Grade Professor Assignment (Admin UI)

- [x] 4.1 Update existing grade list queries in `src/lib/pocketbase/grades.ts` (`listGrades`, `listGradesPage`) to expand the `employee_id` relation so `employeeName` is populated.
- [x] 4.2 Add `updateGradeProfessor(gradeId: string, employeeId: string | null)` to `src/lib/pocketbase/grades.ts`.
- [x] 4.3 Update `src/pages/enrollment-grades.tsx` to show a "Profesor asignado" column with the employee name or a dash.
- [x] 4.4 Add a professor assignment modal to `src/pages/enrollment-grades.tsx`: dropdown of active employees (from `listActiveEmployees`) plus a clear option; on save calls `updateGradeProfessor`.

## 5. Gestión Personal — Professor Self-Service Pages

- [x] 5.1 Create `src/pages/professor-management.tsx`: hub page at `/professor/personal` listing links to Registrar salida and Consultar pagos; protected by `professor-personal` module.
- [x] 5.2 Create `src/pages/professor-leaves.tsx`: resolves the logged-in professor's employee id via `getEmployeeByUserId`, then lists and creates leaves scoped to that employee; reuse existing leave form and validation logic; show error state if no employee found.
- [x] 5.3 Create `src/pages/professor-invoices.tsx`: resolves employee id, then lists invoices for that employee (read-only, no create/edit/delete actions); show error state if no employee found.

## 6. Gestión de Estudiantes — Professor Student View

- [x] 6.1 Create `src/pages/professor-students.tsx`: resolves employee id → grade ids → students list; shows grade filter when multiple grades are assigned; read-only (no action buttons); show error state if no employee found.

## 7. Eventos — Professor Calendar

- [x] 7.1 Update the existing event calendar component (or create a thin `src/pages/professor-calendar.tsx` wrapper) to accept a `readOnly` prop that hides create/edit/delete actions; professor calendar passes `readOnly={true}`.
- [x] 7.2 Register the professor calendar page under `/professor/events` and protect it with the `professor-events` module key.

## 8. Tests And Validation

- [x] 8.1 Add unit tests for `getEmployeeByUserId`, `listGradesByEmployeeId`, and `listActiveStudentsByGradeIds`.
- [x] 8.2 Add/update tests for `canAccessModule` covering the three new professor module keys.
- [x] 8.3 Add tests for `createEmployeeUser` confirming `professor` role is assigned.
- [x] 8.4 Add page-level tests for professor pages: professor-leaves, professor-invoices, professor-students — covering the no-employee error state and the happy path.
- [x] 8.5 Run `bun run test` and `bun run build` to confirm no regressions.
