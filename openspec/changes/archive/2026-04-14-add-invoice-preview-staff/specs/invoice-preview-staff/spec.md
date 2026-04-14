## ADDED Requirements

### Requirement: Staff can preview invoice PDF in browser tab
Staff users SHALL be able to open invoice PDF files in a new browser tab without downloading first.

#### Scenario: Open invoice from invoice list
- **WHEN** staff user clicks "Ver archivo" button on an invoice row
- **THEN** system opens a new browser tab with the PDF file
- **AND** the browser default PDF viewer renders the file

#### Scenario: Browser blocks the new tab
- **WHEN** staff user clicks "Ver archivo" and the browser blocks popups
- **THEN** system keeps the current modal open
- **AND** shows an inline error message explaining that the new tab was blocked
