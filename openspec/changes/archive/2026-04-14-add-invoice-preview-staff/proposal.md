## Why

Currently, staff users can view and upload invoice files for employees in `/staff-management/employees`, but cannot preview the PDF files before downloading them. This limits their ability to verify invoice contents without a separate download step.

## What Changes

- Add invoice preview action to the staff management employees invoice section
- Open the invoice in a new browser tab so the default PDF viewer handles rendering
- Reuse the `getInvoiceFileUrl()` function from invoice-files library

## Capabilities

### New Capabilities
- `invoice-preview-staff`: PDF preview functionality in staff management invoices via browser tab

### Modified Capabilities
(None — this is a new feature in an existing capability area)

## Impact

- File: `src/routes/staff-management/employees.tsx` — add preview modal and signals
- File: `src/lib/pocketbase/invoice-files.ts` — `getInvoiceFileUrl()` already exists and works
- No schema changes required
- No new dependencies
