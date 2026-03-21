## ADDED Requirements

### Requirement: Event management SHALL expose an admin calendar page
The system SHALL provide an admin-only calendar page at `/event-management/calendar` for viewing and managing calendar items. The event management module SHALL link to this page from its section index.

#### Scenario: Admin navigates to the event calendar
- **WHEN** an authenticated admin opens the event management module
- **THEN** the section index includes a link to the calendar page
- **THEN** opening `/event-management/calendar` shows the calendar workflow

#### Scenario: Non-admin user is denied calendar management access
- **WHEN** an authenticated non-admin user attempts to open `/event-management/calendar`
- **THEN** the app redirects the user away from the calendar workflow

### Requirement: The calendar SHALL manage unified event and task records
The system SHALL store calendar items in a single `events` domain that supports both events and tasks. Each calendar item MUST include a title, temporal range, and kind, and the calendar SHALL render both kinds in the same interface.

#### Scenario: Admin creates an event item
- **WHEN** an admin creates a calendar item with `kind = event`
- **THEN** the item is saved as a calendar record with its title and time range
- **THEN** the item appears in the calendar after creation

#### Scenario: Admin creates a task item
- **WHEN** an admin creates a calendar item with `kind = task`
- **THEN** the item is saved in the same `events` domain as other calendar items
- **THEN** the calendar renders the task alongside other items in the selected view

### Requirement: Task ownership SHALL support multiple assigned employees
The system SHALL model ownership through an `event_assignments` junction collection that links calendar items to employees. A single task MUST support assignment to multiple employees, and the system MUST prevent duplicate ownership links for the same task and employee pair.

#### Scenario: Admin assigns a task to multiple employees
- **WHEN** an admin saves a task with more than one selected employee
- **THEN** the system persists one assignment record per selected employee
- **THEN** the task remains associated with all selected employees when re-opened for editing

#### Scenario: Duplicate assignee is blocked
- **WHEN** the same employee is selected more than once for the same task
- **THEN** the system stores at most one assignment link for that employee and task pair

### Requirement: Calendar item editing SHALL use an explicit pencil-icon action
The calendar SHALL expose an explicit pencil-icon edit control for each calendar item. Activating the pencil icon MUST open the edit workflow in both desktop and mobile contexts.

#### Scenario: Admin edits an item from desktop month view
- **WHEN** an admin activates the pencil icon on a rendered calendar item in desktop view
- **THEN** the system opens the edit modal for that specific item

#### Scenario: Admin edits an item from mobile view
- **WHEN** an admin activates the pencil icon for a calendar item on a mobile viewport
- **THEN** the system opens the same edit workflow used on desktop

### Requirement: Calendar rendering SHALL prioritize compact titles and on-demand details
The calendar SHALL prioritize readable title-first rendering inside cells and event rows. Additional metadata such as time, status, kind, and assigned employees MUST be available through on-demand detail interactions without requiring full-width text in the calendar cell.

#### Scenario: Month view shows compact event content
- **WHEN** an admin views the calendar in month view
- **THEN** each rendered item shows its title in a compact format suitable for the cell
- **THEN** the view avoids rendering the full metadata block inline for every item

#### Scenario: Admin inspects richer item metadata
- **WHEN** an admin requests item details through the calendar interaction affordance
- **THEN** the system shows the item's time range, kind, status, and assignees without immediately forcing edit mode

### Requirement: The calendar SHALL provide library-backed admin scheduling views
The calendar page SHALL use a library-backed calendar experience that supports date-based creation and multiple scheduling views. The initial implementation MUST support month view and SHALL expose at least one alternate detailed view suitable for operational scheduling.

#### Scenario: Admin creates an item from a calendar date
- **WHEN** an admin activates a date-based create action from the calendar
- **THEN** the system opens a create workflow prefilled for the selected date or range

#### Scenario: Admin changes calendar view
- **WHEN** an admin switches between supported calendar views
- **THEN** the calendar shows the same underlying items in the newly selected view
