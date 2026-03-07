# employee-leaves-semester-linking Specification

## Purpose
Define the persisted semester-linking contract for employee leave records, including required schema, UI behavior, and legacy-data backfill rules.

## Requirements
### Requirement: Leaves SHALL store a required semester relation
Each leave record SHALL persist a `semester_id` relation to `semesters` in addition to its existing employee and datetime fields. The system MUST require `semester_id` for all create and update operations once the migration is complete.

#### Scenario: Admin creates a leave with a semester
- **WHEN** an admin submits a new leave with valid employee, semester, start, and end values
- **THEN** the system creates the leave with the selected `semester_id`

#### Scenario: Admin updates a leave semester
- **WHEN** an admin edits an existing leave and changes its semester selection
- **THEN** the system saves the leave with the updated `semester_id`

### Requirement: Leave management UI SHALL require semester selection
The leave create/edit modal SHALL present a semester input as part of the leave form. The system MUST require a semester selection before allowing the leave to be saved.

#### Scenario: New leave defaults to the current semester
- **WHEN** an admin opens the leave modal to create a new leave and a current semester exists
- **THEN** the semester field is prefilled with the current semester

#### Scenario: Editing preserves the saved semester
- **WHEN** an admin opens an existing leave for editing
- **THEN** the semester field shows the leave's stored semester value

#### Scenario: Missing semester blocks submission
- **WHEN** an admin attempts to save a leave without a semester selection
- **THEN** the system rejects the submission and shows a validation error for the semester field

### Requirement: Leave management SHALL fail clearly when no semester can be selected
The system SHALL not allow leave creation when there are no semester records available to assign. The UI MUST present a clear admin-facing error instead of attempting to submit an invalid leave payload.

#### Scenario: No semesters available for leave creation
- **WHEN** an admin opens the leave modal and no semesters exist in the system
- **THEN** the leave workflow indicates that a semester must be created before a leave can be saved

### Requirement: Existing leaves SHALL be backfilled before semester becomes required
Before enforcing `semester_id` as required for all leaves, the system SHALL populate existing leave records with a deterministic default semester. The backfill MUST prefer the current semester and MUST fall back to the semester with the most recent `end_date` when no current semester exists.

#### Scenario: Backfill uses current semester when available
- **WHEN** legacy leave records are migrated and one semester is marked as current
- **THEN** each legacy leave receives that current semester as its `semester_id`

#### Scenario: Backfill falls back to latest semester
- **WHEN** legacy leave records are migrated and no semester is marked as current
- **THEN** each legacy leave receives the semester with the most recent `end_date` as its `semester_id`
