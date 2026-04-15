## Why

Fathers (acudientes) currently have no direct way to communicate with school administrators or professors through the portal. They can only register students and view bulletins. Adding a contact feature allows fathers to send messages directly to admins/professors, improving parent-school communication.

## What Changes

- Add a "Contactar" button in the father portal header area
- Create a modal with:
  - Multi-select dropdown listing all active employees (format: "Name - email")
  - Subject input field (auto-prefixed with father email and name)
  - Body textarea for the message
  - Send and Cancel buttons
- Integrate with existing `sendEventEmail()` function which handles persistence and SMTP sending
- Display inline success/error alerts after send attempt

## Capabilities

### New Capabilities

- `father-contact-admins`: Allows fathers to send email messages to selected administrators and professors from the portal. Includes employee selection, custom subject, message body, and delivery confirmation.

### Modified Capabilities

- None - this is a net-new capability that reuses existing infrastructure

## Impact

- **Frontend**: New modal component in `src/routes/father-portal.tsx`
- **Backend**: Existing `sendEventEmail()` in `event-email-messaging.ts` handles persistence and sending
- **No new dependencies** - uses existing `listActiveEmployees()` function