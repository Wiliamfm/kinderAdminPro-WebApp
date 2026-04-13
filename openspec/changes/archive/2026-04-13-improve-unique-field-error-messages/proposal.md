## Why

Users see cryptic "No se pudo crear el registro Value must be unique" errors when submitting forms with duplicate unique fields (document_id, email, name). The error doesn't indicate which field caused the problem, leaving users confused about what to fix. This affects multiple collections: employees, students, fathers, grades, semesters, and bulletin categories.

## What Changes

- Add centralized unique field error detection in PocketBase wrapper functions
- Create helper function `isUniqueFieldError(error, fieldName)` to detect unique violations per field
- Add field-specific error messages in Spanish (e.g., "El documento ya está registrado", "El nombre ya existe")
- Apply to all create operations: employees, students, fathers, grades, semesters, bulletin categories
- Wrap create functions to parse field names from PocketBase response and provide contextual messages

## Capabilities

### New Capabilities

- `unique-field-error-handling`: Centralized error handling for unique field violations across all collections

### Modified Capabilities

- None - this is a cross-cutting improvement, not a change to feature requirements

## Impact

- **Affected files**: All `src/lib/pocketbase/*.ts` create functions
- **No breaking changes**: Just improves error messages
- **User-facing improvement**: Clear field-specific error messages instead of generic failure