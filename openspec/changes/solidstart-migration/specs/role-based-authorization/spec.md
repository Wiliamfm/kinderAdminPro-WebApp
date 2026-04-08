## MODIFIED Requirements

### Requirement: Protected modules SHALL authorize access by role-capability mapping
The system SHALL evaluate protected route, page, and section-link access through a shared role-capability mapping instead of a single admin boolean. `super_admin` MUST authorize every protected module, and each protected module MUST authorize its corresponding module role. Role checks SHALL be enforced on the server via middleware — the client-side auth guard becomes a UX convenience that reflects server-provided auth state, not the source of truth.

#### Scenario: Staff role sees only staff capabilities
- **WHEN** an authenticated user has `staff_admin` and does not have `super_admin`
- **THEN** the user is allowed to access staff-management workflows protected for the staff module
- **THEN** the user is not granted enrollment, reports, events, or user-management access solely from that role

#### Scenario: User-management role unlocks app user administration
- **WHEN** an authenticated user has `user_admin`
- **THEN** the user is allowed to access app-user administration workflows
- **THEN** the user is not required to hold unrelated module roles to manage app users

#### Scenario: Server enforces role checks on server functions
- **WHEN** a server function for a protected module is called
- **THEN** the server middleware verifies the user's role from the auth cookie before executing the function
- **THEN** unauthorized requests are rejected with a 403 error before any PocketBase query executes

#### Scenario: Client guard reflects server auth state
- **WHEN** the client-side auth guard checks access to a protected module
- **THEN** it uses the role information provided by the server (via the auth state signal)
- **THEN** it does NOT read roles from localStorage or client-side token parsing

### Requirement: Backend enforcement SHALL use the role model for protected resources
PocketBase collection rules and custom protected routes SHALL enforce authorization using the user's assigned roles rather than relying only on `is_admin`. Protected backend access MUST remain consistent with the frontend role-capability mapping. SolidStart server functions SHALL additionally enforce role checks via middleware before forwarding requests to PocketBase.

#### Scenario: Role-authorized request reaches a protected backend resource
- **WHEN** an authenticated user with the required module role calls a protected collection or custom route
- **THEN** the backend authorizes the request without requiring unrelated roles

#### Scenario: User without the required role is denied
- **WHEN** an authenticated user without the required module role and without `super_admin` calls a protected collection or custom route
- **THEN** the backend rejects the request

#### Scenario: SolidStart middleware enforces roles before PocketBase
- **WHEN** a server function for a protected module is invoked
- **THEN** the SolidStart middleware checks the user's roles from the auth context
- **THEN** if the user lacks the required role, the request is rejected without reaching PocketBase
