## ADDED Requirements

### Requirement: Student deactivation cascades to related fathers
When a student is deactivated (soft-deleted), the system SHALL cascade the deletion to related father relationships, removing junction table records and optionally soft-deleting fathers who have no remaining active students.

#### Scenario: Deactivate student with no linked fathers
- **WHEN** `deactivateStudent` is called for a student with no fathers in `students_fathers`
- **THEN** the student's `active` field is set to `false`
- **AND** no changes are made to fathers or users

#### Scenario: Deactivate student with linked fathers who have other students
- **WHEN** `deactivateStudent` is called for a student linked to a father who has other active students
- **THEN** all `students_fathers` junction rows for that student are hard deleted
- **AND** the student is soft-deleted (`active = false`)
- **AND** the father remains active (`is_active = true`)

#### Scenario: Deactivate student with linked fathers who have no other students
- **WHEN** `deactivateStudent` is called for a student linked to a father who has no other active students
- **THEN** all `students_fathers` junction rows for that student are hard deleted
- **AND** the student is soft-deleted (`active = false`)
- **AND** the father is soft-deleted (`is_active = false`)

#### Scenario: Deactivate student with linked father who has app user
- **WHEN** `deactivateStudent` is called for a student linked to a father who has no other active students AND that father has a linked app user
- **THEN** all above cascading occurs
- **AND** the father's app user record is hard deleted from `users` collection

#### Scenario: Father is already soft-deleted
- **WHEN** `deactivateStudent` is called for a student linked to a father who is already soft-deleted (`is_active = false`)
- **THEN** junction rows are deleted
- **AND** father remains soft-deleted (no state change)
- **AND** no user deletion attempt is made

#### Scenario: Deactivate student fails after junction deletion triggers rollback
- **WHEN** `deactivateStudent` is called but fails after junction rows have been deleted
- **THEN** all deleted junction rows are re-created with original father IDs
- **AND** the student's `active` field remains `true`
- **AND** an error is thrown to the caller

### Requirement: All-or-nothing transaction
The system SHALL ensure that either all operations succeed or the entire operation is rolled back.

#### Scenario: Father user deletion fails
- **WHEN** a father's app user deletion fails but the father was already soft-deleted
- **AND** junction rows were deleted
- **AND** student was soft-deleted
- **THEN** the operation completes successfully (father already soft-deleted is acceptable state)
- **AND** the error is logged