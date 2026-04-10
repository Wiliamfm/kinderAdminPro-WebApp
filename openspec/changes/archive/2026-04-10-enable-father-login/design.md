## Context

Currently, the public registration flow (`/register`) creates records in three PocketBase collections:
- `fathers` - parent/guardian contact information
- `students` - student academic and health data  
- `students_fathers` - links student to parent

However, no user account is created in the `users` collection, so fathers cannot authenticate. The login page uses PocketBase's `users` collection with `authWithPassword()`.

## Goals / Non-Goals

**Goals:**
- Allow fathers to log in immediately after registering their child
- Use existing email from registration form as username
- Follow PocketBase conventions for password requirements

**Non-Goals:**
- Email verification is not required
- Password recovery/reset flow is not in scope
- Staff-triggered user creation (fathers create their own accounts)
- Separate approval step for login access

## Decisions

### 1. Create user account during registration

**Decision:** Add user creation to the public registration flow.

**Rationale:** The form already collects email and father details. Creating the user account at registration time gives fathers immediate access without requiring staff intervention.

**Alternative considered:** Staff creates user after enrollment approval. This would require additional admin UI and process steps. Simpler to auto-create during registration.

### 2. Password field in frontend form

**Decision:** Add two password fields (password + passwordConfirm) to registration form.

**Rationale:** PocketBase requires both fields for user creation. Need passwordConfirm to validate matching passwords.

### 3. User role assignment

**Decision:** Assign `father` role to created users.

**Rationale:** The system already has `'father'` defined in APP_ROLES. This role will be used for access control on parent-specific features.

**PocketBase user creation payload:**
```typescript
{
  email: father.email,
  name: father.full_name,
  password: <from form>,
  passwordConfirm: <from form>,
  roles: ['father'],
  is_admin: false
}
```

### 4. Transactional creation

**Decision:** Create user first, then father record, then student.

**Rationale:** If user creation fails, no rollback needed. If father creation fails, delete the user. The existing `public-registration.ts` already handles rollback for father/student.

## Risks / Trade-offs

- [Risk] Duplicate email → PocketBase will reject with a clear error. Validation in frontend should check format, uniqueness requires backend check.
  
  **Mitigation:** Show user-friendly error from PocketBase: "The email is already in use."

- [Risk] Password requirements unknown → PocketBase default requires 8+ characters.
  
  **Mitigation:** Add minimum length validation in frontend (8 characters) to avoid rejection.

- [Risk] User created but enrollment later rejected → Father can still log in even if student enrollment is denied.
  
  **Mitigation:** This is acceptable for now. If needed later, can add enrollment_status check to login or hide features.

## Migration Plan

1. Deploy updated frontend (register.tsx with password fields)
2. Deploy updated backend (public-registration.ts creates user)
3. No database migration needed - uses existing collections

**Rollback:** Revert both files. Existing fathers without user accounts remain unconnected.

## Open Questions

- Should there be a minimum password strength requirement beyond 8 characters?
- Do we need to handle the case where email already exists (offer login instead)?