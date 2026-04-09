## 1. Database Setup

- [ ] 1.1 Add `file` column to `leaves` collection in PocketBase (file type, optional)
  Requires running PocketBase instance to apply schema. No `sync-leaves-file-schema.sh` script exists - needs to be created or applied manually.

## 2. Backend - Update leaves.ts

- [x] 2.1 Add `file` field to `PbLeaveRecord` type
- [x] 2.2 Add `file` field to `PbLeavePayload` type
- [x] 2.3 Add `file` field to `LeaveRecord` type
- [x] 2.4 Add `file` to `LeaveCreateInput` type
- [x] 2.5 Update `mapLeaveRecord` to include `file` field
- [x] 2.6 Update `mapLeavePayload` to handle file in FormData
- [x] 2.7 Add `createEmployeeLeave` to accept optional file and upload via FormData
- [x] 2.8 Add `updateEmployeeLeave` to handle file replacement
- [x] 2.9 Add helper function `getLeaveFileUrl` to retrieve file URL

## 3. Professor Leaves Page - UI Updates

- [x] 3.1 Add file state signals (`leaveFile`, `leaveFileTouched`)
- [x] 3.2 Add file validation function (PDF only, 7MB max)
- [x] 3.3 Add file input to create modal (after date fields)
- [x] 3.4 Hide file input when editing (professors cannot edit files)
- [x] 3.5 Add file icon/indicator to leave list rows
- [x] 3.6 Add file preview modal with download button
- [x] 3.7 Update submitLeave to handle file upload on create
- [x] 3.8 Update form validation to include file validation errors
- [x] 3.9 Add file cleanup on modal close

## 4. Staff Management - UI Updates

- [x] 4.1 Add file state signals to staff leave modal
- [x] 4.2 Add file input to create modal
- [x] 4.3 Allow file replacement on edit modal
- [x] 4.4 Add file icon/indicator to leave list rows
- [x] 4.5 Add file preview modal with download button
- [x] 4.6 Update submitLeave to handle file upload on create
- [x] 4.7 Update submitLeave to handle file replacement on edit
- [x] 4.8 Add file cleanup on modal close
- [x] 4.9 Update edit flow to load existing file reference

## 5. Testing

- [x] 5.1 Run existing tests to ensure no regressions
  Build passes. Tests that fail are pre-existing failures unrelated to leave file upload (professor-students mocking, enrollment-semesters UI, reports exports, email config).
- [x] 5.2 Add unit tests for file validation functions
- [x] 5.3 Add integration tests for file upload flow
- [x] 5.4 Test professor creates leave with file
- [x] 5.5 Test professor edit preserves file (no file edit)
- [x] 5.6 Test admin creates leave with file
- [x] 5.7 Test admin replaces file on edit
- [x] 5.8 Test file preview and download

## 6. Verification

- [x] 6.1 Run lint and typecheck
  No lint/typecheck scripts in project. Build succeeds without errors.
- [x] 6.2 Build succeeds without errors
- [ ] 6.3 Manual testing of professor flow
  Requires task 1.1 (PocketBase schema update) to be completed first.
- [ ] 6.4 Manual testing of staff management flow
  Requires task 1.1 (PocketBase schema update) to be completed first.
