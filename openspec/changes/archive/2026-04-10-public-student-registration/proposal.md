## Why

Currently, new students can only be registered by authenticated staff through the enrollment management interface. There's no public way for parents/guardians to submit enrollment requests. This limits the school's ability to handle pre-registration periods and requires staff to manually input paper form data.

## What Changes

- Add new public route `/register` accessible without authentication
- Create registration form collecting student information and parent/guardian information
- On submission: create father record, create student record (active=true, accepted=false), and link them
- Display "pending approval" message after successful submission
- Reuse existing validation patterns from enrollment forms
- Integrate with existing enrollment request workflow at `/enrollment-management/requests`

## Capabilities

### New Capabilities
- `public-student-registration`: Allows anonymous users to submit student enrollment requests with parent information. Creates student with `active=true` and `accepted=false` for admin review.

### Modified Capabilities
- `enrollment-management`: Extends to include public submissions that appear in the existing request review workflow.

## Impact

- **New route**: `src/routes/register.tsx` (public, no auth guard)
- **New components**: Registration form with student and father sections
- **Backend**: New public PocketBase client functions for unauthenticated create operations
- **Dependencies**: Reuses existing student/father forms, validation, grades list