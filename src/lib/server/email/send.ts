"use server";

import { Resend } from 'resend';

export type SendEmailOptions = {
  apiKey: string;
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

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { apiKey, from, to, subject, text, html } = options;

  if (!apiKey) {
    throw new EmailSendError('La clave de API de Resend no está configurada.');
  }

  if (!from) {
    throw new EmailSendError('El correo de origen no está configurado.');
  }

  if (to.length === 0) {
    throw new EmailSendError('No hay destinatarios.');
  }

  const resend = new Resend(apiKey);

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, '<br />')}</p>`,
    });

    if (response.error) {
      throw new EmailSendError(
        response.error.message || 'Resend rechazó la solicitud.',
        400,
      );
    }

    return {
      messageId: response.data?.id || '',
    };
  } catch (error) {
    if (error instanceof EmailSendError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Error desconocido al enviar correo.';
    throw new EmailSendError(message);
  }
}
