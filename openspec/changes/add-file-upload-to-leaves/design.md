## Context

The leaves system currently stores leave records with employee, semester, start datetime, and end datetime. The invoices system already has file upload capability using a separate `invoice_files` collection with a file column. We need to add similar functionality to leaves.

**Current State:**
- `leaves` table: id, employee_id, semester_id, start_datetime, end_datetime
- No file column exists
- Both professor and staff pages have leave create/edit modals

**Constraints:**
- File upload is optional
- Only PDF files, max 7MB
- Professors cannot edit files; only admins can
- File replacement on edit (not append)
- Reuse existing patterns from invoice implementation

## Goals / Non-Goals

**Goals:**
- Add optional file upload to leave records
- Support PDF files up to 7MB
- Allow professors to upload files on create
- Allow admins to replace files on edit
- Display file preview and download in leave list

**Non-Goals:**
- Real-time file validation during upload
- File versioning or history
- Multiple file attachments per leave
- File types other than PDF

## Decisions

### 1. Store file directly in leaves table vs. separate collection

**Decision:** Store file directly in `leaves` table (single file column).

**Rationale:** Unlike invoices which had a separate `invoice_files` collection, leaves only need one file per record. Simpler to maintain and query. The invoice_files pattern was likely used historically or for specific audit requirements.

### 2. File validation approach

**Decision:** Client-side validation with server-side enforcement.

**Rationale:** Immediate feedback for users. Server enforces PDF-only and 7MB limit as a safeguard. Follows existing pattern in invoice modal.

### 3. File edit permissions

**Decision:** Only admins can edit/replace files. Professors can only upload on create.

**Rationale:** Professors are registering their own leaves but admins manage staff. Document integrity - admins should control official documentation. Professors can upload supporting docs when creating; edits go through admin review.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Large file uploads slow down form submission | Client validation rejects oversized files before upload |
| File deletion when leave is deleted | PocketBase handles cascade or require manual file cleanup |
| Professors bypassing file restrictions | Server enforces PDF-only, 7MB limit in backend |
| Preview not working in all browsers | Always provide download button as fallback |

## Migration Plan

1. Add `file` column to `leaves` collection in PocketBase (file type, optional)
2. Update `src/lib/pocketbase/leaves.ts`:
   - Add `file` to `LeaveRecord` type
   - Add `file` to `LeaveCreateInput`
   - Create helper function for file upload
   - Update `createEmployeeLeave` to handle FormData when file present
   - Update `updateEmployeeLeave` to handle file replacement
3. Update professor leaves page (`src/routes/professor/personal/leaves.tsx`):
   - Add file input to modal
   - Add file preview in list (if file exists)
   - Disable file edit in edit mode
4. Update staff management employees page (`src/routes/staff-management/employees.tsx`):
   - Add file input to leave modal
   - Allow file replacement on edit
   - Add file preview in list
5. Test both professor and staff flows
