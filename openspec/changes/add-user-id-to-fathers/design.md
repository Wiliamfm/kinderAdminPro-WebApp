## Context

Currently, when a father registers via the public `/register` route, the system creates two independent records:
- A `users` record with `role = father` for authentication
- A `fathers` record for storing parent/tutor data

These two records are not linked. The `fathers` collection has no relation to `users`, unlike the `employees` collection which explicitly links to users via `user_id`.

This design addresses adding that missing relationship.

## Goals / Non-Goals

**Goals:**
- Add `user_id` relation field to `fathers` collection
- Link father record to user account during public registration
- Enable user-based access control queries (e.g., "get father for authenticated user")
- Maintain backward compatibility with existing data

**Non-Goals:**
- Building a father portal UI (future work)
- Changing authentication flow
- Modifying existing father edit/create workflows in admin UI

## Decisions

### 1. Schema Field Type
**Decision**: Use PocketBase relation field pointing to `users` collection.

**Rationale**: Follows the same pattern as `employees.user_id`. Allows:
- Cascade delete behavior (optional: consider `nullify` to preserve father if user is deleted)
- Direct relation queries in PocketBase
- Type safety in TypeScript

### 2. Backward Compatibility
**Decision**: Make the `user_id` field optional in both schema and TypeScript types.

**Rationale**: Existing father records in the database won't have this field populated. Optional relation allows:
- Reading existing data without migration
- Gradual backfill if needed later

### 3. Public Registration Flow Update
**Decision**: Pass `createdUser.id` to `publicCreateFather` and set `user_id` in the create payload.

**Rationale**: The registration flow already has the user ID available right after user creation. Simple modification to wire the two operations together.

### 4. TypeScript Types
**Decision**: Add `userId` field to `FatherRecord` and `FatherCreateInput`.

**Rationale**: Mirrors the pattern in `employees.ts` where `userId` is exposed for the relation.

## Risks / Trade-offs

- **[Risk] Schema migration** → Test on staging first, ensure production data migration doesn't break
- **[Risk] Existing father records** → Leave field optional, no backfill required for this change
- **[Risk] Query performance** → Relation queries are well-supported by PocketBase indexes

## Migration Plan

1. Add `user_id` field to `fathers` collection in PocketBase admin (relation to `users`, optional, single select)
2. Deploy code changes (types and public registration flow)
3. Test public registration flow end-to-end
4. Verify father records created after change have `user_id` populated