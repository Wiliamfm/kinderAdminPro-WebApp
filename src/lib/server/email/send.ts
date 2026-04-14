"use server";

import { SMTPClient, SMTPError, SMTPErrorStates } from 'emailjs';

export type SendEmailOptions = {
  user: string;
  password: string;
  host: string;
  port: number;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  messageId: string;
};

export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

function buildHtmlFallback(text: string): string {
  return `<p>${text.replace(/\n/g, '<br />')}</p>`;
}

function buildMessageId(host: string): string {
  const timestamp = Date.now();
  const suffix = Math.random().toString(36).slice(2, 10);
  const domain = host.trim().toLowerCase().replace(/[^a-z0-9.-]/g, '') || 'localhost';

  return `<smtp-${timestamp}-${suffix}@${domain}>`;
}

function getTransportSecurity(port: number): { ssl: boolean; tls: boolean } {
  if (port === 465) {
    return { ssl: true, tls: false };
  }

  if (port === 587) {
    return { ssl: false, tls: true };
  }

  return { ssl: false, tls: false };
}

function normalizeSendError(error: unknown): string {
  if (error instanceof SMTPError) {
    if (
      error.code === SMTPErrorStates.AUTHFAILED
      || error.code === SMTPErrorStates.CONNECTIONAUTH
    ) {
      return 'Las credenciales SMTP no son válidas.';
    }

    if (
      error.code === SMTPErrorStates.COULDNOTCONNECT
      || error.code === SMTPErrorStates.CONNECTIONCLOSED
      || error.code === SMTPErrorStates.CONNECTIONENDED
      || error.code === SMTPErrorStates.NOCONNECTION
    ) {
      return 'No se pudo conectar con el servidor SMTP.';
    }

    if (error.code === SMTPErrorStates.TIMEDOUT) {
      return 'El servidor SMTP tardó demasiado en responder.';
    }
  }

  return error instanceof Error ? error.message : 'Error desconocido al enviar correo.';
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { user, password, host, port, from, to, subject, text, html } = options;

  if (!user) {
    throw new EmailSendError('El usuario SMTP no está configurado.');
  }

  if (!password) {
    throw new EmailSendError('La contraseña SMTP no está configurada.');
  }

  if (!host) {
    throw new EmailSendError('El servidor SMTP no está configurado.');
  }

  if (!Number.isInteger(port) || port <= 0) {
    throw new EmailSendError('El puerto SMTP no es válido.');
  }

  if (!from) {
    throw new EmailSendError('El correo de origen no está configurado.');
  }

  if (to.length === 0) {
    throw new EmailSendError('No hay destinatarios.');
  }

  const messageId = buildMessageId(host);
  const { ssl, tls } = getTransportSecurity(port);
  const client = new SMTPClient({
    user,
    password,
    host,
    port,
    ssl,
    tls,
  });

  try {
    await client.sendAsync({
      'message-id': messageId,
      from,
      to,
      subject,
      text,
      attachment: [
        {
          data: html || buildHtmlFallback(text),
          alternative: true,
          type: 'text/html; charset=utf-8',
        },
      ],
    });

    return {
      messageId,
    };
  } catch (error) {
    if (error instanceof EmailSendError) {
      throw error;
    }

    const message = normalizeSendError(error);
    throw new EmailSendError(message);
  } finally {
    client.smtp.close();
  }
}
