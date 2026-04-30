## ADDED Requirements

### Requirement: Analytics record includes note field
The `BulletinStudentAnalyticsRecord` type SHALL include a `note` field of type `number` representing the student's grade on a 1–10 scale.

#### Scenario: Record with valid note
- **WHEN** the analytics query fetches a `bulletins_students` record with `note = 7`
- **THEN** the resulting `BulletinStudentAnalyticsRecord` SHALL have `note` equal to `7`

#### Scenario: Record with non-numeric note
- **WHEN** the analytics query fetches a record where `note` is not a finite number
- **THEN** the record SHALL be mapped with `note` equal to `0`

### Requirement: Analytics record includes bulletin category name
The `BulletinStudentAnalyticsRecord` type SHALL include a `bulletin_id` field (string) and a `category_name` field (string) resolved from the bulletin's category relation.

#### Scenario: Record with valid bulletin and category
- **WHEN** the analytics query fetches a record with `bulletin_id` pointing to a bulletin whose `category_id.name` is `"Académico"`
- **THEN** the resulting record SHALL have `bulletin_id` set to the bulletin's ID and `category_name` equal to `"Académico"`

#### Scenario: Record with bulletin but no category name
- **WHEN** the analytics query fetches a record whose bulletin has no category or the category has no name
- **THEN** `category_name` SHALL be an empty string `""`

### Requirement: Analytics query fetches enriched fields
The `listBulletinStudentsAnalyticsRecords` function SHALL request `student_id`, `grade_id`, `semester_id`, `note`, and `bulletin_id` fields, and SHALL expand `bulletin_id.category_id` to resolve the category name.

#### Scenario: Query includes all required fields
- **WHEN** `listBulletinStudentsAnalyticsRecords` is called
- **THEN** the PocketBase query SHALL use `fields: 'student_id,grade_id,semester_id,note,bulletin_id'` and `expand: 'bulletin_id.category_id'`

### Requirement: Existing analytics filtering is preserved
Records SHALL still be filtered to exclude soft-deleted records (`is_deleted != true`) and SHALL still exclude records missing `student_id`, `grade_id`, or `semester_id`.

#### Scenario: Soft-deleted record excluded
- **WHEN** a `bulletins_students` record has `is_deleted = true`
- **THEN** it SHALL NOT appear in the analytics results

#### Scenario: Record missing grade_id excluded
- **WHEN** a record has an empty `grade_id`
- **THEN** it SHALL NOT appear in the analytics results

### Requirement: Existing chart consumers are unaffected
The existing chart computations (`gradeChartPoints`, `semesterChartPoints`, `yearChartPoints`) SHALL continue to produce identical output. They only use `student_id`, `grade_id`, and `semester_id` — the new fields SHALL be ignored by existing consumers.

#### Scenario: Grade chart output unchanged
- **WHEN** the enriched analytics data is loaded
- **THEN** `gradeChartPoints` SHALL produce the same labels and values as before the change
