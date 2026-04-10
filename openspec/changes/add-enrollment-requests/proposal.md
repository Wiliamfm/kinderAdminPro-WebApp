## Why

Currently there's no way to handle new student enrollment requests. Fathers will submit enrollment requests (future feature), and admins need a way to accept or reject these requests. The system needs a dedicated view to manage pending enrollment requests.

## What Changes

- Add `accepted` (bool, default false) field to `students` collection in PocketBase
- Add `rejected` (datetime) field to `students` collection in PocketBase
- Create new page at `/enrollment-management/requests` to list pending requests
- Query pending requests: `active = false AND accepted = false AND rejected = null`
- Add "Accept" action: sets `accepted = true, active = true`
- Add "Reject" action: sets `rejected = NOW()`
- Add "Rechazar" option to mark requests as rejected (soft-delete with timestamp)

## Capabilities

### New Capabilities
- `enrollment-requests`: Admin page to view pending enrollment requests and accept/reject them

### Modified Capabilities
- `student-management`: Adding acceptance/rejection workflow to existing student records

## Impact

- **Database**: Add two new fields to `students` collection (`accepted`, `rejected`)
- **Frontend**: New route, new page component, new API functions for accepting/rejecting
- **Navigation**: Link already exists in section-index at `/enrollment-management/requests`