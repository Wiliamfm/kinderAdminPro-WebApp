## Why

The application uses "semestre" (semester) to refer to academic periods, but the actual academic calendar uses trimesters (3-month periods). All user-facing text should reflect the correct terminology "trimestre" to avoid confusion.

## What Changes

- Replace all Spanish UI labels "semestre" → "trimestre" in page components
- Replace error messages containing "semestre" → "trimestre"
- Replace test assertions and strings "semestre" → "trimestre"
- **Keep internal types, PocketBase collections, and code identifiers unchanged** (e.g., `SemesterRecord`, `semesters` collection)

## Capabilities

### New Capabilities
<!-- No new capabilities - this is a terminology correction -->

### Modified Capabilities
<!-- No spec-level behavior changes - purely UI text updates -->

## Impact

- **UI Components**: ~30+ files in `src/routes/` and `src/pages/`
- **Test Files**: ~10 test files with semester-related strings
- **Error Messages**: `lib/pocketbase/leaves.ts` validation messages
- **Preserved**: TypeScript types, PocketBase schema, OpenSpec documentation