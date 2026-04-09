## Why

Professors and staff need to upload supporting documents (like medical certificates) when creating leave requests. Currently, the leaves system only stores dates without any file attachment capability. Adding a file upload to leaves will allow employees to provide documentation for their absences.

## What Changes

- Add `file` column to the `leaves` collection in PocketBase (file type, optional)
- Add file upload UI to the professor's leave create/edit modal
- Add file upload UI to the staff management leave create/edit modal
- Add file preview and download functionality to the leaves list view
- Admins can replace the file when editing; professors cannot edit files

## Capabilities

### New Capabilities
- `leave-file-upload`: Ability to attach PDF files (up to 7MB) to leave records. Optional for creation, editable only by admins.

### Modified Capabilities
- `professor-leaves`: Extends the existing "Registrar ausencia" capability to include optional PDF file upload
- `staff-leaves-management`: Extends admin leave management with file upload and preview functionality

## Impact

- **Database**: Add `file` column to `leaves` collection in PocketBase
- **Backend**: Update `src/lib/pocketbase/leaves.ts` to handle file uploads via FormData
- **Frontend - Professor**: Modify `src/routes/professor/personal/leaves.tsx` to add file upload to modal
- **Frontend - Staff**: Modify `src/routes/staff-management/employees.tsx` to add file upload to leave modal
- **Frontend - Shared**: Add file preview/download UI similar to the invoice preview pattern
