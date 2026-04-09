## 1. Fix getAuthUserId import (bug fix)

- [x] 1.1 In `src/routes/professor/personal/leaves.tsx`, change `getAuthUserId` import from `lib/pocketbase/users` to `lib/pocketbase/auth`
- [x] 1.2 In `src/routes/professor/personal/invoices.tsx`, change `getAuthUserId` import from `lib/pocketbase/users` to `lib/pocketbase/auth`
- [x] 1.3 In `src/routes/professor/students.tsx`, change `getAuthUserId` import from `lib/pocketbase/users` to `lib/pocketbase/auth`
- [x] 1.4 In `src/routes/professor/students/[id].tsx`, change `getAuthUserId` import from `lib/pocketbase/users` to `lib/pocketbase/auth`

## 2. Rename module title

- [x] 2.1 In `src/lib/section-index.ts`, change title from "Gestión personal" to "Gestión de pagos e incapacidades"
- [x] 2.2 In `src/lib/section-index.ts`, update description to reference "ausencias" instead of "salidas"
- [x] 2.3 In `src/components/Navbar.tsx`, update label from "Gestión personal" to "Gestión de pagos e incapacidades" (if label is defined there)

## 3. Rename "salida" to "ausencia"

- [x] 3.1 In `src/lib/section-index.ts`, change link label from "Registrar salida" to "Registrar ausencia"
- [x] 3.2 In `src/routes/professor/personal/leaves.tsx`, change page title from "Registrar salida" to "Registrar ausencia"
- [x] 3.3 In `src/routes/professor/personal/leaves.tsx`, change "Nueva salida" button to "Nueva ausencia"
- [x] 3.4 In `src/routes/professor/personal/leaves.tsx`, update any remaining "salida" references in modal text and labels to "ausencia"

## 4. Update spec

- [x] 4.1 Update `openspec/specs/professor-personal-management/spec.md` with the archived delta from this change
