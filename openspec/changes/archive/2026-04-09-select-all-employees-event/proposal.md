## Why

Admins need to assign multiple employees (often all of them) when creating events. Currently, they must manually check each individual employee checkbox, which is time-consuming when there are many employees.

## What Changes

- Add a "Select All" button above the employee checkbox list in the event creation/edit modal
- The button toggles between selecting all active employees and clearing the selection

## Capabilities

### New Capabilities
- None - this is a UI enhancement to an existing capability

### Modified Capabilities
- None - no changes to requirements, only implementation

## Impact

- Modified file: `src/routes/event-management/calendar.tsx`
- No API changes
- No database changes
