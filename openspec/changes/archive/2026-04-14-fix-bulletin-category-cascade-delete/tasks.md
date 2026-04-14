## 1. Fix count query in bulletin-categories.ts

- [x] 1.1 Update `countBulletinsByCategoryId` to filter `is_deleted = false` in the query

## 2. Add cascade delete in bulletin-categories.ts

- [x] 2.1 Create new `deleteBulletinsByCategoryId` function that hard deletes all bulletins for a category
- [x] 2.2 Update `deleteBulletinCategory` to use cascade delete automatically

## 3. Update UI flow in bulletins.tsx

- [x] 3.1 Update `confirmDeleteCategory` to call cascade delete instead of just `deleteBulletinCategory`

## 4. Update tests

- [x] 4.1 Update `bulletin-categories.test.ts` for new filter behavior
- [x] 4.2 Add tests for cascade delete function
