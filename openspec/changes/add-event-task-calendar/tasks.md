## 1. Calendar foundations

- [x] 1.1 Add the FullCalendar Standard dependency set needed for month/week/list views and custom event rendering.
- [x] 1.2 Add the `/event-management/calendar` route and link it from the event management section index/navigation.

## 2. PocketBase event/task domain

- [x] 2.1 Define the `events` collection contract, admin rules, audit fields, soft-delete behavior, and temporal fields required by the calendar workflow.
- [x] 2.2 Define the `event_assignments` junction collection contract, relation rules, and unique `(event_id, employee_id)` ownership constraint.
- [x] 2.3 Add PocketBase wrapper modules and tests for listing, creating, updating, deleting, and mapping event/task records and assignment links.

## 3. Calendar page workflow

- [x] 3.1 Implement the event management calendar page with FullCalendar views, visible-range loading, and compact title-first event rendering.
- [x] 3.2 Implement the create/edit modal workflow for event/task records, including task-assignee selection from active employees and validation rules.
- [x] 3.3 Implement the explicit pencil-icon edit action, hover/detail behavior, and responsive interactions for desktop and mobile.

## 4. Validation and documentation

- [x] 4.1 Add or update UI tests covering admin access, calendar rendering, create/edit/delete flows, assignment persistence, and the pencil-icon edit affordance.
- [x] 4.2 Update affected documentation for the new route, PocketBase schema/rules, and event management architecture.
- [x] 4.3 Run `bun run test` and `bun run build`.
