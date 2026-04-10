## 1. Backend Changes

- [x] 1.1 Add password fields to `PublicRegistrationInput` type in `public-registration.ts`
- [x] 1.2 Create function to create user account in `public-fathers.ts`
- [x] 1.3 Modify `submitPublicRegistration` to create user before father record
- [x] 1.4 Add rollback for user creation if father/student fails

## 2. Frontend Changes

- [x] 2.1 Add password field to `RegistrationForm` type in `register.tsx`
- [x] 2.2 Add passwordConfirm field to `RegistrationForm` type
- [x] 2.3 Add password validation rules (min 8 chars, must match)
- [x] 2.4 Add password and confirm fields to validated fields list
- [x] 2.5 Add password input fields to registration form UI
- [x] 2.6 Pass password to `submitPublicRegistration` call

## 3. Testing

- [x] 3.1 Add test for password mismatch validation
- [x] 3.2 Add test for password too short validation
- [x] 3.3 Add test for user creation during registration
