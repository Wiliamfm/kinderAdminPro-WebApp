## Context

The student reports page (`src/routes/reports/students.tsx`) has an analytics section with two bar charts showing unique student counts by grade and by semester. The data comes from `listBulletinStudentsAnalyticsRecords()` in `src/lib/pocketbase/bulletins-students.ts`, which queries the `bulletins_students` PocketBase collection but only selects three fields: `student_id`, `grade_id`, `semester_id`.

The backend collection also stores `note` (integer 1–10), `bulletin_id` (relation to `bulletins`, which has a `category_id` relation), `comments`, and audit fields. The `note` and bulletin category data are already available on the backend — they just aren't fetched by the analytics query.

## Goals / Non-Goals

**Goals:**
- Expand the analytics query to include `note` and `bulletin_id` (with category name via expansion)
- Extend `BulletinStudentAnalyticsRecord` type to carry these new fields
- Maintain backward compatibility — existing chart logic must not break

**Non-Goals:**
- Adding new charts or UI components (future proposals #4 and #5)
- Changing the table data query (`listBulletinsStudentsPage`)
- Modifying any filtering, sorting, or CRUD logic
- Performance optimization of the query itself

## Decisions

### Expand the `fields` parameter and add `expand`

**Choice:** Add `note` and `bulletin_id` to the `fields` selection, and add `expand: 'bulletin_id.category_id'` to resolve the category name in a single request.

**Alternative considered:** Fetch `bulletin_id` without expansion, then resolve category names client-side using `formOptions().bulletins`. Rejected because the form options already include bulletin labels (which combine category + description), but not the raw category name separately. Adding the expand keeps the data self-contained and avoids coupling the analytics to the form options load state.

### Extract category name during mapping

**Choice:** Extract `category_name` from the expanded `bulletin_id.category_id.name` path in the mapping function, using the same `getExpandedRecord` + `toStringValue` helpers already used by `mapBulletinStudentRecord`.

**Alternative considered:** Return the raw `bulletin_id` and let consumers resolve names. Rejected because downstream consumers (KPI cards, charts) would all need the same resolution logic — better to normalize once at the data layer.

### Keep note as a number, not a string union

**Choice:** Map `note` to a strict `number` type in the analytics record using `toNumberValue`, falling back to `0` for invalid/missing values (which the filter already excludes).

The existing `toNumberValue` returns `number | string`. For analytics, we want a strict number. We'll use a small inline coercion: `typeof mapped === 'number' ? mapped : 0`.

## Risks / Trade-offs

**Increased payload size** → Each analytics record grows from ~3 string fields to 3 strings + 1 number + 1 string (category name). For a school with ~500 bulletin-student records, this adds roughly 5–10 KB. Negligible.

**Expand adds a JOIN** → The `bulletin_id.category_id` expand requires PocketBase to resolve two relations per record. This is the same expand pattern already used by the paginated list query, so PocketBase handles it well. The analytics query uses `getFullList` (no pagination), so it's one request regardless.

**Backward compatibility** → Adding fields to the type is non-breaking. Existing chart memos only destructure `student_id`, `grade_id`, `semester_id` — the extra fields are ignored until new consumers use them.
