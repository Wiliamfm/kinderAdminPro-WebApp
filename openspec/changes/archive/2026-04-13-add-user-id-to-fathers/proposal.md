## Why

When a father registers through the public `/register` route, a `users` record is created with role `father`, and a `fathers` record is created separately. However, there is no link between them - the `fathers` collection lacks a `user_id` relation field. This prevents querying which father owns a user account, building a father portal with access control, or enforcing that a father can only see their own students.

## What Changes

- Add `user_id` relation field to the `fathers` collection in PocketBase schema
- Update TypeScript types in `src/lib/pocketbase/fathers.ts` to include `userId`
- Modify `publicCreateFather` in `src/lib/pocketbase/public-fathers.ts` to accept and set `user_id`
- Update `submitPublicRegistration` in `src/lib/pocketbase/public-registration.ts` to pass the created user's ID when creating the father record
- Update `mapFatherRecord` to read and return the `user_id` field

## Capabilities

### New Capabilities
- `father-user-link`: Establishes a permanent link between father records and their user accounts, enabling user-based access control and query paths

### Modified Capabilities
- (none - this is an internal data model change that doesn't change behavior)

## Impact

- **Schema**: `fathers` collection gains new `user_id` relation field
- **API**: `FatherRecord` and `FatherCreateInput` types updated in `fathers.ts`
- **Public registration flow**: `public-fathers.ts` and `public-registration.ts` modified
- **Tests**: Update test mocks and assertions to include `user_id`