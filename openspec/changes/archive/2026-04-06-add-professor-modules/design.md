## Context

The role-based authorization change introduced `admin`, `professor`, and `father` roles, but `canAccessModule()` currently only grants access for the `admin` role — professors can authenticate but see nothing. The system already has employees linked to users via `employees.userId`, and students linked to grades via `students.grade_id`. The missing piece is assigning a professor (employee) to a grade and exposing self-service pages for the professor role.

Business rule: every employee is a professor and must hold only the `professor` role. This is enforced at user creation time and locked in the user management UI.

## Goals / Non-Goals

**Goals:**
- Give professors a functional portal scoped entirely to their own data.
- Add `grades.employee_id` as the one-to-one professor assignment for a grade.
- Keep professor and admin authorization paths cleanly separated.
- Reuse existing PocketBase queries and page patterns where possible.

**Non-Goals:**
- Allowing professors to create, edit, or delete any record.
- Introducing row-level PocketBase rules for professor data isolation (backend filtering remains on the frontend query layer for now).
- Building a father/parent portal in this change.
- Supporting grades without an assigned professor (the field is optional/nullable).

## Decisions

### 1. New professor-specific module keys in `canAccessModule`

Rather than expanding the existing admin module list, introduce separate professor module keys (`professor-personal`, `professor-students`, `professor-events`) that `canAccessModule` maps to the `professor` role.

Rationale:
- Admin and professor namespaces are completely disjoint — professors never touch admin modules.
- A separate key set keeps the mapping explicit and readable.
- Avoids conditional branching inside existing admin pages.

Alternatives considered:
- Reusing admin module keys with a secondary role check would mix admin and professor concerns inside each page guard.

### 2. `grades.employee_id` as a nullable relation

The new field on `grades` is a nullable relation to `employees`. A grade with no professor is valid (not yet assigned). The admin UI shows unassigned grades with an empty state.

Rationale:
- Nullable avoids a forced migration of existing grade records.
- One-to-one is enforced at the application level (each assignment modal writes to the grade record); PocketBase does not enforce uniqueness on relations, so the invariant is maintained by the UI only.

Alternatives considered:
- A separate `grade_assignments` join collection would be more flexible, but one-to-one is the stated business rule and a relation field on grades is simpler.

### 3. Professor data traversal via client-side query chain

The professor's student view fetches data in three sequential steps: `getEmployeeByUserId` → `listGradesByEmployeeId` → `listActiveStudentsByGradeIds`. All filtering happens through PocketBase query parameters.

Rationale:
- Follows the existing pattern used in other pages (e.g., invoice and leave fetching in `staff-employees.tsx`).
- Keeps backend rules simple — no new PocketBase rule expressions needed for the professor view.

Alternatives considered:
- A single expanded PocketBase query with nested expand could reduce round trips but adds complexity and is harder to test.

### 4. Auto-assign `professor` role at employee user creation

`createEmployeeUser` in `users.ts` will set `roles: ['professor']` instead of `[]`. The roles field in `app-users.tsx` will be rendered as read-only when the user is linked to an employee record.

Rationale:
- Enforces the business rule at the point of creation rather than relying on a post-creation step.
- Locking the UI prevents accidental role changes without requiring backend enforcement.

The read-only lock requires a lookup: `listAppUsers` will be extended to indicate whether a user has an associated employee record (via a PocketBase expand or a separate `getEmployeeByUserId` call per user).

Alternatives considered:
- Backend enforcement via a PocketBase hook would be more robust but is out of scope for this change.

### 5. New pages under `/professor/*` route tree

All professor-facing pages live under a `/professor` prefix, separate from admin routes (`/staff-management`, `/enrollment-management`, `/event-management`, `/reports`).

Rationale:
- Clean separation makes role-based redirects straightforward.
- Avoids conditional rendering inside existing admin pages.

The home page (`home.tsx`) branches on role: admins see the existing section grid, professors see their three modules.

## Risks / Trade-offs

- **One-to-one not DB-enforced** → If two admins assign different professors to the same grade simultaneously, the last write wins. Mitigation: low-risk for the expected user volume; a future backend hook can enforce uniqueness.
- **Three-query chain for student view** → Three sequential fetches on page load. Mitigation: acceptable for expected grade/student counts; a loading state covers latency.
- **UI-only role lock** → An admin with direct API access could still assign non-professor roles to an employee-linked user. Mitigation: acceptable for now; backend hook is a future hardening step.
- **`listAppUsers` employee lookup cost** → Checking employee linkage for every user in the user management list could add latency. Mitigation: load employee-user links once per page open, not per row.

## Migration Plan

1. Add `employee_id` field to `grades` collection via sync script (nullable, no backfill needed).
2. Deploy frontend changes — new professor pages and admin UI additions are additive.
3. `createEmployeeUser` change is forward-only: existing employee users retain their current roles and must be manually updated if needed (or a one-time backfill script assigns `professor` to all employee-linked users with no role).
4. No rollback complexity — new pages are additive, schema field is nullable.
