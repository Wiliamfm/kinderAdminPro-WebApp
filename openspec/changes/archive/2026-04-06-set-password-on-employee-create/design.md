## Context

Employee accounts are created in `staff-employees.tsx` by calling `createEmployeeUser(email, name)`, which internally generates a random temporary password and then sends a password-reset email via `sendUserOnboardingEmails`. The professor then clicks the email link to reach `/auth/set-password` and set their real password.

This email-based flow is being replaced: the admin sets the password directly in the create form, and the account is immediately usable.

## Goals / Non-Goals

**Goals:**
- Admin provides `password` + `passwordConfirm` in the create employee modal.
- Client-side validation matches PocketBase password conventions (min 8 chars, uppercase, lowercase, number, symbol) — reusing the existing `isStrongPassword` logic from `auth-set-password.tsx`.
- `createEmployeeUser` accepts the password from the caller instead of generating one internally.
- All email-related code paths (send, resend) are deleted.
- `auth-set-password.tsx` and its route are deleted.

**Non-Goals:**
- Changing the password after creation (that's the existing edit flow or PocketBase admin panel).
- Adding password strength meters or progressive disclosure UI.
- Migrating or re-sending invitations to existing employees.

## Decisions

### Extract `isStrongPassword` to a shared utility
`isStrongPassword` currently lives inline in `auth-set-password.tsx`. Since that file will be deleted, extract it to `src/lib/forms/password-validation.ts` and import it in both the employee create form and the existing test helper.

**Alternatives considered:**
- Duplicate the function in `staff-employees.tsx` — rejected, DRY matters and it's non-trivial logic.
- Rely solely on PocketBase server-side rejection — rejected, poor UX without client-side feedback.

### Password added to `CreateEmployeeUserInput`, not a separate function
The password is passed into the existing `createEmployeeUser` function as a new required field rather than creating a separate `createEmployeeUserWithPassword` variant.

**Alternatives considered:**
- Keep two overloads — rejected, the random-password path is being fully removed so there's no reason to keep it.

### Delete rather than deprecate email functions
`sendUserOnboardingEmails`, `resendUserOnboarding`, `sendPasswordSetupEmail`, and `buildTemporaryPassword` are removed entirely from `users.ts`.

**Rationale:** No other call site uses them. Keeping dead exports creates confusion.

## Risks / Trade-offs

- [Admin knows initial password] → Acceptable for this system; professors are expected to change their password after first login (no enforcement, but common practice).
- [Existing employees with unset passwords] → Not affected; this change only touches the create flow. Existing accounts remain as-is.
- [Deleting `auth-set-password.tsx`] → Any bookmarked or shared `/auth/set-password` links will 404. Acceptable since the page is only reached via an email link that is no longer sent.

## Migration Plan

1. Deploy the frontend change — new employees get a real password at creation.
2. No backend migration needed; PocketBase already accepts any compliant password at user creation.
3. No rollback concern — existing employee accounts are unaffected.
