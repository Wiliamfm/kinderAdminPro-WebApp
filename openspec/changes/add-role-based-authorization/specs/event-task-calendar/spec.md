## MODIFIED Requirements

### Requirement: Event management SHALL expose a role-authorized calendar page
The system SHALL provide a calendar page at `/event-management/calendar` for viewing and managing calendar items to users authorized for the event-management module. The event management module SHALL link to this page from its section index only for users with event-management access.

#### Scenario: Event-authorized user navigates to the event calendar
- **WHEN** an authenticated user with event-management access opens the event management module
- **THEN** the section index includes a link to the calendar page
- **THEN** opening `/event-management/calendar` shows the calendar workflow

#### Scenario: User without event-management access is denied calendar management
- **WHEN** an authenticated user without event-management access attempts to open `/event-management/calendar`
- **THEN** the app redirects the user away from the calendar workflow

### Requirement: The calendar SHALL manage unified event and task records
The system SHALL store calendar items in a single `events` domain that supports both events and tasks. Each calendar item MUST include a title, temporal range, and kind, and the calendar SHALL render both kinds in the same interface.

#### Scenario: Authorized event user creates an event item
- **WHEN** an authorized event-management user creates a calendar item with `kind = event`
- **THEN** the item is saved as a calendar record with its title and time range
- **THEN** the item appears in the calendar after creation

#### Scenario: Authorized event user creates a task item
- **WHEN** an authorized event-management user creates a calendar item with `kind = task`
- **THEN** the item is saved in the same `events` domain as other calendar items
- **THEN** the calendar renders the task alongside other items in the selected view

### Requirement: Task ownership SHALL support multiple assigned employees
The system SHALL model ownership through an `event_assignments` junction collection that links calendar items to employees. A single task MUST support assignment to multiple employees, and the system MUST prevent duplicate ownership links for the same task and employee pair.

#### Scenario: Authorized event user assigns a task to multiple employees
- **WHEN** an authorized event-management user saves a task with more than one selected employee
- **THEN** the system persists one assignment record per selected employee
- **THEN** the task remains associated with all selected employees when re-opened for editing

#### Scenario: Duplicate assignee is blocked
- **WHEN** the same employee is selected more than once for the same task
- **THEN** the system stores at most one assignment link for that employee and task pair

### Requirement: Calendar item editing SHALL use an explicit pencil-icon action
The calendar SHALL expose an explicit pencil-icon edit control for each calendar item. Activating the pencil icon MUST open the edit workflow in both desktop and mobile contexts.

#### Scenario: Authorized event user edits an item from desktop month view
- **WHEN** an authorized event-management user activates the pencil icon on a rendered calendar item in desktop view
- **THEN** the system opens the edit modal for that specific item

#### Scenario: Authorized event user edits an item from mobile view
- **WHEN** an authorized event-management user activates the pencil icon for a calendar item on a mobile viewport
- **THEN** the system opens the same edit workflow used on desktop

### Requirement: Calendar rendering SHALL prioritize compact titles and on-demand details
The calendar SHALL prioritize readable title-first rendering inside cells and event rows. Additional metadata such as time, status, kind, and assigned employees MUST be available through on-demand detail interactions without requiring full-width text in the calendar cell.

#### Scenario: Month view shows compact event content
- **WHEN** an authorized event-management user views the calendar in month view
- **THEN** each rendered item shows its title in a compact format suitable for the cell
- **THEN** the view avoids rendering the full metadata block inline for every item

#### Scenario: Authorized event user inspects richer item metadata
- **WHEN** an authorized event-management user requests item details through the calendar interaction affordance
- **THEN** the system shows the item's time range, kind, status, and assignees without immediately forcing edit mode

### Requirement: The calendar SHALL provide library-backed role-authorized scheduling views
The calendar page SHALL use a library-backed calendar experience that supports date-based creation and multiple scheduling views for users with event-management access. The initial implementation MUST support month view and SHALL expose at least one alternate detailed view suitable for operational scheduling.

#### Scenario: Authorized event user creates an item from a calendar date
- **WHEN** an authorized event-management user activates a date-based create action from the calendar
- **THEN** the system opens a create workflow prefilled for the selected date or range

#### Scenario: Authorized event user changes calendar view
- **WHEN** an authorized event-management user switches between supported calendar views
- **THEN** the calendar shows the same underlying items in the newly selected view
