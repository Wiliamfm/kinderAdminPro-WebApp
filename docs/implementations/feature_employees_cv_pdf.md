# Implementation Spec: Employee CV PDF Field

Last updated: 2026-03-01  
Status: Completed

## Summary
Add an optional `cv` file field to the PocketBase `employees` collection and expose it in employee create/edit forms.

The frontend must:
- accept only PDF files,
- enforce a maximum size of 10 MB,
- allow create/edit submissions without a CV,
- support CV replacement from the edit page,
- render a `CV` column in the employees table with a `Ver CV` download/open link when available.

## Important Interfaces Or Schema Changes

### PocketBase Collection Change
- Collection: `employees`
- New field: `cv`
  - type: `file`
  - single file (`maxSelect = 1`)
  - allowed MIME: `application/pdf`
  - max size: `10 MB`

### Frontend Type/API Changes
Update `src/lib/pocketbase/employees.ts`:
- `EmployeeRecord` adds:
  - `cvFileName: string`
  - `cvUrl: string | null`
- `EmployeeCreateInput` adds optional `cv?: File | null`
- `EmployeeUpdateInput` adds optional `cv?: File | null`
- `createEmployee` and `updateEmployee` send `FormData` when `cv` is provided.

## Implementation Plan
1. Update employees PocketBase wrapper to map `cv` and build `cvUrl`.
2. Implement conditional `FormData` payloads in employee create/update when CV is present.
3. Update create employee modal (`src/pages/staff-employees.tsx`):
- add optional CV file input,
- validate PDF and max size,
- pass file to `createEmployee`,
- reset file state/input on open/close/success.
4. Update employees table (`src/pages/staff-employees.tsx`):
- add `CV` column,
- render `Ver CV` link when `cvUrl` exists,
- render `—` when absent.
5. Update employee edit page (`src/pages/staff-employee-edit.tsx`):
- show current CV link,
- add optional replacement file input,
- validate PDF and max size,
- include file in `updateEmployee` payload when selected.
6. Extend tests for wrapper and pages with CV success/failure scenarios.
7. Update architecture and overview docs to include the CV workflow.

## Test Cases And Scenarios

### Data Layer Tests
- map `cv` to `cvFileName` and `cvUrl` in employee records.
- create without CV uses JSON payload.
- create with CV uses `FormData` and includes `cv` file.
- update without CV uses JSON payload.
- update with CV uses `FormData` and includes `cv` file.

### UI Tests
- create modal accepts valid optional PDF CV.
- create modal blocks non-PDF CV.
- create modal blocks PDF larger than 10 MB.
- employees table shows `Ver CV` link when CV exists.
- edit page shows current CV link.
- edit page replacement accepts valid PDF.
- edit page replacement blocks invalid type/size.

### Validation Commands
- `bun run test`
- `bun run build`

## Assumptions And Defaults
- CV is optional in create and edit forms.
- Edit behavior is replace-only; no explicit remove/clear CV action.
- PocketBase rules remain unchanged (existing employee access model applies).
- Backend schema migration/configuration is applied outside this frontend repository.
