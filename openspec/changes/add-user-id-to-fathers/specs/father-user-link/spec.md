## ADDED Requirements

### Requirement: Father record links to user account
The system SHALL create a permanent link between a father record and their corresponding user account when the father is created through public registration or admin UI.

#### Scenario: Public registration creates linked father
- **WHEN** a new father submits the public registration form with valid data
- **THEN** the system creates a users record with role `father` AND creates a fathers record with `user_id` pointing to that users record

#### Scenario: Query father by authenticated user
- **WHEN** an authenticated user with role `father` accesses the system
- **THEN** the system can resolve which father record belongs to that user via the `user_id` relation

### Requirement: Father user ID is retrievable
The system SHALL expose the `user_id` field in the father record type when reading from the API.

#### Scenario: List active fathers includes user ID
- **WHEN** an admin queries the list of active fathers
- **THEN** each father record includes the `userId` field (may be null for existing records)