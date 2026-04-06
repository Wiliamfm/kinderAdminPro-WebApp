## ADDED Requirements

### Requirement: Event management SHALL expose an admin email messaging page
The system SHALL provide an admin-only email messaging page at `/event-management/email` inside the event management module. The event management section index SHALL include a link to this page for authenticated admins.

#### Scenario: Admin opens the email messaging workflow
- **WHEN** an authenticated admin opens the event management module
- **THEN** the section index includes a link to the email messaging page
- **THEN** opening `/event-management/email` shows the email workflow

#### Scenario: Non-admin user is denied email messaging access
- **WHEN** an authenticated non-admin user attempts to open `/event-management/email`
- **THEN** the app redirects the user away from the email messaging workflow

### Requirement: The messaging workflow SHALL resolve active recipients across mixed audiences
The system SHALL allow a single send workflow to include active employees and active fathers at the same time. Fathers MUST be resolvable from selected students and from selected grades through active students linked to active fathers, and duplicate father recipients MUST be de-duplicated before sending.

#### Scenario: Admin mixes employees and fathers in one send
- **WHEN** an admin selects one or more active employees and one or more active fathers in the same workflow
- **THEN** the system includes both audience types in the resolved recipient set for that send

#### Scenario: Grade-based father resolution de-duplicates shared tutors
- **WHEN** an admin selects a grade containing multiple students linked to the same active father
- **THEN** the resolved recipients include that father only once

#### Scenario: Inactive records are excluded from resolution
- **WHEN** an admin resolves recipients from employees, students, grades, or fathers
- **THEN** the system excludes inactive employees, inactive students, and inactive fathers from the resolved recipient set

### Requirement: The messaging workflow SHALL expose sendable totals and explicit recipient selection controls
The system SHALL display the total resolved recipients, the total sendable recipients, and the total recipients without email for the current selection state. Group-based filters such as grade selection MUST expose an explicit select-all control, and the admin MUST be able to include or exclude individual recipients before sending.

#### Scenario: Grade filter shows select-all and counts
- **WHEN** an admin resolves fathers from one or more selected grades
- **THEN** the workflow shows a select-all action for the resolved group
- **THEN** the workflow shows counts for total resolved, sendable, and missing-email recipients

#### Scenario: Admin reviews users without email
- **WHEN** the resolved recipient set includes users without an email address
- **THEN** the workflow shows those users in a separate visible state
- **THEN** those users are excluded from the sendable count

#### Scenario: Admin unselects an individual recipient from a group result
- **WHEN** an admin clears one recipient from a previously selected group result
- **THEN** the workflow updates the selected-recipient totals before send submission

### Requirement: Email delivery SHALL execute through an authenticated PocketBase route backed by Resend
The system SHALL execute sends through a PocketBase route that is available only to authenticated admins. The route MUST validate the payload, revalidate recipient eligibility, and send through Resend without exposing provider credentials to the frontend.

#### Scenario: Admin sends a validated email request
- **WHEN** an authenticated admin submits a valid email send request
- **THEN** the PocketBase route validates the message and recipients
- **THEN** the route sends the email through Resend using server-side credentials

#### Scenario: Non-admin caller is denied route access
- **WHEN** a non-admin or unauthenticated caller invokes the email send route
- **THEN** the route rejects the request without attempting delivery

#### Scenario: Server-side validation removes stale recipients
- **WHEN** a selected recipient is no longer active or no longer eligible at send time
- **THEN** the route excludes that recipient from delivery
- **THEN** the response and history reflect the validated outcome

### Requirement: The system SHALL persist email history with per-recipient outcomes
Each send attempt SHALL create a parent message history record and per-recipient history records that snapshot recipient identity, email value, source context, and delivery outcome. History MUST preserve recipients without email and recipients whose delivery fails.

#### Scenario: Successful send creates parent and child history records
- **WHEN** an admin sends an email with one or more sendable recipients
- **THEN** the system stores one message history record for the send attempt
- **THEN** the system stores one recipient history record per resolved recipient

#### Scenario: Missing-email recipient is preserved in history
- **WHEN** a resolved recipient does not have an email address
- **THEN** the system stores that recipient in history with a missing-email outcome
- **THEN** the recipient is not submitted to Resend for delivery

#### Scenario: Partial delivery failure is preserved in history
- **WHEN** one recipient delivery fails while others succeed
- **THEN** the system stores the failed recipient outcome alongside the successful ones
- **THEN** the parent history record reflects aggregate sent and failed counts

### Requirement: The messaging workflow SHALL provide a simple compose and preview experience
The system SHALL provide a compose workflow with a subject input, a plain-text body field, and a lightweight preview derived from the plain-text content. The first version MUST NOT require a rich-text editor dependency.

#### Scenario: Admin previews the email body before sending
- **WHEN** an admin enters a subject and plain-text body
- **THEN** the workflow renders a preview that preserves line breaks and paragraph separation

#### Scenario: Compose flow remains editor-library free
- **WHEN** the email messaging page is implemented
- **THEN** the compose experience uses native form controls for subject and body input
