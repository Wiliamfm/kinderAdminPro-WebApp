## Context

Currently, PocketBase create operations return generic "Value must be unique" errors without specifying which field caused the violation. The frontend shows these cryptic messages to users, making it difficult to correct duplicate entries.

The codebase already handles email uniqueness in `public-fathers.ts:63-70,91-92` using a specific check:
```typescript
function isEmailAlreadyInUseError(error: ClientResponseError): boolean {
  const emailMessage = error.response?.data?.email?.message;
  return typeof emailMessage === 'string' 
    && emailMessage.toLowerCase().includes('already in use');
}
```

## Goals / Non-Goals

**Goals:**
- Create reusable helper to detect unique field violations by field name
- Apply to all create operations across collections with unique fields
- Provide Spanish localized error messages indicating which field is duplicated

**Non-Goals:**
- Modify PocketBase schema or add new unique constraints
- Change existing form validation logic
- Add uniqueness pre-checks before create operations

## Decisions

### 1. Centralized error detection helper
**Decision**: Create `isUniqueFieldError(error, fieldName)` in `errors.ts`

**Rationale**: Following the existing pattern in `public-fathers.ts` but making it reusable for any field. This keeps error handling consistent across all collections.

**Alternative considered**: Pre-check uniqueness by querying before create - rejected because it adds extra API calls and introduces race conditions.

### 2. Field label mapping
**Decision**: Create `getUniqueFieldLabel(fieldName)` mapping function in `errors.ts`

**Rationale**: Provides consistent Spanish labels across all error messages:
- `document_id` → "documento"
- `name` → "nombre"
- `email` → "correo electrónico"

### 3. Where to apply validation
**Decision**: Apply in each create function in pocketbase wrappers, not in frontend

**Rationale**: The user suggested - error handling should be centralized in the pocketbase library layer. The frontend should just display the cleaned error message. This ensures all callers (staff pages, public registration, API routes) get consistent behavior.

### 4. Collection to unique field mapping

| Collection | Unique Fields | Wrapper File |
|------------|--------------|--------------|
| `employees` | `document_id` | `employees.ts` |
| `students` | `document_id` | `public-students.ts` |
| `fathers` | `document_id` | `public-fathers.ts` |
| `users` | `email` | `public-fathers.ts` (already done) |
| `grades` | `name` | `grades.ts` |
| `semesters` | `name` | `semesters.ts` |
| `bulletin_categories` | `name` | `bulletin-categories.ts` |

## Risks / Trade-offs

- **[Risk] PocketBase error format changes**: Future PocketBase versions might change the error response format.
  - **Mitigation**: Use defensive checks with `typeof` and fall back to generic message if parsing fails.

- **[Risk] Missing unique fields**: Some collections might have additional unique fields not listed.
  - **Mitigation**: Add new fields to the mapping as they're discovered.

- **[Trade-off] Error message translation**: The field labels are hardcoded in Spanish.
  - **Acceptable**: The app is Spanish-only, so this is appropriate.

## Migration Plan

1. Add helper functions to `src/lib/pocketbase/errors.ts`
2. Update each create function to catch unique field errors
3. Run existing tests to verify no regressions
4. No database changes needed - this is purely error handling

## Open Questions

- Should `update` operations also handle unique field conflicts? (e.g., renaming a grade to an existing name) - likely yes, but scope creep for now.
- Should we also improve the frontend to highlight the specific field with the error? That's a separate improvement.