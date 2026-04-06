## Why

The application currently treats authorization as a single `users.is_admin` boolean, but the product surface has already grown into separate staff, enrollment, reports, event, and user-management modules. That flat model makes it impossible to grant limited operational access without giving full administrative control, and it spreads the same binary check across frontend guards, navigation visibility, PocketBase rules, and custom routes.

## What Changes

- Add a role-based authorization model for app users using a multi-role field on the PocketBase `users` auth collection.
- Replace frontend `is_admin` checks with centralized role and capability helpers that drive route guards, section-link visibility, and page-level access control.
- Update user-management workflows so admins can assign and edit roles instead of a single admin flag.
- Migrate backend collection rules and custom-route authorization checks away from `@request.auth.is_admin = true` toward role-aware access expressions.
- Backfill existing admin users into a privileged role and define a safe transition path away from the legacy boolean field.
- Update tests and documentation to reflect the new authorization model and module access mapping.

## Capabilities

### New Capabilities
- `role-based-authorization`: Define app roles, capability mapping, centralized authorization helpers, role-managed user administration, and backend enforcement across protected modules.

### Modified Capabilities
- `event-task-calendar`: Replace the calendar's admin-only access requirement with role-based event-management access.

## Impact

- `users` auth collection schema, data migration/backfill, and PocketBase access rules.
- Frontend auth helpers in `src/lib/pocketbase/auth.ts` and app-user mapping in `src/lib/pocketbase/users.ts`.
- Protected pages and section navigation in `src/pages/` and `src/lib/section-index.ts`.
- User administration UI in `src/pages/app-users.tsx`.
- PocketBase custom-route authorization in `pb_hooks/main.pb.js`.
- Tests that currently mock or assert `isAuthUserAdmin`.
- Documentation describing auth, route access, and schema/rules behavior.
