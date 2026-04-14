## Context

The application sends bulk emails to employees and fathers (via students). Currently uses Resend HTTP API for delivery with per-recipient tracking in PocketBase. The email system consists of:

- `src/lib/server/email/send.ts` - Resend API integration
- `src/lib/server/email/index.ts` - Bulk orchestration with recipient tracking
- `src/lib/server/email/tracking.ts` - PocketBase tracking layer
- Environment: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`

## Goals / Non-Goals

**Goals:**
- Replace Resend with EmailJS SMTP client for email delivery
- Maintain all existing email tracking behavior in PocketBase
- Zero changes to user-facing email behavior
- Configure SMTP credentials via environment variables

**Non-Goals:**
- Add new email capabilities or change template behavior
- Modify tracking schema in PocketBase
- Switch to EmailJS service/SaaS (staying with SMTP only)

## Decisions

### D1: Use `emailjs` package over `@emailjs/nodejs` SDK

The `@emailjs/nodejs` package is tied to EmailJS's SaaS service with templates and limits. The standalone `emailjs` package connects directly to any SMTP server - free unlimited emails.

**Alternative considered:** `@emailjs/nodejs`
- Requires EmailJS account and service tied
- Only 50 free emails/month on free tier

### D2: Keep all tracking unchanged

The current `providerMessageId` field stores Resend's message ID. SMTP returns a simple message ID string. We will generate a unique ID using timestamp + random suffix to maintain tracking compatibility.

**Alternative considered:** Disable tracking
- Rejected: User wants to keep tracking capability

### D3: Create SMTP client per call

Current Resend API is stateless per call. SMTP typically benefits from connection pooling, but for bulk sending with individual recipient tracking, we need per-recipient success/failure isolation anyway. Keep it simple: create client per send.

**Alternative considered:** Connection pooling
- Added complexity for uncertain benefit
- Not needed given per-recipient sends

### D4: Send HTML as attachment

Resend accepts HTML directly in the body. emailjs SMTP sends HTML differently - can either be inline or as attachment. Will use inline HTML to match current behavior.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|---------|------------|
| Gmail SMTP authentication failure | Cannot send emails | Use App Password, enable 2FA |
| SMTP rate limiting | Bulk sends slow | emailjs handles queuing |
| Message ID uniqueness | Tracking could have collisions | Use timestamp + random suffix |

## Migration Plan

1. Install `emailjs` package, remove `resend`
2. Add new env vars to `.env`
3. Update `send.ts` with SMTP implementation
4. Update `index.ts` to use new config keys
5. Test email sending in development

### Rollback

Reverse the process: remove `emailjs`, add back `resend`, restore env vars.