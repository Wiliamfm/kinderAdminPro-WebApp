## Why

The entire application (business logic, PocketBase SDK, auth tokens, and secrets like `RESEND_API_KEY`) currently ships to the browser. This exposes credentials, leaks query logic, and makes client-side role checks bypassable. Moving to SolidStart enables a clear server/client boundary where secrets, auth, and data access stay on the server.

## What Changes

- **BREAKING**: Replace Vite + manual routing with SolidStart and file-based routing
- **BREAKING**: Auth moves from client-side `pb.authStore` (localStorage) to HTTP-only cookie sessions managed by the server
- Phase 2 pulls forward the minimum route-facing data-access migrations needed to keep protected pages functional once browser tokens are removed
- Move all `src/lib/pocketbase/*.ts` business logic behind `"use server"` functions — PocketBase SDK no longer ships to the browser
- Port `pb_hooks/main.pb.js` email workflow (~500 lines) to TypeScript server functions
- Remove `VITE_*` env vars — all secrets become server-only environment variables
- Server-side role enforcement (not just UI-level gating)

## Capabilities

### New Capabilities

- `solidstart-bootstrap`: SolidStart project setup, app.config.ts, file-based routing migration, updated build/deploy pipeline
- `server-auth`: HTTP-only cookie auth sessions, server-side login/logout actions, auth middleware, server-enforced role checks
- `server-data-access`: All PocketBase CRUD operations as `"use server"` functions, removing PocketBase SDK from client bundle
- `server-email`: TypeScript port of pb_hooks email workflow (recipient resolution, deduplication, Resend integration, delivery tracking)

### Modified Capabilities

- `role-based-authorization`: Role checks move from client-only guards to server-enforced middleware. Client guard becomes a UX convenience backed by server truth.

## Impact

- **All 35+ pages**: Route paths change to file-based convention under `src/routes/`
- **All `src/lib/pocketbase/*.ts` (38 files)**: Become server functions
- **`src/lib/auth/guard.ts`**: Rewritten to rely on server-provided auth state
- **`pb_hooks/main.pb.js`**: Removed after port to SolidStart server functions
- **`.env`**: All `VITE_*` prefixes removed; secrets no longer bundled
- **`Dockerfile`**: Updated for SolidStart build output (Node server instead of static nginx)
- **Dependencies**: Add `@solidjs/start`, `vinxi`; potentially add `resend` SDK
- **Testing**: Server functions need adjusted test setup (mock server context instead of direct calls)
