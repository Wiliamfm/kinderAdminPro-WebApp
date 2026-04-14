## Why

Currently, deleting a bulletin category is blocked whenever ANY bulletins exist for that category, including soft-deleted ones (is_deleted=true). This prevents deletion of categories that only have archived bulletins. The fix requires two changes: (1) count only active bulletins when checking for blocking, and (2) cascade hard delete related soft-deleted bulletins when the category is deleted.

## What Changes

- **Fix `countBulletinsByCategoryId`** to filter `is_deleted = false` so it only counts active, non-archived bulletins.
- **Add cascade delete** - when deleting a category with no active bulletins, first hard delete all soft-deleted bulletins for that category, then delete the category.
- **Update UI flow** in `enrollment-management/bulletins.tsx` to handle the cascade delete.

## Capabilities

### New Capabilities
Nothing new - this is a bug fix to existing behavior.

### Modified Capabilities
None - no spec-level behavior changes, just correcting implementation.

## Impact

- `src/lib/pocketbase/bulletin-categories.ts` - count function fix + new cascade delete function
- `src/routes/enrollment-management/bulletins.tsx` - UI flow update
- `src/lib/pocketbase/bulletin-categories.test.ts` - test updates for new filter and cascade behavior