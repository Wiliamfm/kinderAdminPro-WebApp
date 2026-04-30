## Why

The student reports analytics query currently only fetches `student_id`, `grade_id`, and `semester_id`. This limits the charts to showing student counts only. By including `note` and `bulletin_id` (with its category), we unlock note-based analytics (averages, distributions) and category breakdowns — data that KPI summary cards and richer interactive charts will depend on.

## What Changes

- Expand `listBulletinStudentsAnalyticsRecords()` to also fetch `note` and `bulletin_id` fields, with `bulletin_id.category_id` expansion for the category name.
- Extend the `BulletinStudentAnalyticsRecord` type to include `note` (number), `bulletin_id` (string), and `category_name` (string).
- Existing chart logic (students by grade, students by semester/year) remains unchanged — it continues using `student_id`, `grade_id`, `semester_id` as before.

## Capabilities

### New Capabilities
- `enriched-student-analytics`: Enriches the student analytics data layer with note and bulletin category fields, enabling downstream features like KPI cards, note distribution charts, and category breakdowns.

### Modified Capabilities

None. The existing charts are unaffected — they ignore the new fields.

## Impact

- **Code**: `src/lib/pocketbase/bulletins-students.ts` — the analytics fetcher and its return type.
- **Network**: Slightly larger payload per analytics record (adding a number and two strings per record). The `expand` parameter adds one join.
- **Downstream**: No UI changes in this proposal. Future proposals (#4 KPI cards, #5 interactivity) depend on this enriched data being available.
