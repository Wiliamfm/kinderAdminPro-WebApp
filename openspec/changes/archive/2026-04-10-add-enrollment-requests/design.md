## Context

The enrollment management section currently allows admins to manage active students and tutors, but has no mechanism to handle incoming enrollment requests. A link to `/enrollment-management/requests` already exists in the navigation (section-index), but the page and functionality don't exist yet.

The `students` collection in PocketBase has an `active` boolean field to mark enrolled students. We need to extend this to support the enrollment request workflow.

## Goals / Non-Goals

**Goals:**
- Allow admins to view pending enrollment requests (students with `active=false` and `accepted=false`)
- Allow admins to accept a request → marks student as enrolled (`active=true`, `accepted=true`)
- Allow admins to reject a request → soft-deletes with timestamp (`rejected=NOW()`)
- Display student information plus father name in the requests table
- Maintain audit trail with creation and rejection timestamps

**Non-Goals:**
- Father-facing submission page (deferred to future)
- Bulk accept/reject actions (single-row actions only for now)
- Email notifications on accept/reject
- Re-request flow for rejected requests

## Decisions

### 1. New fields on students collection
We add two new fields to track enrollment status:
- `accepted` (bool, default false) - whether the request was approved
- `rejected` (datetime) - timestamp when request was rejected (null = not rejected)

This approach keeps all student data in one collection rather than creating a separate "enrollment_requests" collection. It simplifies the data model since a student record effectively becomes the request.

### 2. Query strategy for pending requests
```
active = false AND accepted = false AND rejected = null
```
This returns only pending requests that haven't been processed.

### 3. UI location
The page lives at `/enrollment-management/requests` as already defined in section-index. No new route needed in the router config beyond the route file.

### 4. Father relationship
Since we're querying `students_fathers` to get father names, we need to join that data. We'll use a similar pattern to the existing students list that includes `father_names`.

## Risks / Trade-offs

**Risks:**
- [Risk] Existing active students might have `accepted=false` → [Mitigation] Query explicitly filters for `active=false`, so active students won't appear
- [Risk] Need to ensure father names are loaded efficiently → [Mitigation] Use existing `listFatherNamesByStudentIds` helper

**Trade-offs:**
- Single collection vs separate collection: Simpler queries but slightly more complex student record handling (need to ignore requests when listing active students)
- Using existing `created` field for submission timestamp is sufficient; no need for additional `submitted_at` field