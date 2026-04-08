## ADDED Requirements

### Requirement: Login SHALL be a server action that sets an HTTP-only cookie
The login flow SHALL call `pb.authWithPassword()` on the server via a `"use server"` action. On success, the server SHALL set the PocketBase auth token as an HTTP-only cookie with `Secure`, `SameSite=Lax`, and an expiry matching the PocketBase token lifetime.

#### Scenario: Successful login sets cookie
- **WHEN** a user submits valid credentials on the login page
- **THEN** the server authenticates with PocketBase and sets an HTTP-only cookie containing the auth token
- **THEN** the cookie is not accessible via `document.cookie` or any client-side JavaScript
- **THEN** the user is redirected to the originally requested page (or home)

#### Scenario: Failed login returns error without setting cookie
- **WHEN** a user submits invalid credentials
- **THEN** the server returns an authentication error
- **THEN** no cookie is set
- **THEN** the login page displays the error message

#### Scenario: Cookie attributes are secure
- **WHEN** the login cookie is set
- **THEN** the cookie has `HttpOnly=true`, `Secure=true` (in production), `SameSite=Lax`
- **THEN** the cookie expiry matches the PocketBase token expiry

### Requirement: Logout SHALL clear the auth cookie on the server
A server action SHALL clear the HTTP-only auth cookie, effectively ending the session.

#### Scenario: User logs out
- **WHEN** a user triggers logout
- **THEN** the server clears the auth cookie (sets expiry to past)
- **THEN** subsequent requests are unauthenticated
- **THEN** the user is redirected to `/login`

### Requirement: Server middleware SHALL extract auth from cookie on every request
A SolidStart middleware SHALL read the auth cookie from each incoming request and make the authenticated PocketBase client (or auth state) available to all server functions in that request.

#### Scenario: Authenticated request provides PocketBase client to server functions
- **WHEN** a request arrives with a valid auth cookie
- **THEN** server functions in that request can obtain an authenticated PocketBase client
- **THEN** the PocketBase client uses the token from the cookie

#### Scenario: Request without auth cookie is treated as unauthenticated
- **WHEN** a request arrives without an auth cookie or with an expired/invalid cookie
- **THEN** server functions that require auth SHALL return an authentication error
- **THEN** the client-side auth guard redirects to `/login`

### Requirement: Client-side auth state SHALL be derived from a server call
The client SHALL obtain user info (role, name, email) from a server function — not from the raw token. A lightweight auth signal SHALL be available for UI rendering (navbar, role-based UI visibility).

#### Scenario: Client obtains auth state on app load
- **WHEN** the application loads in the browser
- **THEN** a server function is called to get the current user's profile (role, name)
- **THEN** the result populates a client-side signal used for UI rendering

#### Scenario: Auth state updates after login
- **WHEN** a user successfully logs in
- **THEN** the client-side auth signal is updated with the new user's profile
- **THEN** the navbar and route guards reflect the new auth state

#### Scenario: Auth state clears after logout
- **WHEN** a user logs out
- **THEN** the client-side auth signal is cleared
- **THEN** the navbar shows the logged-out state

### Requirement: PocketBase auth token SHALL NOT be accessible in browser JavaScript
The raw PocketBase token SHALL never appear in localStorage, sessionStorage, or any JavaScript-accessible storage. The `pb.authStore` client-side pattern SHALL be removed.

#### Scenario: Token not in browser storage
- **WHEN** a user is authenticated
- **THEN** `localStorage` and `sessionStorage` contain no PocketBase token
- **THEN** `document.cookie` does not expose the token (HTTP-only)

#### Scenario: PocketBase client SDK not used client-side for auth
- **WHEN** the client-side code is inspected
- **THEN** no client-side code calls `pb.authWithPassword()` or reads `pb.authStore`

### Requirement: Auth rollout SHALL preserve authenticated page data access
The cookie-based auth rollout SHALL NOT leave protected pages dependent on browser-side PocketBase auth state. Once the browser token is removed, any route-facing data wrapper that still requires authenticated PocketBase access SHALL execute on the server before the auth phase is considered complete.

#### Scenario: Protected pages keep working after cookie auth lands
- **WHEN** a user logs in through the new server action
- **THEN** navigating to protected pages continues to load their authenticated data successfully
- **THEN** those page-facing PocketBase wrapper calls no longer depend on a browser-populated `pb.authStore`

#### Scenario: Auth phase can pull forward data-access work
- **WHEN** implementing Phase 2 reveals that a protected route still reads PocketBase directly from the browser
- **THEN** the required server-function migration for that route is treated as part of Phase 2
- **THEN** the corresponding data-access task is marked complete where it ultimately lives in the checklist
