## ADDED Requirements

### Requirement: Professor SHALL have access to a read-only event calendar (Eventos)
The Eventos section for professors MUST render the event calendar (month view with navigation) showing all published events. Professors MUST NOT be able to create, edit, or delete events from this view.

#### Scenario: Professor can view the event calendar
- **WHEN** a professor navigates to the Eventos section
- **THEN** the calendar renders with the current month and any existing events

#### Scenario: No create or edit actions in professor calendar
- **WHEN** a professor views the event calendar
- **THEN** no add-event button, edit button, or delete button is rendered
- **THEN** clicking a calendar cell or event does not open an edit modal

#### Scenario: Calendar navigation works for professors
- **WHEN** a professor clicks the next or previous month button
- **THEN** the calendar advances or retreats one month and loads the corresponding events

### Requirement: Professor event calendar SHALL reuse the shared calendar rendering logic
The professor calendar MUST use the same underlying calendar component as the admin event-management calendar, with admin-only actions (create, edit, delete, email) hidden via a read-only prop or equivalent mechanism.

#### Scenario: Events are displayed consistently with admin view
- **WHEN** an event exists on a given date
- **THEN** it appears on the professor calendar on the same date and with the same label as in the admin view
