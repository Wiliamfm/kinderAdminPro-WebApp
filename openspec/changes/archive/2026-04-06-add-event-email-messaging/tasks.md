## 1. Schema and backend setup

- [x] 1.1 Define PocketBase collections for parent email messages and per-recipient history with admin-only rules and audit fields.
- [x] 1.2 Add or update the PocketBase schema sync workflow/scripts needed to create the new collections reproducibly.
- [x] 1.3 Configure the PocketBase custom route contract for admin-only email sending and required request/response fields.
- [x] 1.4 Add server-side Resend integration and environment handling for API key and sender identity.

## 2. Recipient resolution and history data layer

- [x] 2.1 Add frontend PocketBase wrapper functions to resolve active employee recipients.
- [x] 2.2 Add frontend PocketBase wrapper functions to resolve active father recipients from selected students and grades with de-duplication.
- [x] 2.3 Add frontend PocketBase wrapper functions to read email message history and per-recipient results.
- [x] 2.4 Add shared mapping/types for resolved recipients, missing-email recipients, and send summaries.

## 3. Email send route implementation

- [x] 3.1 Implement PocketBase route authentication and admin authorization checks for the email send endpoint.
- [x] 3.2 Implement server-side payload validation and recipient revalidation before delivery.
- [x] 3.3 Implement message-history creation and per-recipient snapshot persistence before and after send attempts.
- [x] 3.4 Implement Resend delivery flow with per-recipient success/failure handling and aggregate result updates.

## 4. Event management email page

- [x] 4.1 Register the new `/event-management/email` route and add the admin-only event-management navigation link.
- [x] 4.2 Build the email page filter workflow for employees, students, and grades with mixed-audience selection support.
- [x] 4.3 Build the recipient review UI showing total resolved, sendable, and missing-email counts plus select-all controls for group results.
- [x] 4.4 Build the compose form with subject, plain-text body, simple preview, and send action wired to the PocketBase route.
- [x] 4.5 Add in-page history visibility for previous sends and per-recipient outcomes if included in the first-page workflow.

## 5. Validation and documentation

- [x] 5.1 Add or update tests for recipient resolution, route validation, history persistence, and page interaction flows.
- [x] 5.2 Run `bun run test` and `bun run build` after the implementation is complete.
- [x] 5.3 Update `docs/overview.md` and `docs/architecture.md` with the new route, data flow, collections, and Resend-backed messaging design.
