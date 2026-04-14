## Context

The employee edit page at `/staff-management/employees/{id}` allows uploading a CV PDF file. When submitting the form with a file, the current implementation passes an `EmployeeUpdateInput` object containing a `File` property to the server function. However, SolidStart's Seroval serializer cannot serialize `File` objects, causing a 503 error.

The codebase already has a working pattern for file uploads in `leaves.ts`:
- `updateEmployeeLeaveWithUpload(id, formData)` - accepts raw `FormData`
- `parseLeaveUploadFormData(formData)` - parses string and file fields from FormData
- `buildLeaveFormData(payload)` - builds FormData for PocketBase

## Goals / Non-Goals

**Goals:**
- Fix the 503 error when uploading CV files on employee edit page
- Use the established FormData pattern already proven in `leaves.ts`
- No PocketBase schema or API changes required

**Non-Goals:**
- Add new features - only fix the serialization bug
- Refactor other file uploads (leaves already work)

## Decisions

### Approach: Use Raw FormData Instead of Typed Payload with File

**Decision**: Create `updateEmployeeWithUpload` that accepts raw `FormData`, mirroring the existing `updateEmployeeLeaveWithUpload` pattern.

**Rationale**:
- File objects cannot be serialized by Seroval, but raw `FormData` can be passed through
- This pattern is already working in `leaves.ts` for leave file uploads
- Minimizes code changes and risk

**Alternative Considered**:
- Converting `File` to `Blob` before sending - doesn't help; Seroval can't serialize either
- Using base64 encoding - adds complexity and changes PocketBase API expectations

## Implementation Overview

1. **Add helper functions in `employees.ts`**:
   - `parseEmployeeUploadFormData(formData)` - parse fields from FormData
   - Build FormData for PocketBase using existing `buildFormDataPayload`

2. **Add new server function in `employees.ts`**:
   - `updateEmployeeWithUpload(id: string, formData: FormData)` - accepts raw FormData
   - Uses same pattern as `updateEmployeeLeaveWithUpload`

3. **Update UI in `[id].tsx`**:
   - Build `FormData` with all form fields
   - Call `updateEmployeeWithUpload` instead of `updateEmployee`

## Risks / Trade-offs

- **Risk**: Breaking existing API contracts if other code calls `updateEmployee` with `cv` field
  - **Mitigation**: Keep `updateEmployee` function unchanged; add new `updateEmployeeWithUpload` instead
  - Both functions will coexist

- **Risk**: Test coverage gaps
  - **Mitigation**: Verify existing tests pass; the fix is minimal and mirrors working code
