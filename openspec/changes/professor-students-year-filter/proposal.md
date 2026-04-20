## Why

The professor student detail page currently shows all bulletin entries at once, splitting them into "current semester" and a collapsed "history" section. As data grows across years, the history section becomes unwieldy. Professors need a way to view student performance for a specific school year without scrolling through all historical data.

## What Changes

- Add a year select box to the professor student detail page (`/professor/students/[id]`)
- Year options are derived from all semesters in the system (using `deriveYearsFromDateRange`)
- Default selected year is the current semester's year
- When the selected year includes the current semester: page behaves as today (editable main table + collapsible history for other semesters in that year)
- When the selected year does NOT include the current semester: show a single read-only table with all entries from that year's semesters, with a "Trimestre" column. No edit/add buttons
- Entries are still fetched client-side (all at once), filtered in memos by selected year

## Capabilities

### New Capabilities
- `year-filter`: Year-based filtering of bulletin student entries on the professor student detail page, with two distinct display modes depending on whether the selected year contains the current semester

### Modified Capabilities

## Impact

- UI: `src/routes/professor/students/[id].tsx` — new year select, conditional rendering of two table layouts
- Data: `src/lib/pocketbase/semesters.ts` — need to use `listSemesterOptions()` to derive available years
- Data: `src/lib/pocketbase/bulletins-students.ts` — reuse `deriveYearsFromDateRange` utility
