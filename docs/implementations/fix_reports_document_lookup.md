# Reports Document Lookup Migration

Last updated: 2026-03-07
Status: Completed

## Summary
Switch specific-entity lookup in reports to use document ID values instead of names.

Scope includes:
- student reports lookup by `students.document_id`,
- employee reports lookup by `employees.document_id`,
- employee schema/form updates so `employees.document_id` exists and is required.

Out of scope:
- replacing report table name columns,
- changing report record relations (`student_id`, `employee_id`, etc.).

## Important Interfaces Or Schema Changes
- `employees` collection:
  - required `document_id` field,
  - numeric-only validation,
  - length range `4-20`,
  - unique constraint.
- `src/lib/pocketbase/employees.ts`:
  - `EmployeeRecord.documentId` added,
  - `EmployeeCreateInput.documentId` added,
  - `EmployeeUpdateInput.documentId` added,
  - payload mapping includes `document_id`.
- report option payloads (`bulletins-students`, `employee-reports`):
  - student/employee options include `documentId`,
  - lookup labels use `document_id (name)`.

## Implementation Plan
1. Add `document_id` support across employee wrappers and create/edit employee pages.
2. Update student report lookup filters to query only `student_id.document_id`.
3. Update employee report lookup filters to query only `employee_id.document_id`.
4. Update report lookup UX copy to clarify document-based search.
5. Update unit/UI tests to reflect document-based lookup values and new employee document validation.
6. Update architecture/overview docs with document-based filtering and employee document constraints.

## Test Cases And Scenarios
- Employee create/edit rejects invalid document ID values and accepts numeric values in the configured range.
- Student reports specific lookup accepts document-based values and resolves exact selected IDs.
- Employee reports specific lookup accepts document-based values and resolves exact selected IDs.
- Data-layer tests assert query clauses use `student_id.document_id` / `employee_id.document_id`.
- Data-layer tests assert employee payloads include `document_id`.

## Assumptions And Defaults
- Report lookup remains exact-ID filtering after selection (no fuzzy server filtering by selected list).
- Suggestion labels follow `document_id (name)` for readability.
- Document ID is treated as a numeric string; formatting separators are not allowed.
