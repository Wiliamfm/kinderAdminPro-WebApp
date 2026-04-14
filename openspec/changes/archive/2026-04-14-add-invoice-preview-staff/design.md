## Context

The file `src/routes/staff-management/employees.tsx` already has:
- Leave preview modal for leave attachments
- Invoice section with upload/history actions

Invoice preview should not stack another modal on top of the invoice modal. Instead, it should open the PDF in a new browser tab.

## Goals / Non-Goals

**Goals:**
- Add PDF preview access to invoice rows in the staff management invoice modal
- Open the invoice PDF in a new browser tab
- Let the browser's built-in PDF viewer handle preview and download controls

**Non-Goals:**
- No changes to invoice upload flow (already works)
- No new API endpoints (getInvoiceFileUrl already exists)

## Decisions

1. **Open a blank tab synchronously** → `window.open('', '_blank')` must happen directly from the click handler to avoid popup blockers before the async `getInvoiceFileUrl()` call resolves.

2. **Reuse getInvoiceFileUrl()** → Already exists in `src/lib/pocketbase/invoice-files.ts:33-43`. No new backend work is needed.

3. **Keep preview inside the browser, not the app modal stack** → The nested modal pattern is not appropriate here because the invoice history already lives inside a modal.

## Risks / Trade-offs

- **Risk**: Popup blocked by the browser if tab opening is not triggered synchronously → **Mitigation**: Open the blank tab immediately from the click handler, then redirect it when the file URL resolves
- **Risk**: File URL lookup failure leaves a blank tab open → **Mitigation**: Close the opened tab and show an inline error in the invoice modal

## Migration Plan

1. Add a preview handler that opens a new tab and resolves the invoice file URL
2. Surface blocked-popup or file-loading errors inline in the invoice modal
3. Change the invoice row action cell to include a preview button

No rollback needed — deploy in one release.
