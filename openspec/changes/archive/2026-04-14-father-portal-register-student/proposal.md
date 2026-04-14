## Why

Fathers currently need to use the public registration form (/register) to add new students, which creates an unnecessary user account even though they're already logged in. This adds complexity and duplicates functionality.

## What Changes

- Add "Registrar nuevo estudiante" button to father-portal page
- Open modal with student registration form
- Create new API function to register student linked to existing logged-in father (no user account creation)
- Validate student document_id uniqueness on blur
- Show UI error if document_id already exists
- On success: close modal, show success message, refresh student list

## Capabilities

### New Capabilities
- `father-student-registration`: Allow logged-in fathers to register new students linked to their account without creating a new user

### Modified Capabilities
- None (existing public registration flow remains unchanged)

## Impact

- New file: `src/lib/pocketbase/father-register-student.ts` (API function)
- Modified: `src/routes/father-portal.tsx` (add button and modal)
- Reuses: Student form fields and validation from `/register` route
- Reuses: `publicCreateStudent` function logic
- New: `students_fathers` link creation with father's ID
