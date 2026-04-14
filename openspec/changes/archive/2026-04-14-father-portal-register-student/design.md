## Context

Fathers access the system via `/father-portal` after logging in. Currently, to add a new student, they must use the public `/register` route which creates a duplicate user account. The goal is to add this capability directly in the father portal.

## Goals / Non-Goals

**Goals:**
- Allow logged-in fathers to register new students linked to their account
- Reuse existing student form fields and validation from `/register`
- Create student in "Pendiente" status (same as public registration)
- Validate document_id uniqueness on blur before submit

**Non-Goals:**
- Modify the public registration flow (must remain functional)
- Add admin approval workflow (handled by existing enrollment requests)
- Allow fathers to edit/update existing student records (future enhancement)

## Decisions

### 1. Modal vs Full-Screen
**Decision**: Use modal (responsive, same as other modals in the app)

**Rationale**: Simpler to implement, maintains context, consistent with existing patterns like event preview modal.

### 2. Form Structure
**Decision**: Only show student fields + relationship selector

- Hide all father input fields (read from logged-in user)
- Show relationship dropdown (father/mother/other) to let father specify their relationship to new student
- Default relationship to "father" if already linked as father

**Rationale**: Father already exists in system, no need to duplicate that data. Form mirrors public registration's student section.

### 3. API Function Location
**Decision**: Create `src/lib/pocketbase/father-register-student.ts`

**Rationale**: 
- Separates concerns from father-portal.ts
- Can be tested independently
- Follows existing pattern: `public-registration.ts` for public, `father-register-student.ts` for authenticated

### 4. Duplicate Document Validation
**Decision**: Validate on blur, call existing check or create simple one

**Rationale**: Better UX than waiting for submit error. Can reuse existing uniqueness error handling.

### 5. Success Flow
**Decision**: Close modal, show success message, refresh student list

**Rationale**: Matches `/register` behavior - student appears in list with "Pendiente" status.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Father tries to register student that already exists (belongs to another family) | Show clear error message "Ya existe un estudiante con este documento" |
| Form validation mismatch with public registration | Reuse validation functions and field definitions from register.tsx |
| Race condition on document_id check | Rely on PocketBase unique constraint, handle error on submit as fallback |

## Migration Plan

1. Deploy API function first (server-side)
2. Deploy UI changes (button + modal)
3. No database migration needed (student table already exists with unique document_id)
4. Rollback: Revert to using public registration form

## Open Questions

None at this time. All requirements are clear from the proposal phase.
