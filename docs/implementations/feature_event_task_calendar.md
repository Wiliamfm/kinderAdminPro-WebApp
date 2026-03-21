# Implementation Spec: Event Task Calendar

Last updated: 2026-03-21  
Status: Completed

## Documentation Compliance
- Sensitive data policy: compliant (no secrets, credentials, or PII included).
- Any future examples in this file must use placeholders and redacted values only.

## Summary
Implement an admin-only calendar workflow under the event management module for creating, viewing, updating, and deleting events/tasks.

The feature adds:
- a new route `/event-management/calendar`,
- FullCalendar Standard views (`dayGridMonth`, `timeGridWeek`, `listWeek`),
- a unified `events` collection for both events and tasks,
- an `event_assignments` junction collection for multi-employee task ownership,
- modal-based create/edit/delete flows,
- detail preview on event click,
- explicit edit via pencil icon on each rendered calendar item.

Chosen decisions:
- access model: admin-only,
- data model: single `events` collection with `kind` discriminator,
- ownership model: junction collection instead of embedded multi-relation,
- delete policy: soft delete on `events`,
- edit interaction: pencil icon in all viewports,
- details interaction: click event body to preview without entering edit mode.

## Important Interfaces Or Schema Changes

### Public Route Changes
- Keep section index route: `/event-management`
- Add route: `/event-management/calendar`
- Add section link:
  - label: `Calendario`
  - href: `/event-management/calendar`
  - `requiresAdmin: true`

### New PocketBase Collections
- `events`
  - admin-only rules for list/view/create/update/delete,
  - required fields: `title`, `start_datetime`, `end_datetime`, `kind`, `status`,
  - optional fields: `description`, `is_all_day`, `is_deleted`,
  - audit fields: `created_by`, `updated_by`, `created_at`, `updated_at`,
  - indexes:
    - `idx_events_start_datetime`,
    - `idx_events_end_datetime`,
    - `idx_events_kind_status`.
- `event_assignments`
  - admin-only rules for list/view/create/update/delete,
  - required relation fields: `event_id`, `employee_id`,
  - timestamp field: `created_at`,
  - indexes:
    - unique `idx_event_assignments_event_employee`,
    - `idx_event_assignments_employee_id`,
    - `idx_event_assignments_created_at`.

### New Frontend Data Wrappers
- `src/lib/pocketbase/events.ts`
  - `listCalendarEventsInRange(start, end)`
  - `createCalendarEvent(payload)`
  - `updateCalendarEvent(id, payload)`
  - `softDeleteCalendarEvent(id)`
- `src/lib/pocketbase/event-assignments.ts`
  - `listEventAssignmentsByEventIds(eventIds)`
  - `syncEventAssignments(eventId, employeeIds)`

### Schema Sync Script
- Add `scripts/sync-event-task-calendar-schema.sh`
- Purpose:
  - authenticate against local PocketBase,
  - create `events` if missing,
  - create `event_assignments` if missing,
  - keep schema creation reproducible in this frontend repository.

## Implementation Plan

### 1) Backend Collection Setup
Run `scripts/sync-event-task-calendar-schema.sh` against the configured local PocketBase instance.

Collection behavior requirements:
- `events.create` must set:
  - `created_by = authUserId`
  - `updated_by = authUserId`
  - `is_deleted = false`
- `events.update` must refresh:
  - `updated_by = authUserId`
- event delete must set:
  - `is_deleted = true`
  - `updated_by = authUserId`
- assignment sync must:
  - create missing `(event_id, employee_id)` rows,
  - delete stale rows when assignees are removed,
  - prevent duplicates through the unique index and UI de-duplication.

### 2) Data Layer Implementation
In `src/lib/pocketbase/events.ts`:
- map snake_case PB fields to camelCase TS records,
- list only records where `is_deleted != true`,
- filter visible events by range overlap:
  - `start_datetime < visibleEnd`
  - `end_datetime > visibleStart`.

In `src/lib/pocketbase/event-assignments.ts`:
- expand `employee_id` for assignee display names,
- fetch assignments for all visible event ids in one query,
- sync ownership by diffing desired employee ids against existing assignment rows.

### 3) Calendar Page
Create `src/pages/event-management-calendar.tsx` with:
- admin guard redirecting non-admin users to `/event-management`,
- FullCalendar web-component integration,
- views:
  - month,
  - week,
  - list,
- compact event rendering with:
  - title,
  - pencil icon button,
  - color distinction for event/task,
- click day to open create modal,
- click event body to open detail preview modal,
- click pencil icon to open edit modal,
- modal form fields:
  - `title`,
  - `description`,
  - `kind`,
  - `status`,
  - `isAllDay`,
  - start/end inputs,
  - multi-employee assignee selection,
- validation:
  - title minimum length,
  - valid temporal range,
  - at least one assignee when `kind = task`.

### 4) Event Management Module Wiring
Update:
- `src/routes.ts` to register `/event-management/calendar`,
- `src/lib/section-index.ts` to add the calendar link,
- `src/pages/event-management.tsx` to filter admin-only links consistently.

### 5) Documentation Updates
Update root docs:
- `docs/overview.md`:
  - include the new route and workflow summary,
- `docs/architecture.md`:
  - add the `events` and `event_assignments` data model section,
  - add calendar page data-flow notes.

## Test Cases And Scenarios

### Data Layer Tests
Add:
- `src/lib/pocketbase/events.test.ts`
- `src/lib/pocketbase/event-assignments.test.ts`

Cover:
- range-overlap query generation,
- create/update/delete audit behavior for `events`,
- assignment listing with employee expansion,
- assignment sync diffing and de-duplication,
- missing authenticated user failures,
- PocketBase error normalization.

### Page Tests
Add `src/pages/event-management-calendar.test.tsx` covering:
- non-admin redirect,
- calendar options loading and preview behavior,
- create task flow with assignee sync,
- edit flow triggered by the pencil icon,
- delete flow with assignment cleanup.

### Validation Commands
- `bun run test`
- `bun run build`

## Assumptions And Defaults
- Calendar editing is modal-driven; drag/drop and resize are not enabled in v1.
- `events.kind = task` requires at least one assignee in UI validation.
- `events.kind = event` may be saved without assignees.
- All persisted temporal values are offset-aware datetimes; all-day events are stored as inclusive date range in UI and exclusive next-day boundary in persistence.
- The schema sync script is creation-focused and assumes these collections are new to the environment.
