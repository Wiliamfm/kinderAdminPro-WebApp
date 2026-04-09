## ADDED Requirements

### Requirement: Leave dates SHALL fall within the assigned semester boundaries
The system SHALL reject any leave record where `start_datetime` or `end_datetime` falls outside the assigned semester's `start_date` to `end_date` range. This validation MUST be enforced both client-side (in the form) and server-side (in `createEmployeeLeave` and `updateEmployeeLeave`).

#### Scenario: Leave with dates inside semester boundaries is accepted
- **WHEN** a user submits a leave with `start_datetime` and `end_datetime` both within the semester's `start_date` and `end_date`
- **THEN** the system accepts the leave and creates/updates the record

#### Scenario: Leave with start date before semester is rejected
- **WHEN** a user submits a leave with `start_datetime` earlier than the semester's `start_date`
- **THEN** the system rejects the leave with an error indicating the date is outside the semester range

#### Scenario: Leave with end date after semester is rejected
- **WHEN** a user submits a leave with `end_datetime` later than the semester's `end_date` (end of day)
- **THEN** the system rejects the leave with an error indicating the date is outside the semester range

#### Scenario: Client-side validation shows boundary error before submission
- **WHEN** a professor enters a date outside the current semester's range in the leave form
- **THEN** the form displays an inline validation error on the affected date field with the valid date range
- **THEN** the submit button remains enabled but submission triggers field-level errors

#### Scenario: Server-side validation rejects out-of-bounds dates independently of client
- **WHEN** a leave create or update request reaches the server with dates outside the semester boundaries
- **THEN** the server rejects the request with a descriptive error, regardless of client-side validation
