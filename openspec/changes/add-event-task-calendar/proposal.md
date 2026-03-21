## Why

The event management module currently stops at an index page and does not let admins plan or track operational work on a calendar. This change is needed now to give admins a single calendar surface where they can create school events and assign ownership of calendar tasks to one or more employees.

## What Changes

- Add a new admin-only calendar page under the event management module for creating, viewing, updating, and deleting calendar items.
- Introduce a unified `events` domain that supports both events and tasks, with title-first rendering in the calendar and detailed metadata available from hover and modal interactions.
- Add multi-employee task ownership through a dedicated `event_assignments` junction collection rather than embedding assignments directly on event records.
- Integrate a calendar UI library that supports month/week/list views, date-based creation flows, custom event rendering, and responsive behavior across desktop and mobile.
- Add a consistent edit interaction where a pencil icon opens the edit modal in both desktop and mobile contexts.

## Capabilities

### New Capabilities
- `event-task-calendar`: Adds an event management calendar where admins can create and manage events/tasks, assign tasks to multiple employees, and edit items through a dedicated action affordance.

### Modified Capabilities
- None.

## Impact

- Affected UI: `src/pages/event-management.tsx`, new event calendar route/page, navigation/index links, modal flows, and calendar item rendering.
- Affected data access: new PocketBase wrappers for `events` and `event_assignments`, plus employee option loading for assignment flows.
- Affected dependencies: addition of FullCalendar Standard and required integration packages/plugins for Solid-compatible rendering.
- Affected systems: PocketBase schema/rules for event/task storage and assignment ownership, admin authorization, responsive interaction behavior, and related tests/documentation.
