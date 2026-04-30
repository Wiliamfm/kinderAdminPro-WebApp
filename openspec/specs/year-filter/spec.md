# year-filter Specification

## Purpose
TBD - created by archiving change professor-students-year-filter. Update Purpose after archive.
## Requirements
### Requirement: Year select box on student detail page
The professor student detail page SHALL display a year select box that allows filtering bulletin student entries by school year. The select box SHALL be populated with years derived from all semesters in the system using `deriveYearsFromDateRange`. The select box SHALL default to the year of the current semester.

#### Scenario: Page loads with current semester available
- **WHEN** the professor navigates to the student detail page and a current semester exists
- **THEN** the year select box SHALL display with the current semester's year pre-selected

#### Scenario: Page loads with no current semester
- **WHEN** the professor navigates to the student detail page and no current semester exists
- **THEN** the year select box SHALL display with the most recent year pre-selected

#### Scenario: Year options include all system semesters
- **WHEN** the year select box is rendered
- **THEN** it SHALL include all years derived from all semesters in the system, sorted in descending order (newest first)

### Requirement: Current year display mode
When the selected year includes the current semester, the page SHALL display the existing two-section layout: an editable main table for the current semester and a collapsible history section for other semesters within that year.

#### Scenario: Viewing current year with current semester entries
- **WHEN** the professor selects a year that contains the current semester
- **THEN** the main table SHALL show current semester entries with edit/add buttons enabled
- **AND** the collapsible history section SHALL show entries from other semesters in that year

#### Scenario: Viewing current year with no entries
- **WHEN** the professor selects a year that contains the current semester and no entries exist
- **THEN** the main table SHALL show bulletin rows with dashes for note and comments and an "Agregar" button for each

### Requirement: Past year display mode
When the selected year does NOT include the current semester, the page SHALL display a single flat read-only table with a "Trimestre" column showing all entries from that year's semesters.

#### Scenario: Viewing past year with entries
- **WHEN** the professor selects a year that does not contain the current semester
- **THEN** a single table SHALL be displayed with columns: Boletin, Nota, Comentarios, Trimestre
- **AND** all entries from semesters belonging to that year SHALL be shown
- **AND** no edit or add buttons SHALL be displayed

#### Scenario: Viewing past year with no entries
- **WHEN** the professor selects a year that does not contain the current semester and no entries exist for any semester in that year
- **THEN** the table SHALL display a message indicating no data is available for the selected year

### Requirement: Year-based entry filtering
Bulletin student entries SHALL be filtered client-side based on the selected year. An entry belongs to a year if the entry's semester has a date range that includes that year (as determined by `deriveYearsFromDateRange`).

#### Scenario: Filtering entries by year
- **WHEN** the professor changes the year selection
- **THEN** only entries whose semester falls within the selected year SHALL be visible
- **AND** the display mode (current vs past) SHALL update accordingly

