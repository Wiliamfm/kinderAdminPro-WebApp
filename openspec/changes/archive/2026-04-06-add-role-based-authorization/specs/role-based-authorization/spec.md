## ADDED Requirements

### Requirement: App users SHALL support assignable authorization roles
The system SHALL store authorization roles on the PocketBase `users` auth collection as a multi-value field. The initial supported roles MUST include `super_admin`, `staff_admin`, `enrollment_admin`, `reports_admin`, `events_admin`, and `user_admin`.

#### Scenario: Privileged user record stores more than one role
- **WHEN** an authorized operator saves a user with multiple assigned roles
- **THEN** the user record persists all selected role values on the auth user
- **THEN** subsequent authorization checks evaluate against the stored role set

#### Scenario: Newly created employee-backed app user starts unprivileged
- **WHEN** the system creates a new app user during employee onboarding
- **THEN** the created user record does not receive any privileged module role by default

### Requirement: Protected modules SHALL authorize access by role-capability mapping
The system SHALL evaluate protected route, page, and section-link access through a shared role-capability mapping instead of a single admin boolean. `super_admin` MUST authorize every protected module, and each protected module MUST authorize its corresponding module role.

#### Scenario: Staff role sees only staff capabilities
- **WHEN** an authenticated user has `staff_admin` and does not have `super_admin`
- **THEN** the user is allowed to access staff-management workflows protected for the staff module
- **THEN** the user is not granted enrollment, reports, events, or user-management access solely from that role

#### Scenario: User-management role unlocks app user administration
- **WHEN** an authenticated user has `user_admin`
- **THEN** the user is allowed to access app-user administration workflows
- **THEN** the user is not required to hold unrelated module roles to manage app users

### Requirement: User administration SHALL manage roles instead of a single admin flag
The system SHALL let an authorized operator review and update a user's assigned roles through the app-user management workflow. The user-management UI MUST expose the available roles and persist role edits to the `users` auth collection.

#### Scenario: Operator assigns roles from the app-user editor
- **WHEN** an authorized operator updates a user's roles in the app-user management workflow
- **THEN** the selected role set is saved on the auth user record
- **THEN** the updated role set is visible when the user list is refreshed

#### Scenario: Operator removes a module role
- **WHEN** an authorized operator removes a previously assigned module role from a user
- **THEN** the saved user record no longer includes that role
- **THEN** subsequent access checks no longer grant the removed module capability from that role

### Requirement: Backend enforcement SHALL use the role model for protected resources
PocketBase collection rules and custom protected routes SHALL enforce authorization using the user's assigned roles rather than relying only on `is_admin`. Protected backend access MUST remain consistent with the frontend role-capability mapping.

#### Scenario: Role-authorized request reaches a protected backend resource
- **WHEN** an authenticated user with the required module role calls a protected collection or custom route
- **THEN** the backend authorizes the request without requiring unrelated roles

#### Scenario: User without the required role is denied
- **WHEN** an authenticated user without the required module role and without `super_admin` calls a protected collection or custom route
- **THEN** the backend rejects the request

### Requirement: Existing admins SHALL retain privileged access through migration
The system SHALL provide a migration path that preserves access for existing privileged users when switching from `is_admin` to roles. Users that currently depend on administrative access MUST be backfilled to a privileged role before role-based enforcement becomes authoritative.

#### Scenario: Legacy admin is backfilled to super admin
- **WHEN** the role-based authorization migration runs for a user whose `is_admin` is `true`
- **THEN** the user is assigned `super_admin`
- **THEN** the user retains access to protected modules after role-based enforcement is enabled
