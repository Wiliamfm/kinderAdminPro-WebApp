## Context

The father portal (`/father-portal`) currently allows fathers to register students and view bulletins, but provides no communication channel to school staff. The existing email system (`sendEventEmail`) already handles email persistence and SMTP sending. This design leverages that infrastructure to add a contact feature.

## Goals / Non-Goals

**Goals:**
- Add a "Contactar" button to the father portal that opens a modal
- Allow fathers to select multiple employees (admins/professors) from a multi-select dropdown
- Auto-prefix subject with father's email and name: `{fatherEmail} - {fatherName}: {user input}`
- Persist email through existing `sendEventEmail()` function
- Show inline success/error feedback after send

**Non-Goals:**
- Real-time chat or messaging (email only)
- Sending to other fathers (employees only)
- Custom email templates (simple text body)
- File attachments

## Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse `sendEventEmail()` | Already handles DB persistence (email_messages, email_recipients tables) and SMTP sending. No need to create new endpoint. |
| Fetch father data from `fathers` collection | Father records contain `full_name` and `email` fields linked to user_id. Existing pattern in `listFatherStudents()`. |
| Multi-select employees with `listActiveEmployees()` | Returns all active employees (admins + professors) with name and email. Format for display: "Name - email". |
| Inline alerts for feedback | Matches existing pattern in father-portal.tsx (`actionError`, `successMessage` signals with `<Show>` components). |

**Alternative considered:** Create a new API endpoint specifically for father contact. Rejected because `sendEventEmail()` already provides required functionality with proper recipient resolution.

## Risks / Trade-offs

- [Risk] Employee list is fetched on modal open - could be slow with many employees  
  → **Mitigation**: Use existing `listActiveEmployees()` which is already optimized; modal load is acceptable trade-off

- [Risk] Father might not have email set in their record  
  → **Mitigation**: Subject auto-prefix handles empty gracefully; email sending will fail but that's acceptable user error

- [Risk] No way for father to see sent message history  
  → **Mitigation**: Not in scope for v1. Could be added later if requested.

## Open Questions

- Should the modal default to selecting all employees? No, user must explicitly select recipients.
- Should we validate that at least one employee is selected before enabling send? Yes, similar to existing email validation.