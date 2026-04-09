## 1. Shared Types & Utilities

- [x] 1.1 Extract `CalendarItemRecord` type into a shared location (e.g. `src/lib/types/calendar.ts`) so both pages and the new component can import it
- [x] 1.2 Move `formatDate` and `formatDateTime` helpers from admin calendar into the shared component module or a small util

## 2. EventPreviewModal Component

- [x] 2.1 Create `src/components/EventPreviewModal.tsx` with props: `event: CalendarItemRecord | null`, `onClose: () => void`, `footer?: JSX.Element`
- [x] 2.2 Implement the modal body with type, status, schedule, assignees, and description cards (same styles as admin)
- [x] 2.3 Implement default footer with a single "Cerrar" button when no custom footer is provided

## 3. Admin Calendar Refactor

- [x] 3.1 Replace the inline preview modal body in `event-management/calendar.tsx` with `EventPreviewModal`, passing the existing custom footer (Delete/Close/Edit buttons)
- [x] 3.2 Verify admin preview, edit, and delete flows still work correctly

## 4. Professor Calendar Integration

- [x] 4.1 Add `previewEventId` signal and `previewEvent` derived memo to `professor/events.tsx`
- [x] 4.2 Add `eventClick` handler to the FullCalendar config that sets `previewEventId`
- [x] 4.3 Render `EventPreviewModal` with the selected event and no custom footer (close-only)
- [x] 4.4 Remove the `eventDidMount` tooltip logic (`title` attribute) and the `buildTooltip` function
