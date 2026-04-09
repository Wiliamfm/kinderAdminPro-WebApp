## Context

The admin calendar (`event-management/calendar.tsx`) has a preview modal that shows event details (type, status, schedule, assignees, description) when clicking an event. The professor calendar (`professor/events.tsx`) only shows a native browser tooltip on hover. Both calendars already load the same `CalendarItemRecord` data including assignees.

The existing `Modal` component (`src/components/Modal.tsx`) supports custom footers, making it straightforward to render different actions for admin vs professor.

## Goals / Non-Goals

**Goals:**
- Professors can click a calendar event to see a detail modal with the same layout/styles as admin
- Extract the event detail content into a shared component to avoid duplication
- Remove the native tooltip from professor events (replaced by the modal)

**Non-Goals:**
- No edit/delete capabilities for professors — the modal is strictly read-only
- No changes to the admin's create/edit/delete workflows
- No new API calls — all data is already loaded

## Decisions

### 1. Create a shared `EventPreviewModal` component

**Decision:** Extract the event detail body (type, status, schedule, assignees, description) into `src/components/EventPreviewModal.tsx`. This component renders the full modal including the detail cards, accepting a `CalendarItemRecord | null` and an optional `footer` slot.

**Why over alternatives:**
- *Extracting just the body content as a fragment* — would still require duplicating the Modal wrapper setup in both pages. A full modal component is cleaner.
- *Keeping duplication* — the detail layout is ~40 lines of JSX, but it includes date formatting logic that would also need duplication. A shared component avoids both.

**Interface:**
```tsx
type EventPreviewModalProps = {
  event: CalendarItemRecord | null;
  onClose: () => void;
  footer?: JSX.Element;  // admin passes edit/delete buttons; professor omits
};
```

When `footer` is omitted, the modal shows a single "Cerrar" button.

### 2. Date formatting helpers live inside the shared component

**Decision:** Move `formatDate` and `formatDateTime` into the `EventPreviewModal` module (or a small util if already shared). The professor calendar doesn't currently have these functions.

**Why:** They're tightly coupled to the preview display. No need for a separate utils file unless other consumers appear.

### 3. Professor modal has a close-only footer

**Decision:** The professor version renders the default Modal footer with just a "Cerrar" button — no confirm action. The admin version continues to pass its custom footer with Delete/Close/Edit buttons.

### 4. `CalendarItemRecord` type shared between both pages

**Decision:** Both pages already define the same `CalendarItemRecord` type locally. Extract it alongside the component or into a shared types location so both pages and the shared component can reference it.

## Risks / Trade-offs

- **Refactoring admin calendar** — Changing working code introduces small risk of regression. Mitigation: the admin modal body is replaced 1:1 with the shared component; footer stays as-is.
- **Type coupling** — Sharing `CalendarItemRecord` means changes to the type affect both pages. This is acceptable since they already use identical structures sourced from the same API.
