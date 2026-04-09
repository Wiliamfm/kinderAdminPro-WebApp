## Why

Professors can see their invoice list under Consultar pagos, but cannot view or download the actual PDF files. The table is purely informational with no file access, making it impossible for professors to retrieve their payment documents.

## What Changes

- Add a PDF preview modal that opens when clicking an invoice row, displaying the file in the browser's native PDF viewer via `<iframe>`
- Add a download button inside the preview modal for single-file download
- Add checkbox selection to the invoice table for multi-select
- Add a bulk download button that triggers individual browser downloads for all selected invoices
- Add a new server function to fetch invoice file URLs from the `invoice_files` collection

## Capabilities

### New Capabilities
- `professor-invoice-file-access`: Covers viewing (preview) and downloading invoice PDF files from the professor's Consultar pagos page, including single-file preview/download via modal and multi-select bulk download from the table.

### Modified Capabilities
- `professor-personal-management`: The existing "Professor SHALL be able to view their own invoices" requirement expands — professors can now view PDF content and download files, not just see metadata.

## Impact

- `src/lib/pocketbase/invoice-files.ts` — new server function to fetch file record and generate URL
- `src/routes/professor/personal/invoices.tsx` — major changes: checkbox column, row click handler, preview modal, bulk download button
- No new dependencies needed (uses browser-native PDF viewer and existing download utilities)
