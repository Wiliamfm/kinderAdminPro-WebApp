## ADDED Requirements

### Requirement: Bulletin category deletion with cascade
When deleting a bulletin category with no active bulletins, the system SHALL hard delete all soft-deleted bulletins for that category before deleting the category itself.

#### Scenario: Category with only archived bulletins can be deleted
- **WHEN** user attempts to delete a category that has no active bulletins but has archived (soft-deleted) bulletins
- **THEN** the system deletes all archived bulletins then deletes the category

#### Scenario: Category with active bulletins is blocked
- **WHEN** user attempts to delete a category that has active (non-deleted) bulletins
- **THEN** the system blocks deletion with an error message showing the count