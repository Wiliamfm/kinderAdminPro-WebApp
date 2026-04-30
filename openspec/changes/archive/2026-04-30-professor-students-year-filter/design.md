## Context

The professor student detail page (`/professor/students/[id]`) currently fetches all bulletin student entries for a student+grade combination and splits them into a current-semester editable table and a collapsed history section. There is no way to filter by year, so the history section grows indefinitely.

The reports page already implements year-based filtering using `deriveYearsFromDateRange` from `bulletins-students.ts` and `listSemesterOptions` from `semesters.ts`. We will reuse these utilities.

## Goals / Non-Goals

**Goals:**
- Add a year select box that filters visible bulletin student entries
- Default to the current semester's year
- Preserve the existing editable behavior when viewing the current year
- Show a single read-only table when viewing a past year

**Non-Goals:**
- Server-side year filtering (client-side filtering is sufficient for single-student data)
- Changing the data model or API
- Modifying the professor students list page

## Decisions

### 1. Derive years from all semesters, not from student entries

**Choice**: Use `listSemesterOptions()` to get all semesters, then `deriveYearsFromDateRange` to extract years.

**Why**: Shows years even when the student has no entries yet (e.g., current year with no grades entered). The reports page already uses this pattern.

**Alternative**: Derive years only from the student's existing entries — rejected because it would hide the current year if no grades have been entered yet.

### 2. Two display modes based on year selection

**Choice**: When the selected year contains the current semester, render the existing two-section layout (editable main table + collapsible history). When it doesn't, render a single flat read-only table with a "Trimestre" column.

**Why**: The editable table only makes sense in the context of the current semester. For past years, a flat view with semester labels is simpler and avoids an empty "current" section.

### 3. Client-side filtering via memos

**Choice**: Continue fetching all entries with `listBulletinStudentsByStudentAndGrade`, filter in SolidJS memos based on selected year.

**Why**: A single student's bulletin entries are small (dozens of records across all years). No performance concern, and avoids adding new API endpoints.

### 4. Year select placement

**Choice**: Place the year select box between the student info card and the bulletin table, aligned with the existing layout.

**Why**: Consistent with the reports page pattern and provides clear visual hierarchy.

## Risks / Trade-offs

- [Client-side filtering with many years of data] → Acceptable for single-student scope; revisit if performance becomes an issue
- [Year select showing years with no student data] → Mitigated by showing dash entries, making it clear there's no data for that year
