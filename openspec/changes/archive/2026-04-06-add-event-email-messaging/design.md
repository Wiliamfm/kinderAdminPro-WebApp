## Context

The current event management module exposes an admin-only calendar workflow, but there is no adjacent communication workflow for notifying employees or student tutors about events or operational announcements. The frontend already has active employee, father, student, grade, and student-father relation data available through PocketBase wrappers, which makes recipient resolution feasible without inventing a new domain model. The missing pieces are an admin page, a server-side sending boundary for Resend, and durable history that records both the message and the per-recipient outcome.

This change crosses the frontend event-management surface, PocketBase data access, PocketBase backend routing, external email delivery through Resend, and new audit/history storage. Those boundaries make an explicit design useful before implementation.

## Goals / Non-Goals

**Goals:**
- Add an admin-only event-management page for composing emails to employees and fathers in a single workflow.
- Support recipient resolution from mixed audience sources: direct employee selection, fathers linked to selected students, and fathers linked to students in selected grades.
- Expose recipient totals, sendable counts, missing-email counts, and select-all behavior for group-based filters.
- Send email through a PocketBase route that owns Resend credentials and validates admin access.
- Persist message history and per-recipient delivery results as send-time snapshots for auditability and follow-up.
- Keep composition lightweight with subject, plain-text body, and a simple preview instead of a rich-text editor stack.

**Non-Goals:**
- Building a newsletter-style rich text editor, template builder, or attachment workflow.
- Introducing background job infrastructure, delayed scheduling, or retry orchestration in the first version.
- Replacing the existing calendar workflow or coupling a send directly to a specific calendar event record.
- Supporting non-admin senders or parent self-service messaging.

## Decisions

### 1. Add a dedicated event-management email page instead of embedding messaging inside the calendar

The feature will live at a new admin-only route under the event management module rather than as a modal or sub-flow inside the calendar page.

Rationale:
- The messaging workflow has its own filters, recipient review, compose form, preview, and history concerns.
- A full page matches the current route-level workflow style in the repo better than a deep modal on the calendar page.
- This keeps future growth possible, such as saved drafts or message history browsing, without overloading the calendar UI.

Alternatives considered:
- Embedding the workflow in the calendar page would reduce route count but create an overly dense page with unrelated state.
- Using a modal from the event section index would constrain recipient review and history visibility.

### 2. Use a PocketBase custom route for sending and history persistence

The frontend will resolve and display recipients, but the actual send action will post to an authenticated PocketBase route that validates the request, persists history, calls Resend, and writes per-recipient results.

Rationale:
- Resend credentials must remain server-side.
- PocketBase already holds auth state and collection rules, so the route can enforce admin-only access close to the data.
- A PocketBase route avoids introducing a separate service for a feature that is otherwise local to this application.

Alternatives considered:
- Calling Resend directly from the frontend is unacceptable because it leaks credentials.
- A separate backend or serverless function would work, but adds deployment and ownership overhead without clear first-version benefit.

### 3. Model history with parent message records plus per-recipient result records

The design will use one collection for the overall message and a second collection for resolved recipients and delivery outcomes.

Rationale:
- A single message may target mixed audiences and produce mixed outcomes.
- The admin explicitly wants missing-email users to remain visible in history.
- Snapshotting recipient name and email at send time avoids audit drift when source records change later.

Alternatives considered:
- A single collection with aggregated JSON would reduce schema count but make querying, reporting, and troubleshooting harder.
- Logging only successful sends would fail the requirement to show users without email and failed deliveries.

### 4. Revalidate recipients on the PocketBase route instead of trusting the client list blindly

The frontend will submit selected recipients plus enough source context for the backend to validate that the chosen employee and father recipients are still active and still eligible at send time.

Rationale:
- Client-side resolution can become stale between preview and send.
- Server-side validation protects audit integrity and reduces risk from manipulated requests.
- The history record should reflect what the system validated, not only what the browser claimed.

Alternatives considered:
- Trusting only client-submitted recipient ids is simpler, but weaker from both security and audit perspectives.

### 5. Keep the compose experience plain-text-first with simple HTML preview generation

The editor will be a subject input plus body textarea. Preview will render a safe HTML view derived from the plain-text body, preserving paragraphs and line breaks.

Rationale:
- This satisfies the need for a usable compose experience without introducing editor dependencies or email-HTML complexity.
- Plain-text-first composition is easier to validate, test, and render consistently through Resend.
- The user explicitly prefers a simple editor without extra libraries.

Alternatives considered:
- Rich-text editors add bundle weight, formatting complexity, and email-HTML edge cases that are out of scope.
- Sending raw HTML written by admins would increase safety and rendering risk.

### 6. Send recipients individually or in controlled provider batches, never as one visible shared recipient list

The route will treat each resolved recipient as an individual delivery unit, even if provider batching is used under the hood.

Rationale:
- A grade-wide send must not expose recipient addresses to each other.
- Per-recipient tracking maps naturally to the required history model.
- This aligns with mixed delivery outcomes and missing-email handling.

Alternatives considered:
- Sending one email with many visible recipients is not acceptable for privacy reasons.

## Risks / Trade-offs

- [Route/backend logic lives outside the current frontend-heavy flow] → Mitigation: keep frontend responsibilities limited to selection and rendering; document the PocketBase route contract and schema changes clearly.
- [Recipient revalidation may produce a final send count that differs from the UI preview] → Mitigation: return a detailed send summary and store the validated snapshot in history.
- [Large grade sends may hit provider batch or rate limits] → Mitigation: structure the route around per-recipient processing and chunkable delivery, even if first-version volumes are moderate.
- [Snapshot history duplicates personal data] → Mitigation: store only the minimum fields needed for auditability, restrict all history access to admins, and document the PII impact.
- [Plain-text-only composition limits formatting flexibility] → Mitigation: provide preview formatting for paragraphs and line breaks; defer rich formatting to a future change if a real need emerges.

## Migration Plan

1. Add the new route and event-management navigation link in the frontend.
2. Add recipient-resolution and email-history wrappers in `src/lib/pocketbase/`.
3. Create PocketBase collections for message history and per-recipient results with admin-only access.
4. Add the PocketBase custom route for send execution and Resend integration, including environment configuration for the API key and sender identity.
5. Implement the email page and wire it to the new wrappers and route.
6. Validate with tests and a controlled send in a non-production environment.

Rollback:
- Hide the new route and section link.
- Disable or remove the custom route.
- Preserve history collections unless a deliberate cleanup is required, since they are audit records.

## Open Questions

- Should the first version include a dedicated history list page, or is send-history visibility within the compose page sufficient?
- Should the route persist the rendered HTML snapshot as sent, or only the plain-text body and derived preview input?
- Should the system expose a configurable sender display name per message, or use one fixed sender identity for v1?
