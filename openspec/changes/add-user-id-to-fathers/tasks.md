## 1. Schema Changes

- [ ] 1.1 Add `user_id` relation field to `fathers` collection in PocketBase (relation to `users`, optional, single select)

## 2. TypeScript Type Updates

- [ ] 2.1 Add `userId` field to `FatherRecord` type in `src/lib/pocketbase/fathers.ts`
- [ ] 2.2 Add `userId` to `FatherCreateInput` type in `src/lib/pocketbase/fathers.ts`
- [ ] 2.3 Update `mapFatherRecord` to read and return `user_id` from the record
- [ ] 2.4 Update `mapFatherPayload` to include `user_id` in the create/update payload

## 3. Public Registration Flow Updates

- [ ] 3.1 Modify `publicCreateFather` in `src/lib/pocketbase/public-fathers.ts` to accept optional `userId` parameter
- [ ] 3.2 Update `publicCreateFather` to pass `user_id` in the PocketBase create payload
- [ ] 3.3 Modify `submitPublicRegistration` in `src/lib/pocketbase/public-registration.ts` to pass `createdUser.id` when calling `publicCreateFather`

## 4. Testing

- [ ] 4.1 Update `src/lib/pocketbase/fathers.test.ts` mock data to include `userId` field
- [ ] 4.2 Update `src/lib/pocketbase/public-fathers.test.ts` test assertions to verify `user_id` is set
- [ ] 4.3 Update `src/lib/pocketbase/public-submit-registration.test.ts` mock expectations
- [ ] 4.4 Run `bun run test` to verify all tests pass