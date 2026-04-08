## Why

The "Gestión Personal" professor module has two issues: (1) a bug where `getAuthUserId` is imported from `users.ts` (server-only, relies on `getRequestEvent()`) instead of `auth.ts` (client-side reactive signal), causing employee lookup to fail during client-side navigation and showing a false "employee not found" error; (2) the module and submodule labels use incorrect terminology — "Gestión personal" should be "Gestión de pagos e incapacidades" and "salida" should be "ausencia" throughout.

## What Changes

- Fix `getAuthUserId` import in 4 pages (`leaves.tsx`, `invoices.tsx`, `students.tsx`, `students/[id].tsx`) to use `lib/pocketbase/auth` (client-side signal) instead of `lib/pocketbase/users` (server-only `getRequestEvent()`)
- Rename module title from "Gestión personal" to "Gestión de pagos e incapacidades" in section index and navbar
- Rename all "salida" references to "ausencia" in the leaves page and section index (page title, button labels, link labels, description text)

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `professor-personal-management`: Rename "Registrar salida" to "Registrar ausencia" throughout, rename module title to "Gestión de pagos e incapacidades", and fix the employee record resolution to use client-side auth state instead of server-only request event

## Impact

- `src/routes/professor/personal/leaves.tsx` — bug fix (import) + naming
- `src/routes/professor/personal/invoices.tsx` — bug fix (import)
- `src/routes/professor/students.tsx` — bug fix (import)
- `src/routes/professor/students/[id].tsx` — bug fix (import)
- `src/lib/section-index.ts` — naming (title, description, link label)
- `src/components/Navbar.tsx` — naming (if module label is defined here)
- `openspec/specs/professor-personal-management/spec.md` — update terminology
