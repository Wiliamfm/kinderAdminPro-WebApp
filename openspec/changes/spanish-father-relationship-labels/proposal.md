## Why

The father/student relationship dropdown currently displays English labels (`father`, `mother`, `other`) in the UI. Since the application is entirely in Spanish, these labels should display in Spanish for consistency and better UX.

## What Changes

- Update relationship dropdown labels in student edit form to show Spanish labels while keeping English values in the database
- Update relationship dropdown labels in tutors create form
- Update relationship dropdown labels in tutor edit form
- Update the "father names" column header in student list to Spanish

## Capabilities

### New Capabilities
None - this is a UI localization change only.

### Modified Capabilities
None - no requirement changes, only labeling changes.

## Impact

Three UI components:
- `src/routes/enrollment-management/students/[id].tsx` - Student edit form
- `src/routes/enrollment-management/tutors.tsx` - Tutors create form
- `src/routes/enrollment-management/tutors/[id].tsx` - Tutor edit form

Plus column in:
- `src/routes/enrollment-management/students.tsx` - Student list table