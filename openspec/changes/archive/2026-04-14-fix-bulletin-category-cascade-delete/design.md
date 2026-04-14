## Context

Bulletin categories can be deleted from `bulletin_categories` collection. Each bulletin has a `category_id` relation to this collection. Bulletins use soft delete (`is_deleted` field), but category deletion checks count ALL bulletins regardless of delete status. This causes categories with only archived (soft-deleted) bulletins to be undeletable.

Current flow:
1. User clicks delete on category
2. `countBulletinsByCategoryId` queries WITHOUT `is_deleted` filter → counts ALL bulletins
3. If count > 0, block deletion with error

## Goals / Non-Goals

**Goals:**
- Allow category deletion when only archived (soft-deleted) bulletins exist
- Cascade hard delete related bulletins when category is deleted
- Fix count query to filter active bulletins only

**Non-Goals:**
- No changes to other delete patterns (e.g., grades, semesters)
- No changes to frontend UI beyond the deletion flow

## Decisions

1. **Filter approach for count**: Add `is_deleted = false` to the existing filter string in `countBulletinsByCategoryId`. Could also use relation filter in PocketBase, but filter string is simpler and consistent with existing code.

2. **Cascade delete location**: Add new function `deleteBulletinsByCategoryId` in `bulletin-categories.ts` that:
   - Queries all bulletins for category (including deleted ones)
   - Hard deletes each via PocketBase API
   - Then deletes the category

3. **UI flow**: In `enrollment-management/bulletins.tsx`, after count check passes, call cascade delete function instead of just deleting category.

## Risks / Trade-offs

- **Risk**: None. This is a straightforward fix with no side effects.
- **Trade-off**: None significant - cascade delete is implicit expected behavior.

## Migration Plan

No migration needed - this is a bug fix. Deploy with normal release.

## Open Questions

None - implementation is straightforward.