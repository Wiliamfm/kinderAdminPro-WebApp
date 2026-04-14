## Why

Staff users receive a 503 Server Unavailable error when attempting to upload invoice files in the employee management page. The error occurs because SolidStart's Seroval serializer cannot serialize JavaScript `File` objects, causing the server function to fail during deserialization step 3. This blocks invoice submission entirely, preventing staff from recording employee invoice information.

## What Changes

- Fix the invoice file upload to use raw `FormData` instead of an object containing a `File` object
- Apply the same pattern already working in `leaves.ts` for leave file uploads

## Capabilities

### New Capabilities

- `invoice-file-upload`: System SHALL allow staff users to upload invoice PDF files when submitting employee invoices without causing a Seroval serialization error

### Modified Capabilities

- None - this is a bug fix, not a requirement change

## Impact

**Code:**
- `src/lib/pocketbase/invoice-files.ts`: Modify `createInvoiceFile` to accept raw `FormData`
- `src/routes/staff-management/employees.tsx`: Update client to send `FormData` instead of `{ file: File }` object

**No API changes:**
- PocketBase schema unchanged
- Same invoice_files collection structure