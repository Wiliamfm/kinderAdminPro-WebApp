## ADDED Requirements

### Requirement: Professor SHALL be able to upload a PDF file when creating a leave
The Registrar ausencia submodule MUST allow the logged-in professor to optionally attach a PDF file (max 7MB) when creating a leave record. The file MUST be validated client-side before upload.

#### Scenario: Professor uploads valid PDF file on leave creation
- **WHEN** a professor fills out the leave form with valid dates and selects a PDF file under 7MB
- **THEN** the system uploads the file alongside the leave record
- **THEN** the file is associated with the created leave record

#### Scenario: Professor selects oversized file
- **WHEN** a professor selects a file larger than 7MB
- **THEN** the form displays a validation error: "El archivo debe ser menor a 7MB"
- **THEN** the file is not uploaded

#### Scenario: Professor selects non-PDF file
- **WHEN** a professor selects a file that is not a PDF
- **THEN** the form displays a validation error: "Solo se permiten archivos PDF"
- **THEN** the file is not uploaded

#### Scenario: Professor submits leave without file
- **WHEN** a professor submits the leave form without attaching a file
- **THEN** the leave record is created successfully without a file
- **THEN** no validation error is shown for the missing file

### Requirement: Professor SHALL NOT be able to edit the file on existing leave records
The leave edit modal for professors MUST NOT allow changing or replacing the uploaded file. The file input field MUST be hidden or disabled when editing a leave.

#### Scenario: Professor opens edit modal for leave with file
- **WHEN** a professor clicks edit on a leave record that has an attached file
- **THEN** the modal opens with date fields pre-filled
- **THEN** no file input field is displayed
- **THEN** the existing file is preserved when saving

### Requirement: Admin SHALL be able to upload and replace PDF files on leave records
The staff management leave modal MUST allow admins to upload a PDF file on create and replace the file on edit.

#### Scenario: Admin uploads file on leave creation
- **WHEN** an admin fills out the leave form for an employee and selects a PDF file under 7MB
- **THEN** the system uploads the file alongside the leave record
- **THEN** the file is associated with the created leave record

#### Scenario: Admin replaces file on leave edit
- **WHEN** an admin edits an existing leave record and selects a new PDF file
- **THEN** the system replaces the existing file with the new one
- **THEN** the updated file is associated with the leave record

### Requirement: Leave list SHALL display file preview and download option
The leave list view MUST show a file indicator for leaves that have attachments, with options to preview or download.

#### Scenario: Professor views leave list with file attachment
- **WHEN** a professor views their leave list and a leave record has an attached file
- **THEN** a file icon or indicator is displayed in the leave row
- **THEN** clicking the file opens a preview modal or downloads the file
- **THEN** a download button is available in the preview modal

#### Scenario: Admin views leave list with file attachment
- **WHEN** an admin views an employee's leave list and a leave record has an attached file
- **THEN** a file icon or indicator is displayed in the leave row
- **THEN** clicking the file opens a preview modal or downloads the file
- **THEN** a download button is available in the preview modal
