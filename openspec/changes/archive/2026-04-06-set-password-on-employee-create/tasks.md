## 1. Shared Password Validation Utility

- [x] 1.1 Create `src/lib/forms/password-validation.ts` exporting `isStrongPassword(value: string): boolean` (min 8 chars, uppercase, lowercase, number, symbol) — extracted from `auth-set-password.tsx`.

## 2. Data Layer — users.ts

- [x] 2.1 Add `password: string` to `CreateEmployeeUserInput` type in `src/lib/pocketbase/users.ts`.
- [x] 2.2 Update `createEmployeeUser` to use `payload.password` instead of calling `buildTemporaryPassword()`.
- [x] 2.3 Remove `buildTemporaryPassword`, `sendPasswordSetupEmail`, `sendUserOnboardingEmails`, and `resendUserOnboarding` from `src/lib/pocketbase/users.ts`.

## 3. UI — Employee Create Modal

- [x] 3.1 Add `password` and `passwordConfirm` to `EmployeeCreateForm` type and `emptyCreateEmployeeForm` in `src/pages/staff-employees.tsx`.
- [x] 3.2 Add `'password'` and `'passwordConfirm'` to `CREATE_EMPLOYEE_FIELDS` and update `validateCreateEmployeeForm` to validate both fields using `isStrongPassword` and matching check.
- [x] 3.3 Add the two password `<input type="password">` fields to the create employee modal JSX with real-time inline error display (matching the pattern of other fields in the form).
- [x] 3.4 Pass `password: createForm().password` to `createEmployeeUser` in `submitCreateEmployee`.
- [x] 3.5 Remove the `sendUserOnboardingEmails` call, `setInviteNotice`, `setCreateInviteWarning`, and related state from `submitCreateEmployee`.

## 4. UI — Remove Resend Invitation

- [x] 4.1 Remove `resendInvite` handler, `resendBusyEmployeeId` signal, and `inviteNotice` signal from `staff-employees.tsx`.
- [x] 4.2 Remove the "Reenviar invitación" button from the employee list row actions in the JSX.
- [x] 4.3 Remove the `inviteNotice` banner from the page JSX.
- [x] 4.4 Remove `resendUserOnboarding` and `sendUserOnboardingEmails` from the import in `staff-employees.tsx`.

## 5. Remove Password Setup Page

- [x] 5.1 Delete `src/pages/auth-set-password.tsx`.
- [x] 5.2 Remove the `/auth/set-password` route and its import from `src/routes.ts`.

## 6. Tests

- [x] 6.1 Update `src/lib/pocketbase/users.test.ts`: update `createEmployeeUser` test to pass a password and assert it is sent to PocketBase; remove tests for deleted email functions.
- [x] 6.2 Update `src/pages/staff-employees.test.tsx`: add password fields to create employee fixture data; assert no onboarding email call after successful create; assert resend button is absent.
- [x] 6.3 Run `bun run test` and `bun run build` to confirm no regressions.
