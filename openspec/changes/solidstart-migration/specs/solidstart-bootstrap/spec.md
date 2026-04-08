## ADDED Requirements

### Requirement: Application SHALL use SolidStart as the framework
The project SHALL replace the plain Vite + SolidJS setup with SolidStart (using Vinxi as the underlying server). The `vite.config.ts` and `index.html` entry point SHALL be replaced by `app.config.ts` with SolidStart configuration. SSR SHALL be disabled (`ssr: false`) — the app runs as CSR with server function support.

#### Scenario: SolidStart app boots in CSR mode
- **WHEN** the application starts in development or production
- **THEN** the server serves an HTML shell and the client renders all UI via SolidJS
- **THEN** no server-side HTML rendering occurs for page components

#### Scenario: Vite config is replaced
- **WHEN** the project is built
- **THEN** `app.config.ts` is the sole build configuration entry point
- **THEN** `vite.config.ts` and `index.html` no longer exist

### Requirement: Routes SHALL use file-based routing convention
All existing manual route definitions in `routes.ts` SHALL be converted to file-based routes under `src/routes/`. Each page component SHALL be placed at a file path that matches its URL path. The manual `routes.ts` file SHALL be removed.

#### Scenario: Staff management routes map to files
- **WHEN** a user navigates to `/staff-management/employees`
- **THEN** the route resolves to `src/routes/staff-management/employees.tsx`

#### Scenario: Nested professor routes map to files
- **WHEN** a user navigates to `/professor/personal/leaves`
- **THEN** the route resolves to `src/routes/professor/personal/leaves.tsx`

#### Scenario: Login route maps to file
- **WHEN** a user navigates to `/login`
- **THEN** the route resolves to `src/routes/login.tsx`

#### Scenario: Manual route registry is removed
- **WHEN** the migration is complete
- **THEN** `src/routes.ts` no longer exists
- **THEN** all route definitions come from the file system convention

### Requirement: Layout components SHALL use SolidStart layout convention
The app shell (navbar, auth guard wrapper) SHALL be implemented as a SolidStart root layout at `src/routes/(layout).tsx` or equivalent. Protected route groups SHALL share a layout that enforces the auth guard.

#### Scenario: Authenticated layout wraps protected pages
- **WHEN** a user accesses any route except `/login`
- **THEN** the page renders inside the authenticated layout (navbar, auth guard)

#### Scenario: Login page renders without authenticated layout
- **WHEN** a user accesses `/login`
- **THEN** the page renders without the navbar or auth guard wrapper

### Requirement: Build output SHALL target Node.js server deployment
The production build SHALL output a Node.js server application (not static files). The Dockerfile SHALL be updated to use a Node.js base image and run the SolidStart server.

#### Scenario: Production build produces a server
- **WHEN** `npm run build` completes
- **THEN** the output is a Node.js server entry point (not a static `dist/` directory)

#### Scenario: Docker build produces a running container
- **WHEN** the Dockerfile is built and the container starts
- **THEN** the SolidStart server listens on the configured port
- **THEN** the application is accessible via HTTP

### Requirement: All existing pages SHALL render identically after migration
Every page that currently works SHALL continue to render and function after the SolidStart migration. No behavioral changes are introduced in this phase — business logic remains client-side.

#### Scenario: Page count parity
- **WHEN** comparing before and after the migration
- **THEN** all 35+ pages are accessible at their respective URLs

#### Scenario: Client-side business logic is untouched
- **WHEN** any page performs CRUD operations after migration
- **THEN** the operations use the same `src/lib/pocketbase/*.ts` functions as before
- **THEN** no server functions are introduced in this phase (except the SolidStart framework itself)
