## 1. Schema And Authorization Contract

- [x] 1.1 Add the `roles` field to the PocketBase `users` auth collection with the supported role values and a migration-safe rollout plan.
- [x] 1.2 Backfill existing `is_admin = true` users to `super_admin` and preserve unprivileged defaults for newly created employee-backed users.
- [x] 1.3 Update protected PocketBase collection rules and the event email custom route to authorize by module role or `super_admin` instead of only `is_admin`.

## 2. Frontend Authorization Helpers And Navigation

- [x] 2.1 Replace the legacy admin helper surface in `src/lib/pocketbase/auth.ts` with role and capability helpers that read from the authenticated user record.
- [x] 2.2 Update section-index metadata and protected page guards to use role-capability checks for staff, enrollment, reports, event management, and app-user administration.
- [x] 2.3 Update event-management calendar access behavior to match the new role-authorized capability contract.

## 3. User Management And Protected Workflows

- [x] 3.1 Update `src/lib/pocketbase/users.ts` to map, sort, and persist user roles instead of the single `is_admin` flag.
- [x] 3.2 Update `src/pages/app-users.tsx` to display and edit assignable roles in the user-management workflow.
- [x] 3.3 Replace direct `isAuthUserAdmin()` checks across protected pages with the new shared authorization helpers while preserving current redirects and hidden actions by module.

## 4. Validation And Documentation

- [x] 4.1 Update unit and page tests that mock or assert admin-only behavior to cover role-based authorization outcomes.
- [x] 4.2 Update `docs/overview.md`, `docs/architecture.md`, and any related implementation notes to describe the new role model, access mapping, and migration assumptions.
- [x] 4.3 Run `bun run test` and `bun run build` after the authorization refactor is complete.

## 5. Simplified Role Model (admin / professor / father)

- [x] 5.1 Update `src/lib/pocketbase/auth.ts` to replace the six-role set with `admin`, `professor`, and `father`; simplify capability helpers so only `admin` grants module access.
- [x] 5.2 Update `src/lib/pocketbase/users.ts` to recognize the new roles and sync `is_admin` from the `admin` role.
- [x] 5.3 Update `pb_hooks/main.pb.js` to authorize the email-send route with `admin` instead of `events_admin`/`super_admin`.
- [x] 5.4 Update `scripts/sync-role-based-authorization.sh`: replace `SUPPORTED_ROLES`, simplify all collection rules to use `admin`, create and seed the `roles` reference collection, and backfill users (super_admin → admin; no role → professor).
- [x] 5.5 Update tests to use the new role names.
- [x] 5.6 Run `bun run test` and `bun run build`.
