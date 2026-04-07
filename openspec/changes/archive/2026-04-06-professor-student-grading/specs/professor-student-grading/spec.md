## ADDED Requirements

### Requirement: Professor SHALL access a grading detail page per student
Navigating to `/professor/students/:id` MUST load the student's information and all bulletins defined for that student's grade. The page MUST only be accessible to a professor whose assigned grades include the student's grade; otherwise the professor is redirected to `/professor/students`.

#### Scenario: Professor opens detail page for a student in their grade
- **WHEN** a professor navigates to `/professor/students/abc`
- **THEN** the page displays the student's name, grade, and document ID
- **THEN** a row is shown for each bulletin belonging to the student's grade

#### Scenario: Professor attempts to access a student outside their grades
- **WHEN** a professor navigates to `/professor/students/xyz` where that student's grade is not assigned to the professor
- **THEN** the professor is redirected to `/professor/students`

### Requirement: Bulletin rows SHALL show current-semester entries in editable mode
For each bulletin in the student's grade, if a `bulletins_students` entry exists for the current semester and this student, the row MUST display the saved note and comments with an "Editar" action. If no entry exists yet for the current semester, the row MUST display empty fields with an "Agregar" action.

#### Scenario: Existing entry for current semester
- **WHEN** a bulletin row has a matching `bulletins_students` record with `semester_id` equal to the current semester
- **THEN** the row shows the saved note and comments
- **THEN** an "Editar" button is displayed

#### Scenario: No entry yet for current semester
- **WHEN** a bulletin row has no matching `bulletins_students` record for the current semester
- **THEN** the row shows empty note and comment fields
- **THEN** an "Agregar" button is displayed

### Requirement: Professor SHALL edit bulletin entries inline without a modal
Clicking "Editar" or "Agregar" on a row MUST switch that row into edit mode, rendering a number input for note and a textarea for comments. Only one row can be in edit mode at a time. A Save button persists the entry; a Cancel button reverts the row to view mode without saving.

#### Scenario: Entering edit mode
- **WHEN** the professor clicks "Agregar" or "Editar" on a bulletin row
- **THEN** the row renders a number input (note) and a textarea (comments)
- **THEN** all other rows remain in view mode

#### Scenario: Only one row editable at a time
- **WHEN** the professor opens edit mode on row A and then clicks "Editar" on row B
- **THEN** row A returns to view mode
- **THEN** row B enters edit mode

#### Scenario: Saving a new entry
- **WHEN** the professor fills in a note, optionally adds comments, and clicks Save
- **THEN** a new `bulletins_students` record is created with the correct bulletin_id, student_id, grade_id, and current semester_id
- **THEN** the row returns to view mode showing the saved values

#### Scenario: Updating an existing entry
- **WHEN** the professor edits an existing entry and clicks Save
- **THEN** the `bulletins_students` record is updated
- **THEN** the row returns to view mode with the new values

#### Scenario: Cancelling edit
- **WHEN** the professor clicks Cancel
- **THEN** the row returns to view mode with the previous values unchanged

### Requirement: Semester SHALL be derived from current semester and never user-selectable
The `semester_id` for every create and update operation MUST equal the ID of the semester marked as current in the `semesters` collection. The professor MUST NOT see or interact with a semester selector on this page.

#### Scenario: Current semester is available
- **WHEN** a semester is marked `is_current = true`
- **THEN** all save operations use that semester's ID without prompting the professor

#### Scenario: No current semester configured
- **WHEN** no semester is marked `is_current = true`
- **THEN** create and edit actions are disabled
- **THEN** an informational message explains that no active semester is configured

### Requirement: Past-semester entries SHALL be shown in a collapsed accordion
All `bulletins_students` entries for this student with a `semester_id` different from the current semester MUST be grouped under a collapsible section below the active table. The section MUST be collapsed by default and show entries in descending order by semester creation date. Entries in the accordion MUST be read-only.

#### Scenario: Accordion hidden by default
- **WHEN** the detail page loads and past entries exist
- **THEN** the history accordion is collapsed and its rows are not visible

#### Scenario: Expanding the accordion
- **WHEN** the professor clicks the history section header
- **THEN** the accordion expands and shows past entries in descending order
- **THEN** no edit or add controls are visible in the history rows

#### Scenario: No past entries
- **WHEN** there are no bulletin entries for semesters other than the current one
- **THEN** the history accordion section is not rendered
