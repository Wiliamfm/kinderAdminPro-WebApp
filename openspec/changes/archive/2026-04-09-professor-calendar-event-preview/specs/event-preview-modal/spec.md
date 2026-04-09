## ADDED Requirements

### Requirement: EventPreviewModal SHALL display calendar event details in a modal
The `EventPreviewModal` component SHALL render a modal showing the event's type, status, schedule, assignees, and description using the same card-based layout and yellow/gray styling as the admin calendar preview.

#### Scenario: Modal displays all event fields
- **WHEN** the modal is opened with a calendar event
- **THEN** the modal title shows the event title
- **THEN** a "Tipo" card shows "Tarea" or "Evento" based on the event kind
- **THEN** a "Estado" card shows "Planificado", "Realizado", or "Cancelado" based on status
- **THEN** a "Horario" card shows the formatted date/time range, or "todo el día" for all-day events
- **THEN** a "Responsables" card shows comma-separated assignee names, or "Sin responsables" if none
- **THEN** a "Descripción" card shows the event description, or "Sin descripción." if empty

#### Scenario: Modal closes on close action
- **WHEN** the user clicks the close button, presses Escape, or clicks outside the modal
- **THEN** the modal closes

### Requirement: EventPreviewModal SHALL support an optional custom footer
The component SHALL accept an optional `footer` prop. When provided, it SHALL render the custom footer (e.g., admin edit/delete buttons). When omitted, it SHALL render a default footer with only a "Cerrar" button.

#### Scenario: Default footer with no custom footer provided
- **WHEN** the modal is rendered without a footer prop
- **THEN** a single "Cerrar" button is displayed that closes the modal

#### Scenario: Custom footer provided
- **WHEN** the modal is rendered with a footer prop
- **THEN** the custom footer content is displayed instead of the default close button
