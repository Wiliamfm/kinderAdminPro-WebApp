## Context

The current event management module only exposes the index route at `/event-management` and does not provide any operational workflow beyond navigation. The new requirement introduces a real calendar page where admins can create and manage dated items, distinguish between events and tasks, and assign task ownership to multiple employees.

This change crosses several boundaries in the current frontend:

- routing and event management navigation need a new page,
- the UI needs a calendar dependency with custom event rendering and responsive interactions,
- PocketBase needs new collections for calendar items and employee ownership,
- the data layer needs wrappers that map PocketBase snake_case fields to the app's TypeScript model,
- the page needs a modal-driven CRUD workflow consistent with the rest of the admin UI.

Stakeholders are admin users who need a single planning surface for school operations. Constraints from the repo still apply: admin access is enforced through PocketBase rules and page guards, temporal fields must use offset-aware RFC3339 datetimes with `*_datetime` naming, and reusable behavior should live in PocketBase wrapper modules instead of inline SDK calls inside pages.

## Goals / Non-Goals

**Goals:**
- Add an admin-only calendar route under event management for viewing and managing calendar items.
- Support a unified event/task record model in a single `events` collection.
- Support multi-employee task ownership through a dedicated `event_assignments` junction collection.
- Use a FullCalendar-based UI that supports month, week, and list views with custom event rendering.
- Provide a consistent edit affordance through a pencil icon so desktop and mobile use the same edit entry point.
- Keep month cells readable by showing the title in the calendar and exposing richer metadata through hover/click interactions.
- Follow the repository's existing PocketBase wrapper, validation, modal, and testing patterns.

**Non-Goals:**
- Add recurrence rules, reminders, notifications, or attendee RSVP flows.
- Add Premium FullCalendar resource or timeline features.
- Introduce employee-facing calendar views; this change is admin-only.
- Add per-assignee workflow state such as individual completion tracking or acknowledgement.
- Replace the event management index page with a completely new information architecture.

## Decisions

### 1. Add a dedicated `/event-management/calendar` route and keep `/event-management` as the section index

The existing event management page should remain the lightweight index page, and the new calendar should live under its own route. This matches the route structure already used in staff, enrollment, and reports modules where a section index leads to more specific workflow pages.

This keeps navigation predictable and avoids overloading the current index page with a complex interactive surface.

Alternative considered:
- Replace `/event-management` directly with the calendar. Rejected because it breaks the section-index pattern already used in the app and makes future event-management features harder to group.

### 2. Use FullCalendar Standard through the official web-component integration

The page should use FullCalendar Standard as the rendering engine. The repository does not currently include a calendar dependency, and this feature needs true calendar behavior rather than a hand-built month grid. FullCalendar provides month/week/list views, date click handling, custom event rendering, hover hooks, and drag/resize capabilities without requiring Premium features.

Because this is a SolidJS app, the web-component integration is the safest path. It avoids introducing a React wrapper and keeps the integration close to browser-native custom elements while still letting the page own data loading and modal state.

Alternative considered:
- Build a custom month grid. Rejected because the requirement has already moved beyond a simple planner and would likely grow into standard calendar interactions.
- Use a different framework-agnostic library. Rejected because FullCalendar offers the strongest mix of maturity, documentation, and non-Premium feature coverage for this use case.

### 3. Model calendar items in a single `events` collection with a `kind` discriminator

The persisted domain should use a single `events` collection for both events and tasks. The collection will include:

- `title`
- `description`
- `start_datetime`
- `end_datetime`
- `is_all_day`
- `kind` (`event` | `task`)
- `status` (`planned` | `done` | `cancelled`)
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `is_deleted`

Using one collection keeps calendar rendering simple, because the page loads one primary dataset and maps it directly into calendar items. It also avoids splitting the UI into separate event and task stores before the product has enough divergent behavior to justify it.

Alternative considered:
- Separate `events` and `tasks` collections. Rejected because both appear on the same calendar surface and currently share the same temporal and CRUD behavior.

### 4. Model multi-employee ownership with an `event_assignments` junction collection

Task ownership should use a junction collection rather than a multi-relation field directly on `events`. The junction collection will minimally include:

- `event_id`
- `employee_id`
- `created_at`

It should also enforce a unique index on `(event_id, employee_id)` to prevent duplicate ownership rows.

