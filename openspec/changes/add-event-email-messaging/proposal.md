## Why

The event management module currently lets admins plan events and tasks, but it does not provide a controlled way to communicate those events to employees and student tutors from inside the application. Administrators need a single workflow to target active employees and fathers, review who can actually receive email, and keep a send history for operational follow-up and auditability.

## What Changes

- Add a new admin-only event management page for composing and sending emails to employees and fathers from the application.
- Allow recipient resolution across mixed audiences in the same send, including active employees, active fathers linked to selected students, and active fathers linked to students in selected grades.
- Show resolved recipient totals, missing-email recipients, and explicit select-all actions for group-driven results such as grades.
- Send email through a PocketBase route backed by Resend so secrets remain server-side.
- Persist message history and per-recipient delivery results so admins can review who was targeted, who lacked email, and which deliveries succeeded or failed.
- Add a lightweight compose experience with subject, plain-text body, and simple preview without introducing a rich-text editor dependency.

## Capabilities

### New Capabilities
- `event-email-messaging`: Admin email composition, recipient filtering/selection, PocketBase-backed sending through Resend, and delivery history for event-related communications.

### Modified Capabilities

## Impact

- Frontend routes and event management navigation.
- New event-management page state and recipient-selection workflow in `src/pages/`.
- New PocketBase wrapper(s) in `src/lib/pocketbase/` for recipient resolution and email history access.
- New PocketBase collections and an authenticated admin-only route for send execution/history persistence.
- New backend dependency on Resend plus environment/configuration for server-side email delivery.
- Documentation updates for architecture, overview, and schema/rules impact.
