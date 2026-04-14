## Why

Uploading a CV file on the employee edit page (`/staff-management/employees/{id}`) causes a 503 Server Unavailable error. The error occurs because the `File` object cannot be serialized by SolidStart's Seroval serializer when passing the payload to the server function.

## What Changes

- Add a new server function `updateEmployeeWithUpload` in `employees.ts` that accepts raw `FormData` (mirroring the existing `updateEmployeeLeaveWithUpload` pattern)
- Modify the employee edit page `[id].tsx` to send `FormData` directly instead of a typed object containing a `File`
- This fixes the serialization failure without changing PocketBase schema or API contracts

## Capabilities

### New Capabilities
- `employee-cv-upload`: Fix serialization of file uploads for employee CV by using raw FormData

### Modified Capabilities
None - this is a bug fix that doesn't change requirements.

## Impact

- **Modified files**:
  - `src/lib/pocketbase/employees.ts` - add `updateEmployeeWithUpload` function
  - `src/routes/staff-management/employees/[id].tsx` - use FormData for upload
- **Testing**: Verify CV upload works in the UI and existing tests pass
- **No schema changes**: PocketBase collection schema remains unchanged
