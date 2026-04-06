## Context

The current application uses a single `users.is_admin` boolean to gate access across nearly every protected workflow. That boolean is read directly in frontend helpers, route-level redirects, section-link filtering, PocketBase collection rules, and the event email custom route in `pb_hooks/main.pb.js`. The app has since grown into multiple operational modules with different trust boundaries, so the current model cannot express limited access such as event-only or reports-only administration.

This is a cross-cutting change touching the PocketBase auth schema, backend rules, custom-route authorization, frontend auth helpers, navigation metadata, page guards, user-management UI, tests, and docs. It also requires a safe migration path because existing privileged users already depend on `is_admin`.

## Goals / Non-Goals

**Goals:**
- Replace the binary admin model with a role-based authorization model that supports module-scoped access.
- Keep authorization decisions consistent across frontend rendering, navigation visibility, page redirects, PocketBase rules, and custom routes.
- Support multi-role users so one account can manage more than one operational module.
- Preserve access for current admins during migration without requiring manual recreation of privileged users.
- Keep the initial role set small and understandable for administrators.

**Non-Goals:**
- Redesigning authentication itself or replacing PocketBase auth.
- Introducing per-record ownership rules or attribute-based access control in this change.
- Building a fully generic policy editor or database-driven permission matrix.
- Expanding non-admin self-service flows beyond the current authenticated-app model.

## Decisions

### 1. Store roles as a multi-select field on the PocketBase `users` auth collection

The `users` auth collection will gain a `roles` multi-select field with a controlled set of values: `super_admin`, `staff_admin`, `enrollment_admin`, `reports_admin`, `events_admin`, and `user_admin`.

Rationale:
- The repo already organizes protected functionality by module, so module-scoped roles fit the current product shape.
- Multi-role assignment avoids forcing artificial hierarchy when one staff member needs access to more than one area.
- Keeping roles on the auth record lets PocketBase rules enforce access without an extra join table.

Alternatives considered:
- A single `role` enum would be simpler, but it cannot model common mixed-responsibility users.
- A separate roles collection or permission matrix would be more flexible, but it adds unnecessary complexity for the current app size.

### 2. Introduce centralized capability helpers instead of scattering raw role checks

Frontend authorization will move behind shared helpers in `src/lib/pocketbase/auth.ts` (or a closely related auth utility) that expose role lookup plus capability checks such as “can access staff module” or “can manage app users.”

Rationale:
- The current codebase already has many direct `isAuthUserAdmin()` calls; replacing them one-by-one with raw role arrays would spread authorization policy even further.
- A capability layer keeps pages and navigation focused on business intent while allowing the underlying role mapping to evolve.
- Tests become more stable because they can mock one helper surface instead of many role combinations.

Alternatives considered:
- Direct inline `hasRole(...)` calls are possible, but they duplicate policy decisions across files.
- Route metadata alone is insufficient because buttons, modals, and custom-route calls also need the same policy.

### 3. Keep a small explicit module-to-role mapping for v1

The initial access map will be explicit and code-defined:
- `super_admin`: full access everywhere
- `staff_admin`: staff management workflows
- `enrollment_admin`: enrollment workflows
- `reports_admin`: reports workflows
- `events_admin`: event calendar and email messaging workflows
- `user_admin`: app-user administration

Rationale:
- The current app structure is strongly module-based, so this mapping is easy to understand and communicate.
- Explicit mapping avoids premature abstraction while still removing the admin bottleneck.
- The change remains reversible and inspectable in code and docs.

Alternatives considered:
- A fully data-driven permission registry would be more generic, but is harder to validate and document in the first rollout.
- Reusing job titles as authorization roles would couple HR data with security decisions.

### 4. Migrate in a compatibility phase before removing `is_admin`

Implementation will use a staged transition:
1. add `roles`,
2. backfill current admin users to `super_admin`,
3. update frontend and backend checks to prefer roles while tolerating legacy `is_admin` where necessary during rollout,
4. remove `is_admin` usage once all protected surfaces have switched.

Rationale:
- The app has many authorization call sites, including backend rules and custom hooks.
- A compatibility phase lowers the risk of locking out existing admins during deployment.
- Tests can move incrementally while behavior remains stable.

Alternatives considered:
- A one-shot cutover would be faster on paper, but it creates unnecessary lockout risk across frontend and PocketBase rules.

### 5. Update PocketBase collection rules and hook guards to use role expressions that mirror frontend capabilities

Collection rules and the event-email hook will be rewritten to check role membership rather than `is_admin`. Rules will grant access to the module role or `super_admin`, and hook authorization will use the same role semantics.

Rationale:
- Backend enforcement is the real security boundary; frontend-only changes would be cosmetic.
- Using the same role model in both layers reduces policy drift.
- The event email route already proves that protected backend logic exists outside standard collection CRUD rules.

Alternatives considered:
- Leaving backend rules on `is_admin` while the UI switches to roles would create inconsistent authorization.
- Moving all sensitive logic into custom routes is unnecessary because PocketBase rules already cover most collections well.

## Risks / Trade-offs

- [Role mapping is too coarse for future workflows] → Mitigation: keep frontend checks capability-based so finer permissions can be introduced later without rewriting every page.
- [Frontend and backend rules drift during migration] → Mitigation: migrate by module, update docs with the role map, and replace `is_admin` call sites systematically.
- [Existing admins lose access during rollout] → Mitigation: backfill `super_admin` before switching enforcement and keep a short compatibility phase.
- [User-management UX becomes harder to understand] → Mitigation: use a small fixed role set with clear labels and keep the first version limited to operational modules.
- [Historical tests become brittle during the transition] → Mitigation: refactor tests to mock shared capability helpers rather than the legacy admin boolean.

## Migration Plan

1. Add the `roles` field to the PocketBase `users` auth collection with the fixed allowed values.
2. Backfill every current `is_admin = true` user to include `super_admin`.
3. Update frontend auth helpers and user mapping to read roles and expose capability checks.
4. Update protected pages and section navigation to use the new capability helpers.
5. Update user-management flows to edit roles and keep new employee-created users unprivileged by default.
6. Update PocketBase collection rules and `pb_hooks/main.pb.js` authorization checks to use roles.
7. Run the full test/build validation pass and update architecture/overview docs.
8. Remove remaining `is_admin` dependencies after the role-based path is fully active.

Rollback:
- Restore the previous `is_admin` checks in frontend helpers and backend rules.
- Keep the new `roles` field if already populated, but stop enforcing it until the rollout is retried.
- Revert user-management UI changes if role editing causes operational issues.

## Open Questions

- Should employee creation continue to produce users with no roles, or should some onboarding flows optionally assign a starter module role?
- Should the staff employee list remain visible only to `staff_admin`, or do some report-oriented roles also need read-only employee lookup in the future?
- Do we want role labels localized separately from their persisted values in v1, or is a fixed internal-to-display mapping sufficient?
