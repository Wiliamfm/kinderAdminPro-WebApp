# server-data-access Specification

## Purpose
TBD - created by archiving change solidstart-migration. Update Purpose after archive.
## Requirements
### Requirement: All PocketBase CRUD operations SHALL execute as server functions
Every function in `src/lib/pocketbase/*.ts` that calls the PocketBase SDK SHALL be converted to a `"use server"` function. The PocketBase SDK SHALL NOT be included in the client-side JavaScript bundle.

#### Scenario: Student CRUD runs on server
- **WHEN** a page calls `listActiveStudentsPage()`, `createStudent()`, `editStudent()`, or `deactivateStudent()`
- **THEN** the function executes on the server via RPC
- **THEN** the PocketBase SDK call happens server-side

#### Scenario: Employee CRUD runs on server
- **WHEN** a page calls any employee management function (list, create, edit, job assignments)
- **THEN** the function executes on the server via RPC

#### Scenario: All remaining modules run on server
- **WHEN** a page calls functions from grades, semesters, bulletins, events, leaves, invoices, or users modules
- **THEN** the function executes on the server via RPC

#### Scenario: PocketBase SDK not in client bundle
- **WHEN** the production build is analyzed
- **THEN** the `pocketbase` package does not appear in any client-side JavaScript chunk

### Requirement: Server functions SHALL use the request-scoped authenticated PocketBase client
Each server function SHALL obtain the authenticated PocketBase client from the middleware context (set up in Phase 2) rather than creating its own client or reading environment variables directly.

#### Scenario: Server function uses middleware-provided auth
- **WHEN** a server function like `listActiveStudentsPage()` executes
- **THEN** it obtains the PocketBase client from the request context (which has the user's token from the cookie)
- **THEN** PocketBase enforces collection rules based on the authenticated user

#### Scenario: Unauthenticated server function call fails gracefully
- **WHEN** a server function is called without a valid auth context
- **THEN** the function returns an authentication error
- **THEN** the client redirects to login

### Requirement: Server function signatures SHALL remain compatible with existing call sites
Page components SHALL continue to call data functions with the same parameters and receive the same return types. The `createResource(() => listStudents(page, size))` pattern SHALL continue to work.

#### Scenario: Page component calls server function transparently
- **WHEN** a page component calls `createResource(() => listActiveStudentsPage(page(), pageSize()))`
- **THEN** SolidStart handles the RPC serialization transparently
- **THEN** the page receives the same data shape as before

#### Scenario: Error handling pattern is preserved
- **WHEN** a server function encounters a PocketBase error
- **THEN** the error is normalized using the existing `normalizePocketBaseError` pattern
- **THEN** the page component handles the error the same way as before

### Requirement: Environment variables SHALL be server-only
All `VITE_*` prefixed environment variables SHALL be removed. Server functions SHALL read environment variables directly (e.g., `process.env.PB_URL`). No environment variables SHALL be bundled into client JavaScript.

#### Scenario: PB_URL is server-only
- **WHEN** the PocketBase URL is configured
- **THEN** it is set as `PB_URL` (not `VITE_PB_URL`) in the environment
- **THEN** only server functions read this value

#### Scenario: No secrets in client bundle
- **WHEN** the production client JavaScript is inspected
- **THEN** no environment variable values (PB_URL, RESEND_API_KEY, admin credentials) appear in the code

### Requirement: Module migration SHALL follow a defined priority order
Modules SHALL be migrated in order of dependency and complexity to establish patterns early, but auth-critical route-facing wrappers MAY be pulled forward into Phase 2 when cookie auth would otherwise break protected pages. After that pull-forward tranche, the remaining order SHALL be: students → employees → grades/semesters → bulletins → events → leaves/invoices/users → reports.

#### Scenario: First module establishes the pattern
- **WHEN** the students module is migrated first
- **THEN** it establishes the server function pattern (auth from context, error normalization, return types)
- **THEN** subsequent modules follow the same pattern

#### Scenario: Auth-critical wrappers move earlier when required
- **WHEN** a protected route still depends on a browser-side PocketBase wrapper after cookie auth is enabled
- **THEN** that wrapper is migrated as part of the Phase 2 auth rollout
- **THEN** the remaining module migration order resumes after the auth-critical tranche is complete

#### Scenario: Each module is independently deployable
- **WHEN** a single module (e.g., students) is migrated to server functions
- **THEN** the application is fully functional with that module on the server and remaining modules still client-side
- **THEN** no big-bang switchover is required

### Requirement: Reports/export logic SHALL handle client download correctly
PDF and CSV export functions that generate downloadable files SHALL handle the server/client boundary appropriately. The server SHALL generate the data/file content, and the client SHALL trigger the browser download.

#### Scenario: PDF export works via server function
- **WHEN** a user exports a student report as PDF
- **THEN** the server function generates the PDF content (using jspdf)
- **THEN** the client receives the PDF data and triggers a browser download

#### Scenario: CSV export works via server function
- **WHEN** a user exports data as CSV
- **THEN** the server function generates the CSV content
- **THEN** the client receives the CSV data and triggers a browser download

