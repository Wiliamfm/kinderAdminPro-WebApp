## Why

The current employee creation flow generates a random temporary password and sends a "set your password" email, but the email delivery is unreliable and adds unnecessary friction. Admins should be able to set the professor's initial password directly when creating the employee, making the account immediately usable.

## What Changes

- Add `password` and `passwordConfirm` fields to the employee create modal in `staff-employees.tsx`.
- Validate the password on the client side matching PocketBase's conventions (min 8 chars, uppercase, lowercase, number, symbol).
- Pass the provided password to `createEmployeeUser` instead of generating a random one.
- Remove the post-creation email-sending step (`sendUserOnboardingEmails`) and the per-row "Reenviar invitación" button from the employee list.
- **BREAKING**: Remove `sendUserOnboardingEmails`, `resendUserOnboarding`, `sendPasswordSetupEmail`, and `buildTemporaryPassword` from `users.ts` — they are no longer needed.
- Remove the now-unused `auth-set-password.tsx` page and its route.

## Capabilities

### New Capabilities

- `employee-password-on-create`: Admin sets the professor's initial password directly in the create employee modal, replacing the email-based onboarding flow.

### Modified Capabilities

<!-- none — no existing spec-level behavior changes -->

## Impact

- `src/lib/pocketbase/users.ts`: `CreateEmployeeUserInput` gains a `password` field; several email-related exports removed.
- `src/pages/staff-employees.tsx`: Create form gains two password inputs; invite-related state/handlers removed.
- `src/pages/auth-set-password.tsx`: File deleted.
- `src/routes.ts`: `/auth/set-password` route removed.
- `src/pages/staff-employees.test.tsx`: Tests updated to cover new password fields and absence of email step.
- `src/lib/pocketbase/users.test.ts`: Tests updated for changed `createEmployeeUser` signature; removed email function tests.
