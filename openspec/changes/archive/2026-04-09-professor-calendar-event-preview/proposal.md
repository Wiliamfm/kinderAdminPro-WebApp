## Why

Professors can see events on their calendar but cannot click them to view details. The only information available is a basic browser tooltip on hover. Admins already have a click-to-preview modal showing type, status, schedule, assignees, and description. Professors should have the same read-only detail view for a consistent experience.

## What Changes

- Extract the event detail view (type, status, schedule, assignees, description) from the admin calendar into a shared `EventPreviewModal` component
- Add an `eventClick` handler to the professor calendar that opens this shared preview modal (read-only, no edit/delete actions)
- Refactor the admin calendar to use the same shared component (with its existing edit/delete footer)
- Remove the native browser tooltip (`title` attribute) from professor calendar events, since the modal replaces it

## Capabilities

### New Capabilities
- `event-preview-modal`: Shared modal component for displaying calendar event details, usable by both admin and professor views

### Modified Capabilities
- `professor-event-calendar`: Professors can now click events to see a detail modal (read-only). Tooltip removed.

## Impact

- `src/routes/professor/events.tsx` — add eventClick handler, preview modal, remove tooltip
- `src/routes/event-management/calendar.tsx` — refactor to use shared preview component
- New shared component file for `EventPreviewModal`
