## MODIFIED Requirements

### Requirement: Professor SHALL have access to a read-only event calendar (Eventos)
The Eventos section for professors MUST render the event calendar (month view with navigation) showing all published events. Professors MUST NOT be able to create, edit, or delete events from this view. Professors SHALL be able to click an event to open a read-only detail modal.

#### Scenario: Professor can view the event calendar
- **WHEN** a professor navigates to the Eventos section
- **THEN** the calendar renders with the current month and any existing events

#### Scenario: No create or edit actions in professor calendar
- **WHEN** a professor views the event calendar
- **THEN** no add-event button, edit button, or delete button is rendered

#### Scenario: Professor clicks an event to view details
- **WHEN** a professor clicks on a calendar event
- **THEN** the EventPreviewModal opens showing the event's details (type, status, schedule, assignees, description)
- **THEN** the modal footer contains only a "Cerrar" button (no edit or delete)

#### Scenario: Calendar navigation works for professors
- **WHEN** a professor clicks the next or previous month button
- **THEN** the calendar advances or retreats one month and loads the corresponding events

## REMOVED Requirements

### Requirement: Professor event calendar shows tooltip on hover
**Reason**: Replaced by the click-to-preview modal which provides the same information in a better UX.
**Migration**: The native browser tooltip (`title` attribute) is removed from calendar events. Users click events instead.
