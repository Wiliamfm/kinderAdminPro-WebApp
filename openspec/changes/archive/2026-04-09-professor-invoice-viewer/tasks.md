## 1. Server-side file URL function

- [x] 1.1 Add `getInvoiceFileUrl(fileId: string)` to `src/lib/pocketbase/invoice-files.ts` — fetches `invoice_files` record by ID, returns `pb.files.getURL(record, record.file)`

## 2. Invoice table enhancements

- [x] 2.1 Add checkbox column to the invoice table — header checkbox for select-all, row checkboxes for individual selection
- [x] 2.2 Add selection state management (signal for selected invoice IDs, toggle logic, select-all/deselect-all)
- [x] 2.3 Make invoice rows clickable to open preview modal (stopPropagation on checkbox to prevent modal open)
- [x] 2.4 Add bulk download button that appears when invoices are selected, showing selection count

## 3. Preview modal

- [x] 3.1 Create the invoice preview modal with title, `<iframe>` for PDF display, loading state, and error state
- [x] 3.2 Add download button inside the modal that downloads the currently viewed invoice
- [x] 3.3 Add close button and backdrop click to dismiss the modal

## 4. Download logic

- [x] 4.1 Implement single-file download from the preview modal (fetch blob from file URL, trigger `downloadBlobFile`)
- [x] 4.2 Implement bulk download — iterate selected invoices, fetch each file URL, trigger individual downloads with delay between them
- [x] 4.3 Add disabled state to bulk download button while downloads are in progress
