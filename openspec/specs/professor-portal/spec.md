## ADDED Requirements

### Requirement: Professor users SHALL see a role-specific home page
The home page SHALL display different module sections based on the authenticated user's role. When the user holds the `professor` role, the page MUST show only professor modules (Gestión personal, Gestión de Estudiantes, Eventos). When the user holds the `admin` role, the page MUST show only admin modules (the existing section grid). Mixed display is not required.

#### Scenario: Professor sees professor modules on home
- **WHEN** a user with only the `professor` role logs in and opens the home page
- **THEN** the page shows exactly three modules: Gestión personal, Gestión de Estudiantes, and Eventos
- **THEN** no admin modules (Gestión de matrícula, Informes, etc.) are visible

#### Scenario: Admin sees admin modules on home
- **WHEN** a user with the `admin` role opens the home page
- **THEN** the page shows the existing admin section grid without professor modules

### Requirement: Professor module routes SHALL be accessible only to professor-role users
All routes under `/professor/*` MUST redirect unauthenticated users to login. Authenticated users without the `professor` role MUST be redirected to the home page.

#### Scenario: Unauthenticated access redirects to login
- **WHEN** an unauthenticated user navigates to any `/professor/*` route
- **THEN** the app redirects to the login page

#### Scenario: Admin cannot access professor routes
- **WHEN** a user with only the `admin` role navigates to a `/professor/*` route
- **THEN** the app redirects to the home page

### Requirement: `canAccessModule` SHALL grant professor-role users access to professor-specific module keys
The authorization helper MUST recognize the module keys `professor-personal`, `professor-students`, and `professor-events` and return `true` when the authenticated user holds the `professor` role.

#### Scenario: Professor can access professor module keys
- **WHEN** `canAccessModule('professor-personal')` is called for a user with the `professor` role
- **THEN** the function returns `true`

#### Scenario: Admin cannot access professor module keys via canAccessModule
- **WHEN** `canAccessModule('professor-personal')` is called for a user with only the `admin` role
- **THEN** the function returns `false`

### Requirement: Employee user creation SHALL auto-assign the `professor` role
When a new app user is created through the employee creation workflow, the system MUST set `roles: ['professor']` on the created user record. The user SHALL NOT be created with an empty roles array.

#### Scenario: Creating an employee user assigns professor role
- **WHEN** `createEmployeeUser` is called with valid email and name
- **THEN** the created user record has `roles` containing `'professor'`

### Requirement: Roles SHALL be locked for employee-linked users in the user management UI
In the app-user management page, if the displayed user is linked to an employee record (via `employees.userId`), the roles field MUST be rendered as read-only. The admin MUST NOT be able to change the roles of an employee-linked user from this UI.

#### Scenario: Employee-linked user roles are read-only
- **WHEN** an admin opens the edit view for a user that has a linked employee record
- **THEN** the roles field is displayed but not editable
- **THEN** no save action for roles is available

#### Scenario: Non-employee user roles remain editable
- **WHEN** an admin opens the edit view for a user with no linked employee record
- **THEN** the roles field is editable as before
