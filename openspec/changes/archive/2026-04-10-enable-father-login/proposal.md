## Why

Currently, when a father registers their child through the public registration form, a record is created in the `fathers` collection but no user account is created in the `users` collection. This means fathers cannot log in to view their student's information. Enabling father login after registration will give parents immediate access to their child's academic updates, bulletins, and reports.

## What Changes

- Add password and passwordConfirm fields to the public registration form (`/register`)
- Modify public registration to create a user account in PocketBase `users` collection alongside the father record
- User accounts will be created with `father` role, allowing login via `/login`
- Fathers can log in immediately after registering (no approval waiting period for login)

## Capabilities

### New Capabilities

- `father-login`: Allow fathers who registered their child through public enrollment to log in using their email and a password. Uses the same email provided during registration as the username.

### Modified Capabilities

- `public-enrollment`: The public enrollment process will now create a user account in addition to the father record.

## Impact

- **Frontend**: Registration form (`register.tsx`) needs password fields added
- **Backend**: Public registration handler (`public-registration.ts`) needs to create user account
- **Database**: Uses existing `users` collection in PocketBase - no schema changes needed