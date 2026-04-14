## Context

Staff users cannot submit employee invoices because the `createInvoiceFile` server function in `invoice-files.ts` accepts an `InvoiceFileCreateInput` object containing a `File` property. SolidStart's Seroval serializer cannot serialize `File` objects, causing a 503 Server Unavailable error during deserialization step 3.

The codebase already has a working pattern for file uploads in `leaves.ts`:
- `updateEmployeeLeaveWithUpload(id, formData)` - accepts raw `FormData`
- `parseLeaveUploadFormData(formData)` - parses fields from FormData

The CV upload fix (change `2026-04-14-fix-employee-cv-upload`) applied this same pattern.

## Goals / Non-Goals

**Goals:**
- Fix the 503 error when uploading invoice files
- Use the established FormData pattern
- No PocketBase schema changes

**Non-Goals:**
- Add new features - only fix the serialization bug
- Don't change invoice storage logic (same PocketBase collection)

## Decisions

### Approach: Use Raw FormData Instead of Typed Payload with File

**Decision**: Change `createInvoiceFile` to accept raw `FormData` instead of `InvoiceFileCreateInput`.

**Rationale**:
- File objects cannot be serialized by Seroval, but raw `FormData` can pass through
- Same pattern already working in `leaves.ts` for leave uploads
- Mirrors the CV upload fix that was just completed

**Alternative Considered**:
- Converting `File` to `Blob` before sending - doesn't help; Seroval can't serialize either
- Using base64 encoding - adds complexity and changes PocketBase API

## Implementation Overview

1. **Modify `createInvoiceFile` in `invoice-files.ts`**:
   - Change signature from `payload: InvoiceFileCreateInput` to `formData: FormData`
   - Extract file from FormData instead of from payload object

2. **Update client in `employees.tsx`**:
   - Build `FormData` with the file
   - Send to `createInvoiceFile(formData)` instead of `createInvoiceFile({ file })`

3. **Keep `InvoiceFileRecord` return type unchanged** - same shape, minimal API disruption

## Risks / Trade-offs

- **Risk**: Other code calling `createInvoiceFile` with old signature
  - **Mitigation**: Check all usages; `createInvoiceFile` is only called from `employees.tsx` line 948
  - Only one caller, easy to update

- **Risk**: Test failures in `invoice-files.test.ts`
  - **Mitigation**: The pattern is proven in leaves; tests will need updating but logic stays the same