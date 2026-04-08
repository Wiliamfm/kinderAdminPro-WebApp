"use server";

import { getCurrentUser } from '../auth';
import { buildBodyHtml } from './html-builder';
import {
  normalizeRecipient,
  normalizeSources,
  resolveRecipientSnapshot,
  type NormalizedRecipient,
  type RecipientSnapshot,
} from './recipients';
import { sendEmail, type SendEmailOptions } from './send';
import {
  createEmailMessage,
  createEmailRecipient,
  updateEmailMessageStats,
  updateEmailRecipient,
  type CreateEmailRecipientOptions,
} from './tracking';

export type SendBulkEmailOptions = {
  subject: string;
  bodyText: string;
  recipients: unknown[];
};

export type BulkEmailRecipientResponse = {
  recipientType: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  status: string;
  errorMessage: string;
  providerMessageId: string;
};

export type SendBulkEmailResult = {
  messageId: string;
  totalResolved: number;
  totalSendable: number;
  totalMissingEmail: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  recipients: BulkEmailRecipientResponse[];
};

function getResendConfig(): { apiKey: string; from: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim() || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || '';
  const fromName = process.env.RESEND_FROM_NAME?.trim() || '';

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  return { apiKey, from };
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildResponseRecipient(snapshot: RecipientSnapshot): BulkEmailRecipientResponse {
  return {
    recipientType: snapshot.recipientType,
    recipientId: snapshot.recipientId,
    recipientName: snapshot.recipientName,
    recipientEmail: snapshot.recipientEmail,
    status: snapshot.status,
    errorMessage: snapshot.errorMessage,
    providerMessageId: snapshot.providerMessageId,
  };
}

export async function sendBulkEmail(
  options: SendBulkEmailOptions,
): Promise<SendBulkEmailResult> {
  const { subject, bodyText, recipients } = options;

  const normalizedSubject = toStringValue(subject);
  const normalizedBodyText = toStringValue(bodyText);
  const bodyHtml = buildBodyHtml(normalizedBodyText);

  if (normalizedSubject.length < 3) {
    throw new Error('El asunto debe tener al menos 3 caracteres.');
  }

  if (!normalizedBodyText) {
    throw new Error('El cuerpo del correo es obligatorio.');
  }

  const normalizedRecipients: NormalizedRecipient[] = [];
  const seen = new Map<string, boolean>();

  for (const raw of recipients) {
    const normalized = normalizeRecipient(raw);
    if (!normalized) continue;

    const key = `${normalized.recipientType}:${normalized.recipientId}`;
    if (!normalized.recipientId || seen.has(key)) continue;

    seen.set(key, true);
    normalizedRecipients.push(normalized);
  }

  if (normalizedRecipients.length === 0) {
    throw new Error('Selecciona al menos un destinatario.');
  }

  const { apiKey, from } = getResendConfig();

  if (!apiKey || !from) {
    throw new Error('La integración de correo no está configurada.');
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Debes iniciar sesión para enviar correos.');
  }

  const userId = user.id;

  const message = await createEmailMessage({
    subject: normalizedSubject,
    bodyText: normalizedBodyText,
    bodyHtml,
    createdBy: userId,
    totalResolved: normalizedRecipients.length,
  });

  let totalSendable = 0;
  let totalMissingEmail = 0;
  let totalSent = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const responseRecipients: BulkEmailRecipientResponse[] = [];

  const sendOptions: SendEmailOptions = {
    apiKey,
    from,
    subject: normalizedSubject,
    text: normalizedBodyText,
    html: bodyHtml,
  };

  for (const recipient of normalizedRecipients) {
    const resolved = await resolveRecipientSnapshot(recipient);
    const snapshot = resolved.data;

    const createRecipientOptions: CreateEmailRecipientOptions = {
      messageId: message.id,
      recipientType: snapshot.recipientType,
      recipientId: snapshot.recipientId,
      recipientName: snapshot.recipientName,
      recipientEmail: snapshot.recipientEmail,
      sourceKind: snapshot.sourceKind,
      sourceContext: snapshot.sourceContext,
      status: snapshot.status,
      providerMessageId: '',
      errorMessage: snapshot.errorMessage,
    };

    const recipientRecord = await createEmailRecipient(createRecipientOptions);

    if (!resolved.ok) {
      totalSkipped++;
      responseRecipients.push(buildResponseRecipient(snapshot));
      continue;
    }

    if (!snapshot.recipientEmail) {
      await updateEmailRecipient({
        recipientId: recipientRecord.id,
        status: 'missing_email',
        errorMessage: 'El destinatario no tiene correo registrado.',
      });
      totalMissingEmail++;
      responseRecipients.push({
        ...buildResponseRecipient(snapshot),
        status: 'missing_email',
        errorMessage: 'El destinatario no tiene correo registrado.',
      });
      continue;
    }

    totalSendable++;

    try {
      const result = await sendEmail({
        ...sendOptions,
        to: [snapshot.recipientEmail],
      });

      await updateEmailRecipient({
        recipientId: recipientRecord.id,
        status: 'sent',
        providerMessageId: result.messageId,
      });

      totalSent++;
      responseRecipients.push({
        ...buildResponseRecipient(snapshot),
        status: 'sent',
        providerMessageId: result.messageId,
        errorMessage: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo enviar el correo.';

      await updateEmailRecipient({
        recipientId: recipientRecord.id,
        status: 'failed',
        errorMessage,
      });

      totalFailed++;
      responseRecipients.push({
        ...buildResponseRecipient(snapshot),
        status: 'failed',
        errorMessage,
        providerMessageId: '',
      });
    }
  }

  await updateEmailMessageStats({
    messageId: message.id,
    totalSendable,
    totalMissingEmail,
    totalSent,
    totalFailed,
    totalSkipped,
  });

  return {
    messageId: message.id,
    totalResolved: normalizedRecipients.length,
    totalSendable,
    totalMissingEmail,
    totalSent,
    totalFailed,
    totalSkipped,
    recipients: responseRecipients,
  };
}
