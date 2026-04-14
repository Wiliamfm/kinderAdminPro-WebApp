## 1. Dependencies

- [x] 1.1 Install `emailjs` package: `npm install emailjs`
- [x] 1.2 Remove `resend` package: `npm remove resend`

## 2. Environment Configuration

- [x] 2.1 Add to `.env`: `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
- [x] 2.2 Remove from `.env`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`

## 3. Email Send Implementation

- [x] 3.1 Update `src/lib/server/email/send.ts`:
  - Replace Resend import with emailjs SMTPClient
  - Update SendEmailOptions type with SMTP config
  - Implement SMTP-based sendEmail function
  - Generate unique messageId (timestamp + random)
- [x] 3.2 Update type exports if needed for new config
- [x] 3.3 Remove unused Resend-related code

## 4. Configuration Reader

- [x] 4.1 Update `src/lib/server/email/index.ts`:
  - Update getResendConfig() → getSmtpConfig()
  - Use new env var names

## 5. Testing

- [x] 5.1 Test email sending in development
- [x] 5.2 Verify recipient tracking works in PocketBase
- [x] 5.3 Check error handling for invalid credentials
