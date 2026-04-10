## Context

Public enrollment registration page for anonymous users to submit student enrollment requests. The system already has an internal workflow for reviewing pending requests at `/enrollment-management/requests` that filters for `active=true && accepted=false`. This change creates the public-facing entry point.

### Current State
- Students created via admin interface at `src/routes/enrollment-management/students/[id].tsx`
- Admin reviews pending requests at `src/routes/enrollment-management/requests.tsx`
- Existing PocketBase functions: `createStudent()`, `createFather()`, `createStudentFatherLink()`

### Constraints
- No authentication required (public route)
- Reuse existing student/father field structure
- Must integrate with existing enrollment request review workflow

## Goals / Non-Goals

**Goals:**
- Add public `/register` route accessible without auth
- Student form with: name, grade, date of birth, birth place, department, document_id, weight, height, blood_type, social_security, allergies
- Father form with: full_name, document_id, phone_number, occupation, company, email, address, relationship (father/mother/other)
- On submit: create father (is_active=true), create student (active=true, accepted=false), link them
- Display "Tu solicitud está pendiente de aprobación" on success

**Non-Goals:**
- No authentication or access codes
- No rate limiting or captcha (per explicit request)
- No email confirmation or notifications
- No multi-student registration (one student per submission)

## Decisions

### 1. Route Authentication
**Decision**: Route excluded from auth guard in `app.tsx` (like `/login`)

**Rationale**: Simpler than creating a separate auth guard or public-only wrapper. The existing pattern for public routes is already established.

### 2. PocketBase Client for Public Operations
**Decision**: Create new public PocketBase client functions without authentication

**Rationale**: Server functions in `src/lib/pocketbase/*` use `getAuthenticatedPb()` which requires auth. Need a public wrapper using `new PocketBase()` with no auth token for create operations.

**Alternative considered**: Use existing server functions with a service account - rejected because it would create a privileged user that bypasses normal access controls.

### 3. Form Structure
**Decision**: Single form with two sections (Student + Father), single submit button

**Rationale**: Matches existing edit form pattern. Sequential flow (student info → father info) is intuitive. Single submit ensures atomic-like creation.

### 4. Grade Selection
**Decision**: Fetch active grades list from PocketBase on mount

**Rationale**: User must select a grade for the student. Only show grades that are active. Handle loading/error states appropriately.

### 5. Error Handling
**Decision**: Display field-level validation errors inline, form-level errors in alert box

**Rationale**: Matches existing pattern in `src/routes/enrollment-management/students/[id].tsx`. Reuse `validateStudentForm()` with appropriate field list.

## Risks / Trade-offs

- **[Risk] Duplicate document_id**: PocketBase will reject duplicate unique field
  - **Mitigation**: Show error message from PocketBase, allow user to correct

- **[Risk] Invalid grade selection**: User could manipulate form to submit invalid grade_id
  - **Mitigation**: Validate grade_id against active grades list before submit

- **[Risk] Father-student link race condition**: If link creation fails after student/father created
  - **Mitigation**: Wrap in try-catch, if link fails, attempt to rollback student and father creation (best effort)

- **[Risk] Form data loss on validation error**: User loses entered data
  - **Mitigation**: Maintain form state in signal, show all errors at once on submit attempt

## Open Questions

- Should the father be created as inactive until enrollment is accepted? (Currently proposed as active=true to match existing createFather behavior)
- Is there a need to allow adding multiple tutors in the future? (Current scope: single father per submission)