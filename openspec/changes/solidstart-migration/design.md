## Context

KinderAdminPro is a school management system built with SolidJS + Vite, backed by PocketBase. Currently, the entire application (business logic, PocketBase SDK, auth tokens, API keys) runs in the browser. The app has 35+ pages, 38+ lib files, and a ~500-line server hook for email.

The goal is to introduce SolidStart as the framework layer, establishing a server/client boundary so that secrets, auth, and data access never reach the browser.

**Current stack:** SolidJS 1.9 + Vite 7 + PocketBase 0.26 + manual routing (`routes.ts`)
**Target stack:** SolidStart (latest) + Vinxi + PocketBase 0.26 + file-based routing

## Goals / Non-Goals

**Goals:**
- Establish SolidStart as the application framework with file-based routing
- Move PocketBase auth to HTTP-only cookie sessions (token never in browser JS)
- Move all PocketBase CRUD operations to `"use server"` functions
- Port pb_hooks email workflow to TypeScript server functions
- Ensure no secrets (`RESEND_API_KEY`, admin credentials) are bundled into client JS
- Server-side role enforcement as the source of truth

**Non-Goals:**
- SSR / streaming rendering — this is an admin panel, CSR + server functions is sufficient
- Replacing PocketBase with another backend
- Rewriting UI components, pages, or adding new features
- Implementing offline support or service workers
- Changing the PocketBase collection schema

## Decisions

### 1. CSR mode with server functions (no SSR)

Use SolidStart in CSR mode (`ssr: false` in app.config). Pages render entirely in the browser; server functions handle data and auth.

**Why over SSR:** Admin panels don't need SEO or first-paint optimization. CSR avoids hydration mismatches, simplifies the migration (existing components work as-is), and keeps the mental model close to what exists today. Server functions still provide the security boundary.

**Why over staying on Vite:** Plain Vite has no server — can't do `"use server"`, can't manage cookies, can't keep secrets off the client.

### 2. File-based routing under `src/routes/`

Convert the manual `routes.ts` (30+ route definitions) to SolidStart's file-based routing convention.

**Route mapping strategy:**
```
Current manual route               →  File-based route
/staff-management/employees        →  src/routes/staff-management/employees.tsx
/enrollment-management/students    →  src/routes/enrollment-management/students.tsx
/professor/personal/leaves         →  src/routes/professor/personal/leaves.tsx
/login                             →  src/routes/login.tsx
```

**Why file-based:** SolidStart's convention. Eliminates the manual route registry, enables automatic code splitting per route, and enables layout nesting via route groups.

### 3. HTTP-only cookie for PocketBase auth token

On login, a server action calls `pb.authWithPassword()`, then sets the PocketBase token as an HTTP-only, Secure, SameSite=Lax cookie. Every subsequent server function reads the cookie to create an authenticated PocketBase client.

**Why over keeping localStorage:** The token in localStorage is accessible to any JS on the page (XSS vector). An HTTP-only cookie is invisible to client JS and automatically sent with requests.

**Why Lax over Strict:** SameSite=Strict breaks navigations from external links (e.g., email links to the app). Lax protects against CSRF on state-changing requests while allowing GET navigations.

**Cookie lifecycle:** Cookie expiry SHALL match PocketBase token expiry. On logout, the server clears the cookie. On token refresh, the server sets a new cookie.

### 4. Server function pattern for data access

Each existing `src/lib/pocketbase/*.ts` module becomes a server module. Functions gain `"use server"` directive. The authenticated PocketBase client is created per-request from the cookie.

```
// Before (client-side)
export async function listStudents(page, pageSize) {
  const pb = createPocketBase();  // uses VITE_PB_URL
  return pb.collection('students').getList(page, pageSize, { ... });
}

// After (server-side)
"use server";
export async function listStudents(page, pageSize) {
  const pb = getAuthenticatedPb();  // reads cookie, uses server-only PB_URL
  return pb.collection('students').getList(page, pageSize, { ... });
}
```

**Why this pattern:** Minimal change to call sites. Pages still call `createResource(() => listStudents(page, size))` — the RPC boundary is transparent. SolidStart's compiler handles the client/server split.

**Serialization constraint:** Server functions can only return serializable data. PocketBase `RecordModel` objects are plain objects, so this works without transformation.

**Rollout constraint:** Once auth moves to HTTP-only cookies, browser-side PocketBase SDK calls can no longer rely on `client.authStore.token` to set the `Authorization` header. That means the auth rollout cannot stop at login/logout/middleware alone. Phase 2 must pull forward any route-facing `src/lib/pocketbase/*.ts` migrations required to keep protected pages functional under the new cookie-based session model. Phase 3 then continues with the remaining modules, bundle cleanup, and broader verification.

### 5. Server-only environment variables

Remove all `VITE_` prefixes. Server functions read `process.env.PB_URL`, `process.env.RESEND_API_KEY`, etc. These are never bundled by Vinxi/Vite into client chunks.

### 6. Email workflow port strategy

Port `pb_hooks/main.pb.js` to TypeScript under `src/lib/server/email/`. Use the Resend SDK (`resend` npm package) instead of raw HTTP calls. Keep the same logical structure (recipient resolution → deduplication → send → track).

**Why move from pb_hooks:** TypeScript type safety, testability with vitest, unified codebase, no separate deployment concern.

### 7. Deployment: Node.js server replaces nginx static

SolidStart with server functions requires a Node.js runtime. The Dockerfile changes from a multi-stage nginx build to a Node.js container running the SolidStart server.

**Why not edge/serverless:** PocketBase runs alongside the app; a long-lived Node process on the same machine is the simplest deployment model.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| File-based routing conversion touches every page — high breakage surface | Phase 1 is isolated: no logic changes, just routing. Thorough manual + automated testing before proceeding. |
| Cookie expiry drift from PocketBase token expiry | Server middleware checks token validity on each request; refreshes cookie when PocketBase auto-refreshes the token. |
| Server function latency adds a network hop for every data call | Acceptable for admin panel. PocketBase runs locally (same machine), so the hop is <1ms. |
| `createResource` error handling may differ when errors come from RPC vs direct SDK | Normalize errors in server functions before returning. Keep the existing `normalizePocketBaseError` pattern. |
| Dockerfile change breaks existing deployment | Document the new deployment requirements. Provide rollback instructions. |
| pb_hooks removal requires verifying email parity | Run both systems in parallel during Phase 4, compare outputs before removing pb_hooks. |

## Migration Plan

The migration is split into 4 sequential phases. Each phase produces a deployable, fully functional application. Rollback at any phase means reverting to the previous phase's state.

**Phase 1 → Phase 2 (with auth-critical data-access pull-forward) → Phase 3 → Phase 4**

Each phase is specified in detail in its own spec file. See:
- `specs/solidstart-bootstrap/spec.md`
- `specs/server-auth/spec.md`
- `specs/server-data-access/spec.md`
- `specs/server-email/spec.md`

## Open Questions

- **PocketBase token refresh:** Does PocketBase auto-refresh tokens, and if so, how should the cookie be updated? Needs investigation during Phase 2.
- **File upload handling:** Invoices support file uploads. Server functions may need `multipart/form-data` handling — verify SolidStart's support.
- **Test strategy for server functions:** Vitest can test server functions directly (they're just async functions), but integration tests may need a running SolidStart dev server. Decide approach during Phase 3.
