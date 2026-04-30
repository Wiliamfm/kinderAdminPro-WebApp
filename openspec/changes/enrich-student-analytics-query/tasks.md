## 1. Extend the analytics type

- [ ] 1.1 Add `note` (number), `bulletin_id` (string), and `category_name` (string) fields to the `BulletinStudentAnalyticsRecord` type in `src/lib/pocketbase/bulletins-students.ts`

## 2. Update the analytics query

- [ ] 2.1 Update `listBulletinStudentsAnalyticsRecords` to include `note` and `bulletin_id` in the `fields` parameter
- [ ] 2.2 Add `expand: 'bulletin_id.category_id'` to the query options
- [ ] 2.3 Update the record mapping to extract `note` (coerced to number, fallback 0) and `category_name` (from expanded `bulletin_id.category_id.name`, fallback empty string) and `bulletin_id` (string)

## 3. Verify existing behavior

- [ ] 3.1 Run existing tests in `src/pages/reports-students.test.tsx` and confirm they pass without changes
- [ ] 3.2 Verify the grade chart and semester chart render identically (the new fields are ignored by existing consumers)
