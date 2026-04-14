## 1. Server-side changes

- [x] 1.1 Update `createInvoiceFile` in `src/lib/pocketbase/invoice-files.ts` to accept `FormData` instead of `InvoiceFileCreateInput`
- [x] 1.2 Remove unused `InvoiceFileCreateInput` type import/export if no longer needed

## 2. Client-side changes

- [x] 2.1 Update `src/routes/staff-management/employees.tsx` to build and send `FormData` instead of `{ file: File }` object
- [x] 2.2 Verify the server function call at line 948 uses the new `FormData` signature

## 3. Testing and verification

- [x] 3.1 Run `bun run build` to ensure no type errors
- [ ] 3.2 Test invoice submission at `/staff-management/employees` to verify no 503 error
- [x] 3.3 Update tests in `src/lib/pocketbase/invoice-files.test.ts` if needed