This follows the repository's existing pattern for many-to-many data modeling (`students_fathers`) and keeps future extension paths open. If later the product needs per-assignee status, completion timestamps, or assignment notes, those can be added to the junction collection without migrating away from an embedded multi-relation design.

Alternative considered:
- Multi-relation field on `events`. Rejected because it is weaker for future ownership semantics and less consistent with the repo's existing junction-collection pattern.

### 5. Keep assignments optional for events and required only when task rules demand it

The model should allow calendar items without assignments so school-wide events can exist independently of ownership. Tasks may still use the same `events` collection, but the page-level validation can require one or more assignees when `kind = task`.

This keeps the domain flexible:

- events can be informational and unassigned,
- tasks can carry explicit ownership,
- both still render from the same calendar source.

Alternative considered:
- Require assignments for every calendar item. Rejected because many calendar events are informational rather than owned work items.

### 6. Use title-first calendar rendering with hover preview and pencil-icon editing

Calendar items should render compactly, especially in month view. The default event content should prioritize:

- truncated title,
- optional visual distinction for `task` vs `event`,
- pencil icon button for edit.

Hover should expose richer metadata on desktop, such as:

- title,
- time range,
- kind,
- status,
- assigned employee names.

The pencil icon is the canonical edit affordance in all viewports. This creates one edit entry pattern that works on desktop and mobile and avoids making the event body itself the only edit trigger.

Alternative considered:
- Open edit on event click. Rejected because it makes desktop and mobile behavior less explicit and competes with hover/detail interactions.

### 7. Use modal-based create/edit flows that mirror the repo's current admin pages

The calendar page should follow the existing route-level workflow pattern used elsewhere in the app:

- clicking a date or create action opens a modal,
- editing uses the same modal in edit mode,
- deletion is handled from the edit modal,
- validation and PocketBase errors follow the page's current inline/form-level conventions.

This keeps the new workflow consistent with the modal-heavy admin UX already established in staff and report pages.

Alternative considered:
- Dedicated create/edit routes. Rejected because the calendar surface benefits from preserving context while editing, and modal patterns are already well-established in the repo.

### 8. Load events and assignments through dedicated PocketBase wrapper modules

The frontend should add new wrapper modules under `src/lib/pocketbase/` for:

- `events.ts`
- `event-assignments.ts`

The page should not call PocketBase SDK methods directly. Wrappers should:

- map snake_case to camelCase,
- normalize expanded assignee data for display,
- enforce audit fields from the authenticated user,
- soft delete events with `is_deleted = true`,
- provide calendar-range-friendly listing APIs for the current visible date range.

Alternative considered:
- Put event assignment helpers inside `events.ts` only. Rejected because assignment syncing is a separate concern and will be easier to test and evolve in its own module.

## Risks / Trade-offs

- [Calendar library integration adds bundle and behavioral complexity] -> Limit the initial feature set to Standard views/plugins and isolate integration details inside the event calendar page and wrappers.
- [Custom event rendering inside FullCalendar can become fragile across view modes] -> Keep the rendered content minimal and test month/list interactions explicitly.
- [Assignment sync logic can drift if create/update workflows partially fail] -> Treat event persistence and assignment synchronization as an explicit ordered workflow and test create/update edge cases.
- [Hover-only metadata is not available on touch devices] -> Use hover as a desktop enhancement only; keep click/tap and pencil-icon flows sufficient on mobile.
- [One collection for both events and tasks may feel underspecified later] -> Preserve the `kind` discriminator and junction model so future divergence can happen without redesigning current storage.

## Migration Plan

1. Add PocketBase collections and rules for `events` and `event_assignments`, including audit fields, soft-delete support on `events`, and a unique assignment index.
2. Add PocketBase wrapper modules and tests for listing, creating, updating, deleting, and syncing event assignments.
3. Add the new event management calendar route and link it from the event management section index.
4. Integrate FullCalendar Standard with custom event rendering, hover metadata, date-click create flow, and pencil-icon edit flow.
5. Add/update page tests, wrapper tests, and documentation for the new event management capability.
6. Validate with `bun run test` and `bun run build`.

Rollback strategy:
- Remove the new route/page and wrapper changes and stop linking to the feature.
- Remove or ignore the new PocketBase collections if rollout is abandoned before data becomes business-critical.
- Because event deletion is soft on the main collection, data can be preserved during temporary UI rollback if needed.

## Open Questions

- None required before implementation. The current direction is specific enough to proceed with schema, UI, and wrapper work under the assumptions captured above.
