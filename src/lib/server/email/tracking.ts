"use server";

import { getAuthenticatedPb, getAuthenticatedPbWithUserId } from '../get-authenticated-pb';
import type { SourceKind } from './recipients';

export type EmailMessageStatus = 'pending' | 'sent' | 'partial' | 'failed';

export type EmailMessageRecord = {
  id: string;
  subject: string;
  body_text: string;
  body_html: string;
  created_by: string;
  total_resolved: number;
  total_sendable: number;
  total_missing_email: number;
  total_sent: number;
  total_failed: number;
  total_skipped: number;
};

export type EmailRecipientRecord = {
  id: string;
  message_id: string;
  recipient_type: 'father' | 'employee';
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  source_kind: SourceKind;
  source_context: string;
  status: 'pending' | 'skipped' | 'missing_email' | 'sent' | 'failed';
  provider_message_id: string;
  error_message: string;
};

export type CreateEmailMessageOptions = {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  createdBy: string;
  totalResolved: number;
};

export async function createEmailMessage(
  options: CreateEmailMessageOptions,
): Promise<EmailMessageRecord> {
  const { pb } = await getAuthenticatedPbWithUserId();

  const record = await pb.collection('email_messages').create({
    subject: options.subject,
    body_text: options.bodyText,
    body_html: options.bodyHtml,
    created_by: options.createdBy,
    total_resolved: options.totalResolved,
    total_sendable: 0,
    total_missing_email: 0,
    total_sent: 0,
    total_failed: 0,
    total_skipped: 0,
  });

  return {
    id: record.id,
    subject: record.subject,
    body_text: record.body_text,
    body_html: record.body_html,
    created_by: record.created_by,
    total_resolved: record.total_resolved,
    total_sendable: record.total_sendable,
    total_missing_email: record.total_missing_email,
    total_sent: record.total_sent,
    total_failed: record.total_failed,
    total_skipped: record.total_skipped,
  };
}

export type CreateEmailRecipientOptions = {
  messageId: string;
  recipientType: 'father' | 'employee';
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  sourceKind: SourceKind;
  sourceContext: string;
  status: 'pending' | 'skipped' | 'missing_email' | 'sent' | 'failed';
  providerMessageId: string;
  errorMessage: string;
};

export async function createEmailRecipient(
  options: CreateEmailRecipientOptions,
): Promise<EmailRecipientRecord> {
  const pb = await getAuthenticatedPb();

  const record = await pb.collection('email_message_recipients').create({
    message_id: options.messageId,
    recipient_type: options.recipientType,
    recipient_id: options.recipientId,
    recipient_name: options.recipientName,
    recipient_email: options.recipientEmail,
    source_kind: options.sourceKind,
    source_context: options.sourceContext,
    status: options.status,
    provider_message_id: options.providerMessageId,
    error_message: options.errorMessage,
  });

  return {
    id: record.id,
    message_id: record.message_id,
    recipient_type: record.recipient_type as 'father' | 'employee',
    recipient_id: record.recipient_id,
    recipient_name: record.recipient_name,
    recipient_email: record.recipient_email,
    source_kind: record.source_kind as SourceKind,
    source_context: record.source_context,
    status: record.status as EmailRecipientRecord['status'],
    provider_message_id: record.provider_message_id,
    error_message: record.error_message,
  };
}

export type UpdateEmailRecipientOptions = {
  recipientId: string;
  status: EmailRecipientRecord['status'];
  providerMessageId?: string;
  errorMessage?: string;
};

export async function updateEmailRecipient(
  options: UpdateEmailRecipientOptions,
): Promise<EmailRecipientRecord> {
  const pb = await getAuthenticatedPb();

  const updateData: Record<string, unknown> = {
    status: options.status,
  };

  if (options.providerMessageId !== undefined) {
    updateData.provider_message_id = options.providerMessageId;
  }

  if (options.errorMessage !== undefined) {
    updateData.error_message = options.errorMessage;
  }

  const record = await pb.collection('email_message_recipients').update(
    options.recipientId,
    updateData,
  );

  return {
    id: record.id,
    message_id: record.message_id,
    recipient_type: record.recipient_type as 'father' | 'employee',
    recipient_id: record.recipient_id,
    recipient_name: record.recipient_name,
    recipient_email: record.recipient_email,
    source_kind: record.source_kind as SourceKind,
    source_context: record.source_context,
    status: record.status as EmailRecipientRecord['status'],
    provider_message_id: record.provider_message_id,
    error_message: record.error_message,
  };
}

export type UpdateEmailMessageStatsOptions = {
  messageId: string;
  totalSendable: number;
  totalMissingEmail: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
};

export async function updateEmailMessageStats(
  options: UpdateEmailMessageStatsOptions,
): Promise<EmailMessageRecord> {
  const pb = await getAuthenticatedPb();

  const record = await pb.collection('email_messages').update(options.messageId, {
    total_sendable: options.totalSendable,
    total_missing_email: options.totalMissingEmail,
    total_sent: options.totalSent,
    total_failed: options.totalFailed,
    total_skipped: options.totalSkipped,
  });

  return {
    id: record.id,
    subject: record.subject,
    body_text: record.body_text,
    body_html: record.body_html,
    created_by: record.created_by,
    total_resolved: record.total_resolved,
    total_sendable: record.total_sendable,
    total_missing_email: record.total_missing_email,
    total_sent: record.total_sent,
    total_failed: record.total_failed,
    total_skipped: record.total_skipped,
  };
}
