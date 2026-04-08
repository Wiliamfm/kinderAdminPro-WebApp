## Context

The professor "Gestión Personal" module has two `getAuthUserId` functions in the codebase:

1. `src/lib/pocketbase/users.ts:120` — Uses `getRequestEvent().locals.authUser?.id`. Works during SSR but returns `null` during client-side navigation because `getRequestEvent()` is only available in server context.
2. `src/lib/pocketbase/auth.ts:80` — Uses the reactive `authUser()` signal. Works on both server and client.

Four route pages import from `users.ts` (the broken one). During client-side navigation, this causes `userId` to be empty, the employee resource never fires, and `employee()` remains `undefined` — triggering the false error message.

Additionally, the module uses "Gestión personal" and "salida" terminology which should be "Gestión de pagos e incapacidades" and "ausencia".

## Goals / Non-Goals

**Goals:**
- Fix employee lookup so it works during client-side navigation
- Update all UI labels to use correct terminology ("ausencia" instead of "salida", updated module title)

**Non-Goals:**
- Removing or deprecating `getAuthUserId` from `users.ts` (other server-only code may use it)
- Changing any business logic for leaves or invoices
- Modifying PocketBase collection schemas

## Decisions

### Use `getAuthUserId` from `auth.ts` in all route components

**Rationale:** Route components run on the client during SPA navigation. The `auth.ts` version reads from the reactive `authUser()` signal which is always populated after login. The `users.ts` version relies on `getRequestEvent()` which is only available during SSR or inside `"use server"` functions.

**Alternative considered:** Adding `"use server"` to the `getAuthUserId` in `users.ts` — rejected because this would make it an async server function call, adding unnecessary network overhead for something already available client-side.

### String replacement for terminology

**Rationale:** Simple find-and-replace in the affected files. No structural changes needed — just updating display strings.

## Risks / Trade-offs

- [Low risk] Other code importing `getAuthUserId` from `users.ts` → Only server-side code should use it. The 4 route files are the only client-side importers.
