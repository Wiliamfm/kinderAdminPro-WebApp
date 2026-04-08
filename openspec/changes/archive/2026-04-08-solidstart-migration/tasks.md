## 1. Phase 1 — SolidStart Bootstrap

- [x] 1.1 Install SolidStart dependencies (`@solidjs/start`, `vinxi`) and remove plain Vite setup
- [x] 1.2 Create `app.config.ts` with SolidStart config (`ssr: false`) and remove `vite.config.ts` + `index.html`
- [x] 1.3 Create root `src/app.tsx` entry following SolidStart convention (html, head, body, scripts)
- [x] 1.4 Convert manual `routes.ts` to file-based routing — create `src/routes/` directory structure matching all 30+ URL paths
- [x] 1.5 Move page components from `src/pages/*.tsx` into `src/routes/**/*.tsx` at their correct file paths
- [x] 1.6 Create authenticated layout (`src/routes/(protected).tsx` or equivalent) wrapping navbar + auth guard for all non-login routes
- [x] 1.7 Ensure login route (`src/routes/login.tsx`) renders outside the authenticated layout
- [x] 1.8 Update all internal imports and path references broken by the file moves
- [x] 1.9 Update `vitest.config.ts` and test setup for SolidStart compatibility
- [x] 1.10 Update `Dockerfile` to build and serve a Node.js SolidStart server instead of static nginx
- [ ] 1.11 Verify all 35+ pages render and function identically — manual smoke test each route
- [x] 1.12 Run existing test suite and fix any failures from the migration

## 2. Phase 2 — Server-Side Auth with HTTP-Only Cookies

- [x] 2.1 Create server-side login action (`"use server"`) that calls `pb.authWithPassword()` and sets HTTP-only cookie (`Secure`, `SameSite=Lax`, expiry matching PocketBase token)
- [x] 2.2 Create server-side logout action that clears the auth cookie
- [x] 2.3 Create SolidStart middleware that reads the auth cookie from each request and provides an authenticated PocketBase client to server functions via request context
- [x] 2.4 Create a `"use server"` function `getCurrentUser()` that returns user profile (role, name, email) from the cookie-based auth — this is the client's source of truth
- [x] 2.5 Replace client-side `subscribeAuth()` / `pb.authStore` usage with a client signal populated from `getCurrentUser()`
- [x] 2.6 Update `src/lib/auth/guard.ts` to derive auth state from the server-provided signal instead of `pb.authStore`
- [x] 2.7 Move `canAccessModule()` and role-check logic to execute on the server (middleware), with client guard as UX convenience only
- [x] 2.8 Update login page to use the new server action instead of direct `pb.authWithPassword()` call
- [x] 2.9 Pull forward the minimum Phase 3 server-function migrations needed so protected route data no longer depends on browser `pb.authStore` after cookie auth lands
- [x] 2.10 Remove `VITE_PB_URL` — replace with server-only `PB_URL` env var once the pulled-forward modules no longer read client env
- [ ] 2.11 Verify: `localStorage` and `document.cookie` contain no PocketBase token in browser DevTools, and protected page data still loads after login
- [ ] 2.12 Test login/logout/role-gating flows end-to-end

## 3. Phase 3 — Server Data Access (Module-by-Module Migration)

- [x] 3.1 Create shared helper: `getAuthenticatedPb()` that gets the PocketBase client from middleware context (if not already done during the Phase 2 pull-forward tranche)
- [x] 3.2 Migrate `students.ts` — add `"use server"` to all CRUD functions, use `getAuthenticatedPb()`, verify pages work
- [x] 3.3 Migrate `employees.ts` — same pattern, including job assignment functions
- [x] 3.4 Migrate `grades.ts` — server functions for grade CRUD
- [x] 3.5 Migrate `semesters.ts` — server functions for semester CRUD
- [x] 3.6 Migrate `bulletins.ts` / `bulletins-categories.ts` — server functions for grading logic
- [x] 3.7 Migrate `events.ts` — server functions for event CRUD
- [x] 3.8 Migrate `leaves.ts` — server functions for professor leave management
- [x] 3.9 Migrate `invoices.ts` — server functions for invoice CRUD (verify file upload handling across RPC boundary)
- [x] 3.10 Migrate `users.ts` — server functions for app user management
- [x] 3.11 Migrate `reports/students-export.ts` and `reports/employees-export.ts` — generate PDF/CSV on server, return data for client download
- [x] 3.12 Remove `VITE_*` env vars from `.env`, ensure all secrets are server-only
- [x] 3.13 Remove `pocketbase` from client-side imports — verify it's not in any client chunk
- [x] 3.14 Bundle analysis: confirm `pocketbase` SDK is tree-shaken out of client JavaScript
- [x] 3.15 Run full test suite — update test setup to handle server function mocking
- [ ] 3.16 Smoke test all 35+ pages with server functions active

## 4. Phase 4 — Port pb_hooks Email to SolidStart

- [x] 4.1 Install `resend` SDK as a dependency
- [x] 4.2 Create `src/lib/server/email/recipients.ts` — port recipient resolution logic (students, employees, grades, fathers) from pb_hooks
- [x] 4.3 Create `src/lib/server/email/deduplication.ts` — port deduplication logic with source tracking
- [x] 4.4 Create `src/lib/server/email/html-builder.ts` — port text-to-HTML conversion with escaping
- [x] 4.5 Create `src/lib/server/email/send.ts` — implement Resend SDK integration replacing raw HTTP calls
- [x] 4.6 Create `src/lib/server/email/tracking.ts` — port delivery status tracking (PocketBase record creation per recipient)
- [x] 4.7 Create `"use server"` entry point that orchestrates the full email workflow (resolve → dedupe → build → send → track)
- [x] 4.8 Update event email messaging pages to call the new server function instead of the pb_hooks endpoint
- [x] 4.9 Write tests for recipient resolution, deduplication, HTML escaping, and delivery tracking
- [ ] 4.10 Verify parity: send test emails through both systems and compare recipient lists, HTML output, and tracking records
- [ ] 4.11 Remove `pb_hooks/main.pb.js` after parity verification
- [x] 4.12 Remove `RESEND_API_KEY` from any `VITE_*` reference — confirm it's only in server-only env
- [ ] 4.13 Final end-to-end test: send bulk email from the UI, verify delivery and tracking
