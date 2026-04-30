## 1. Data Layer

- [x] 1.1 Import `listSemesterOptions` and `deriveYearsFromDateRange` into `[id].tsx`
- [x] 1.2 Add `createResource` for `listSemesterOptions()` to fetch all semesters
- [x] 1.3 Create a memo that derives year options from all semesters (descending order) using `deriveYearsFromDateRange`
- [x] 1.4 Add `selectedYear` signal, defaulting to the current semester's year (or most recent year if no current semester)

## 2. Filtering Logic

- [x] 2.1 Create a memo that maps each semester to its years, so we can filter entries by selected year
- [x] 2.2 Create a memo `isCurrentYearSelected` that checks if the selected year contains the current semester
- [x] 2.3 Update `currentEntryByBulletinId` memo to also consider the selected year
- [x] 2.4 Update `historyEntries` memo to filter by selected year (excluding current semester when applicable)
- [x] 2.5 Create a memo `allYearEntries` for the past-year flat table (all entries from selected year's semesters)

## 3. UI Components

- [x] 3.1 Add year select box between the student info card and the bulletin table
- [x] 3.2 Implement current-year display mode (existing layout with editable table + collapsible history)
- [x] 3.3 Implement past-year display mode (single flat read-only table with Trimestre column)
- [x] 3.4 Show empty state message when past year has no entries
- [x] 3.5 Disable edit/add buttons when selected year does not include the current semester
