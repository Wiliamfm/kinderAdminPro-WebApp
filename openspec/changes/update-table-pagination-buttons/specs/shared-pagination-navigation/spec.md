## ADDED Requirements

### Requirement: Shared table pagination SHALL expose edge and nearby page buttons
The shared pagination control SHALL render direct page navigation for paginated tables when more than one page exists. It MUST always include the first and last page buttons, MUST include the current page, and MUST include the immediately adjacent page numbers when they exist and are not already represented by the first or last page.

#### Scenario: Middle page shows compact navigation with gaps
- **WHEN** the current page is `5` and the total page count is `10`
- **THEN** the pagination control shows page buttons `1`, `4`, `5`, `6`, and `10`
- **THEN** the control shows non-interactive gap markers between `1` and `4`, and between `6` and `10`

#### Scenario: Small page ranges show all pages without gaps
- **WHEN** the total page count is small enough that the first page, last page, current page, and adjacent pages cover every page in the range
- **THEN** the pagination control shows each page number exactly once
- **THEN** the control does not show any gap marker

### Requirement: Shared table pagination SHALL adapt near the start and end of the range
The shared pagination control SHALL avoid duplicate page buttons and SHALL omit unnecessary gap markers when the current page is near the beginning or end of the available range.

#### Scenario: Current page near the start omits a leading gap
- **WHEN** the current page is `2` and the total page count is `10`
- **THEN** the pagination control shows page buttons `1`, `2`, `3`, and `10`
- **THEN** the control shows a single non-interactive gap marker between `3` and `10`

#### Scenario: Current page near the end omits a trailing gap
- **WHEN** the current page is `9` and the total page count is `10`
- **THEN** the pagination control shows page buttons `1`, `8`, `9`, and `10`
- **THEN** the control shows a single non-interactive gap marker between `1` and `8`

### Requirement: Shared table pagination SHALL only emit valid page changes
The shared pagination control SHALL call its page-change handler only for valid target pages that differ from the current page. Previous, next, and numbered page buttons MUST respect the active loading state and the available page bounds.

#### Scenario: Selecting a different page requests navigation
- **WHEN** the user activates a numbered page button for a page other than the current one while the control is not busy
- **THEN** the page-change handler is called once with that page number

#### Scenario: Active or disabled targets do not request navigation
- **WHEN** the user activates the current page button, a disabled previous or next button, or any page button while the control is busy
- **THEN** the page-change handler is not called
