## Context

The professor invoices page (`/professor/personal/invoices`) currently displays a read-only table of invoice metadata (name, semester, updated date). The actual PDF files are stored in PocketBase's `invoice_files` collection, linked via `fileId` on each invoice record. No file access is exposed to professors — there's no preview, no download, no file URL generation.

The infrastructure exists: PocketBase serves files via `pb.files.getURL(record, fileName)`, the project already uses this pattern for employee CVs in `employees.ts`, and download utilities (`downloadBlobFile`) exist in `src/lib/reports/download.ts`.

## Goals / Non-Goals

**Goals:**
- Professors can preview any of their invoice PDFs in a modal using the browser's built-in PDF renderer
- Professors can download a single invoice from the preview modal
- Professors can select multiple invoices from the table and download them all at once
- File URL resolution happens via a new dedicated server function, keeping `listEmployeeInvoices` unchanged

**Non-Goals:**
- ZIP bundling for multi-download (individual browser downloads are acceptable)
- Dedicated PDF viewer library (browser native `<iframe>` is sufficient)
- Modifying the existing `listEmployeeInvoices` function
- Any create/edit/delete capabilities for professors

## Decisions

### 1. File URL fetching via new server function
Add `getInvoiceFileUrl(fileId: string)` to `invoice-files.ts` as a `"use server"` function. It fetches the `invoice_files` record by ID and returns the URL from `pb.files.getURL()`.

**Why:** Keeps the existing list endpoint untouched (per requirement). The URL is generated server-side where the authenticated PB client lives, and the resulting URL is a direct PocketBase file URL accessible from the browser.

### 2. Browser-native PDF preview via `<iframe>`
The preview modal embeds the PDF using `<iframe src={fileUrl}>`. No additional library needed.

**Why:** Simplest approach, zero dependencies, works in all modern browsers. The `<object>` tag is an alternative but `<iframe>` has more consistent behavior across browsers.

### 3. Row click opens modal, checkbox click does not
Table rows get a click handler that opens the preview modal. The checkbox column stops event propagation so clicking it only toggles selection.

**Why:** Intuitive UX — clicking a row means "view this", clicking a checkbox means "select this for bulk action".

### 4. Multi-download triggers individual browser downloads
When downloading multiple files, we fetch each file URL sequentially and trigger individual `downloadBlobFile` calls with a small delay between them to avoid browser blocking.

**Why:** Avoids adding `jszip` as a dependency. For the typical invoice count per professor, individual downloads are acceptable.

## Risks / Trade-offs

- **[Browser may block multiple downloads]** → Add a small delay (200-300ms) between download triggers. Most browsers allow sequential programmatic downloads if they're user-initiated.
- **[PDF may not render in iframe on some mobile browsers]** → Acceptable trade-off for now; the download button provides a fallback.
- **[N+1 API calls for multi-download]** → Each selected invoice needs a separate `getInvoiceFileUrl` call. Acceptable for typical volumes (professors have ~10-20 invoices total).
