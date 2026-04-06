## Why

The professor role exists in the authorization model but has no module access — professors can log in but see nothing. This change gives professors a self-service portal scoped to their own data and a read-only view of the students in their assigned grades.

## What Changes

- Add an `employee_id` field to the `grades` collection so each grade can have exactly one assigned professor (employee).
- Add a professor assignment UI to the admin's grade management page (enrollment → grades).
- Auto-assign the `professor` role when an employee user is created from the staff management workflow.
- Lock the roles field to read-only for employee-linked users in the app-user management UI.
- Add three professor-specific module sections visible only to professor-role users: Gestión personal, Gestión de Estudiantes, and Eventos.
- Gestión personal provides two submodules: Registrar salida (register own leaves) and Consultar pagos (view own invoices, read-only).
- Gestión de Estudiantes shows a read-only list of students belonging to the grades assigned to the logged-in professor.
- Eventos provides a read-only calendar view of school events.
- Extend `canAccessModule()` so professor-specific module keys grant access to professor-role users.
- Update home page and section navigation to show role-appropriate modules.

## Capabilities

### New Capabilities

- `professor-portal`: Professor home navigation, section index entries, and role-based module routing for professor users.
- `professor-personal-management`: Gestión personal hub with Registrar salida (own leaves) and Consultar pagos (own invoices, read-only).
- `professor-student-view`: Read-only Gestión de Estudiantes page scoped to grades assigned to the logged-in professor.
- `professor-event-calendar`: Read-only Eventos calendar for professor users.
- `grade-professor-assignment`: Admin UI for assigning a professor (employee) to a grade from the enrollment grades page, backed by `grades.employee_id`.

### Modified Capabilities

- `employee-leaves-reporting`: Employee creation now auto-assigns the `professor` role; roles field is locked for employee-linked users in app-user management.

## Impact

- `grades` PocketBase collection schema — new `employee_id` relation field.
- Sync script for schema (`scripts/sync-event-task-calendar-schema.sh` or equivalent) — must include the new field.
- `src/lib/pocketbase/employees.ts` — new `getEmployeeByUserId` function.
- `src/lib/pocketbase/grades.ts` — extended `GradeRecord` type and new `listGradesByEmployeeId` function.
- `src/lib/pocketbase/students.ts` — new `listActiveStudentsByGradeIds` function.
- `src/lib/pocketbase/users.ts` — `createEmployeeUser` sets `roles: ['professor']`.
- `src/lib/pocketbase/auth.ts` — `canAccessModule` extended for professor module keys.
- `src/lib/section-index.ts` — professor section entries added.
- `src/pages/enrollment-grades.tsx` — professor assignment column and modal.
- `src/pages/app-users.tsx` — roles locked for employee-linked users.
- `src/pages/home.tsx` — role-based module display.
- `src/components/Navbar.tsx` — role-aware routing.
- New pages: `professor-management.tsx`, `professor-leaves.tsx`, `professor-invoices.tsx`, `professor-students.tsx`, `professor-calendar.tsx`.
