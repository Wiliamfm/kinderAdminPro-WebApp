## ADDED Requirements

### Requirement: Professor SHALL be able to preview an invoice PDF
When a professor clicks on an invoice row in the Consultar pagos table, a modal SHALL open displaying the invoice PDF using the browser's built-in PDF viewer (via `<iframe>`). The modal MUST show the invoice name as its title.

#### Scenario: Clicking an invoice row opens the preview modal
- **WHEN** a professor clicks on an invoice row (not the checkbox)
- **THEN** the system fetches the file URL for that invoice's `fileId`
- **THEN** a modal opens with the PDF rendered in an `<iframe>`
- **THEN** the modal title displays the invoice name

#### Scenario: Preview modal shows loading state while fetching file URL
- **WHEN** the modal opens and the file URL is being fetched
- **THEN** a loading indicator is displayed in the modal
- **THEN** the PDF iframe renders once the URL is available

#### Scenario: Preview modal shows error if file cannot be loaded
- **WHEN** the file URL fetch fails
- **THEN** the modal displays an error message instead of the iframe

### Requirement: Professor SHALL be able to download a single invoice from the preview modal
The preview modal MUST include a download button that downloads the currently viewed invoice PDF file.

#### Scenario: Professor downloads invoice from preview modal
- **WHEN** a professor clicks the download button in the preview modal
- **THEN** the browser downloads the invoice PDF file with its original name

### Requirement: Professor SHALL be able to select multiple invoices for bulk download
The invoice table MUST include a checkbox column. Professors can select individual invoices or use a header checkbox to select/deselect all visible invoices.

#### Scenario: Professor selects individual invoices via checkboxes
- **WHEN** a professor clicks a row's checkbox
- **THEN** that invoice is added to or removed from the selection
- **THEN** the preview modal does NOT open

#### Scenario: Professor selects all visible invoices via header checkbox
- **WHEN** a professor clicks the header checkbox
- **THEN** all invoices on the current page are selected (or deselected if all were selected)

#### Scenario: Selection is visible in the UI
- **WHEN** one or more invoices are selected
- **THEN** a bulk download button appears showing the count of selected invoices

#### Scenario: Semester label is resolved before rendering
- **WHEN** invoice rows are rendered in the table
- **THEN** each row shows the resolved semester name for `semester_id`
- **THEN** the UI does not fall back to showing the relation id string

### Requirement: Professor SHALL be able to bulk download selected invoices
When invoices are selected, a bulk download button MUST be available. Clicking it SHALL trigger individual browser downloads for each selected invoice.

#### Scenario: Professor bulk downloads selected invoices
- **WHEN** a professor clicks the bulk download button with N invoices selected
- **THEN** the system fetches file URLs for each selected invoice
- **THEN** each file is downloaded individually via the browser

#### Scenario: Bulk download button is disabled during download
- **WHEN** a bulk download is in progress
- **THEN** the bulk download button is disabled to prevent duplicate downloads

### Requirement: Invoice file URL SHALL be resolved via a dedicated server function
A new `"use server"` function MUST fetch the `invoice_files` record by ID and return the file URL using PocketBase's `pb.files.getURL()`. The existing `listEmployeeInvoices` function MUST NOT be modified.

#### Scenario: File URL is fetched for a valid file ID
- **WHEN** `getInvoiceFileUrl` is called with a valid `fileId`
- **THEN** it returns the full PocketBase file URL for that invoice file

#### Scenario: File URL fetch fails for an invalid file ID
- **WHEN** `getInvoiceFileUrl` is called with a non-existent `fileId`
- **THEN** it throws a normalized PocketBase error
