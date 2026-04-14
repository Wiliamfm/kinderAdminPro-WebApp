## 1. Add FormData Helper Functions to employees.ts

- [x] 1.1 Add `parseEmployeeUploadFormData(formData: FormData)` function to parse employee fields from raw FormData (mirroring `parseLeaveUploadFormData`)
- [x] 1.2 Add `buildEmployeeUploadFormData(payload)` function to build FormData for PocketBase (using existing `buildFormDataPayload`)

## 2. Add updateEmployeeWithUpload Server Function

- [x] 2.1 Add `export async function updateEmployeeWithUpload(id: string, formData: FormData): Promise<EmployeeRecord>` server function in `employees.ts`
- [x] 2.2 Export the new function in employees.ts index

## 3. Update Employee Edit Page to Use FormData

- [x] 3.1 Import `updateEmployeeWithUpload` in `[id].tsx`
- [x] 3.2 Modify `onSubmit` handler to build FormData with all form fields and call `updateEmployeeWithUpload` instead of `updateEmployee`
- [x] 3.3 Remove or keep `updateEmployee` import as needed (for non-file updates)

## 4. Verify and Test

- [x] 4.1 Run `bun run build` to verify no build errors
- [ ] 4.2 Run `bun run test` to verify existing tests pass
- [ ] 4.3 Manually test CV upload on employee edit page (if needed)
