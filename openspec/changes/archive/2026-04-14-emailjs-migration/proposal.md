## Why

The application currently uses Resend for email delivery. Resend provides 3,000 free emails/month which requires a credit card setup and adds ongoing cost management. The EmailJS SMTP client provides unlimited email delivery by connecting directly to Gmail's SMTP servers, eliminating the per-email cost entirely.

## What Changes

- Replace the `resend` package with `emailjs` (SMTP client)
- Update `src/lib/server/email/send.ts` to use SMTP client instead of Resend API
- Add new environment variables: `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`
- Remove environment variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`
- Keep all existing email tracking behavior in PocketBase unchanged

## Capabilities

### New Capabilities
- This migration does not introduce new capabilities

### Modified Capabilities
- (none - implementation swap only, no behavior changes)

## Impact

- **Dependencies**: Package.json swaps `resend` for `emailjs`
- **Configuration**: .env file updates with SMTP credentials
- **Code**: `src/lib/server/email/send.ts` - email sending implementation
- **Code**: `src/lib/server/email/index.ts` - update to use new config keys
- **Tracking**: No changes - maintains existing PocketBase email tracking