import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const sendAsync = vi.fn();
  const close = vi.fn();
  const SMTPClient = vi.fn(function SMTPClient() {
    return {
      sendAsync,
      smtp: {
        close,
      },
    };
  });

  class MockSMTPError extends Error {
    constructor(
      message: string,
      public readonly code: number | null = null,
    ) {
      super(message);
      this.name = 'SMTPError';
    }
  }

  return {
    sendAsync,
    close,
    SMTPClient,
    MockSMTPError,
  };
});

vi.mock('emailjs', () => {
  const SMTPErrorStates = {
    COULDNOTCONNECT: 1,
    BADRESPONSE: 2,
    AUTHFAILED: 3,
    TIMEDOUT: 4,
    ERROR: 5,
    NOCONNECTION: 6,
    AUTHNOTSUPPORTED: 7,
    CONNECTIONCLOSED: 8,
    CONNECTIONENDED: 9,
    CONNECTIONAUTH: 10,
  };

  return {
    SMTPClient: hoisted.SMTPClient,
    SMTPError: hoisted.MockSMTPError,
    SMTPErrorStates,
  };
});

import { sendEmail } from './send';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.sendAsync.mockResolvedValue({});
  });

  it('sends HTML email through SMTP and returns the generated message id', async () => {
    const result = await sendEmail({
      user: 'mailer@example.com',
      password: 'app-password',
      host: 'smtp.gmail.com',
      port: 587,
      from: 'School <mailer@example.com>',
      to: ['parent@example.com'],
      subject: 'Recordatorio',
      text: 'Linea uno',
      html: '<p>Linea uno</p>',
    });

    expect(hoisted.SMTPClient).toHaveBeenCalledWith({
      user: 'mailer@example.com',
      password: 'app-password',
      host: 'smtp.gmail.com',
      port: 587,
      ssl: false,
      tls: true,
    });
    expect(hoisted.sendAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'School <mailer@example.com>',
        to: ['parent@example.com'],
        subject: 'Recordatorio',
        text: 'Linea uno',
        attachment: [
          {
            data: '<p>Linea uno</p>',
            alternative: true,
            type: 'text/html; charset=utf-8',
          },
        ],
        'message-id': result.messageId,
      }),
    );
    expect(result.messageId).toMatch(/^<smtp-\d+-[a-z0-9]+@smtp\.gmail\.com>$/);
    expect(hoisted.close).toHaveBeenCalledTimes(1);
  });

  it('builds fallback HTML from plain text when html is omitted', async () => {
    await sendEmail({
      user: 'mailer@example.com',
      password: 'app-password',
      host: 'smtp.example.com',
      port: 465,
      from: 'mailer@example.com',
      to: ['parent@example.com'],
      subject: 'Recordatorio',
      text: 'Linea uno\nLinea dos',
    });

    expect(hoisted.SMTPClient).toHaveBeenCalledWith({
      user: 'mailer@example.com',
      password: 'app-password',
      host: 'smtp.example.com',
      port: 465,
      ssl: true,
      tls: false,
    });
    expect(hoisted.sendAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: [
          expect.objectContaining({
            data: '<p>Linea uno<br />Linea dos</p>',
          }),
        ],
      }),
    );
  });

  it('maps SMTP auth failures to a safe error message', async () => {
    hoisted.sendAsync.mockRejectedValue(
      new hoisted.MockSMTPError('authorization.failed', 3),
    );

    await expect(sendEmail({
      user: 'mailer@example.com',
      password: 'wrong-password',
      host: 'smtp.gmail.com',
      port: 587,
      from: 'mailer@example.com',
      to: ['parent@example.com'],
      subject: 'Recordatorio',
      text: 'Linea uno',
    })).rejects.toThrow('Las credenciales SMTP no son válidas.');

    expect(hoisted.close).toHaveBeenCalledTimes(1);
  });
});
