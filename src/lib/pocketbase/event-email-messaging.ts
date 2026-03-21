import {
  buildEmailPreviewHtml,
  buildEmailRecipientKey,
  mergeResolvedEmailRecipients,
  type EmailDeliveryStatus,
  type EmailRecipientSource,
  type EmailRecipientSourceKind,
  type EmailRecipientType,
  type ResolvedEmailRecipient,
} from '../event-email-messaging';
import pb, { normalizePocketBaseError } from './client';
import { listActiveEmployees } from './employees';
import { listGrades } from './grades';
import { listActiveStudents } from './students';

export type EmailMessageRecord = {
  id: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  totalResolved: number;
  totalSendable: number;
  totalMissingEmail: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
};

export type EmailMessageRecipientRecord = {
  id: string;
  messageId: string;
  recipientType: EmailRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  sourceKind: EmailRecipientSourceKind | 'mixed';
  sources: EmailRecipientSource[];
  status: EmailDeliveryStatus;
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
};

export type SendEventEmailInput = {
  subject: string;
  bodyText: string;
  recipients: ResolvedEmailRecipient[];
};

export type SendEventEmailRecipientResult = {
  recipientType: EmailRecipientType;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  status: EmailDeliveryStatus;
  errorMessage: string;
  providerMessageId: string;
};

export type SendEventEmailSummary = {
  messageId: string;
  totalResolved: number;
  totalSendable: number;
  totalMissingEmail: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  recipients: SendEventEmailRecipientResult[];
};

type FatherLinkExpandedRecord = Record<string, unknown> & {
  id: string;
  get?: (key: string) => unknown;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function normalizeDateTimeInput(value: unknown): string {
  const normalized = toStringValue(value);
  if (!normalized) return '';
  return normalized.includes(' ') ? normalized.replace(' ', 'T') : normalized;
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildOrFilter(field: string, values: string[]): string {
  return values
    .map((value) => `${field} = "${escapeFilterValue(value)}"`)
    .join(' || ');
}

function getExpandedRecord(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: string,
): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const expanded = expand?.[key];

  if (Array.isArray(expanded)) {
    return (expanded[0] as Record<string, unknown>) ?? null;
  }

  if (expanded && typeof expanded === 'object') {
    return expanded as Record<string, unknown>;
  }

  return null;
}

function mapRecipientSources(value: unknown): EmailRecipientSource[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((source) => ({
        kind: (
          toStringValue(source.kind) === 'student'
          || toStringValue(source.kind) === 'grade'
        )
          ? (toStringValue(source.kind) as EmailRecipientSourceKind)
          : 'employee',
        id: toStringValue(source.id),
        label: toStringValue(source.label) || toStringValue(source.id),
      }))
      .filter((source) => source.id.length > 0);
  } catch {
    return [];
  }
}

function mapEmailMessageRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EmailMessageRecord {
  const expandedCreator = getExpandedRecord(record, 'created_by');

  return {
    id: record.id,
    subject: toStringValue(record.get?.('subject') ?? record.subject),
    bodyText: toStringValue(record.get?.('body_text') ?? record.body_text),
    bodyHtml: toStringValue(record.get?.('body_html') ?? record.body_html),
    createdBy: toStringValue(record.get?.('created_by') ?? record.created_by),
    createdByName: toStringValue(expandedCreator?.name) || 'Usuario',
    createdAt: normalizeDateTimeInput(record.get?.('created_at') ?? record.created_at),
    totalResolved: toNumberValue(record.get?.('total_resolved') ?? record.total_resolved),
    totalSendable: toNumberValue(record.get?.('total_sendable') ?? record.total_sendable),
    totalMissingEmail: toNumberValue(record.get?.('total_missing_email') ?? record.total_missing_email),
    totalSent: toNumberValue(record.get?.('total_sent') ?? record.total_sent),
    totalFailed: toNumberValue(record.get?.('total_failed') ?? record.total_failed),
    totalSkipped: toNumberValue(record.get?.('total_skipped') ?? record.total_skipped),
  };
}

function mapEmailMessageRecipientRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EmailMessageRecipientRecord {
  const sourceKind = toStringValue(record.get?.('source_kind') ?? record.source_kind);
  const recipientType = toStringValue(record.get?.('recipient_type') ?? record.recipient_type);
  const status = toStringValue(record.get?.('status') ?? record.status);

  return {
    id: record.id,
    messageId: toStringValue(record.get?.('message_id') ?? record.message_id),
    recipientType: recipientType === 'father' ? 'father' : 'employee',
    recipientId: toStringValue(record.get?.('recipient_id') ?? record.recipient_id),
    recipientName: toStringValue(record.get?.('recipient_name') ?? record.recipient_name),
    recipientEmail: toStringValue(record.get?.('recipient_email') ?? record.recipient_email),
    sourceKind: (
      sourceKind === 'student' || sourceKind === 'grade' || sourceKind === 'mixed'
    )
      ? sourceKind
      : 'employee',
    sources: mapRecipientSources(record.get?.('source_context') ?? record.source_context),
    status: (
      status === 'sent'
      || status === 'failed'
      || status === 'missing_email'
      || status === 'skipped'
    )
      ? status
      : 'pending',
    providerMessageId: toStringValue(record.get?.('provider_message_id') ?? record.provider_message_id),
    errorMessage: toStringValue(record.get?.('error_message') ?? record.error_message),
    createdAt: normalizeDateTimeInput(record.get?.('created_at') ?? record.created_at),
  };
}

export async function resolveEmployeeRecipients(
  employeeIds: string[],
): Promise<ResolvedEmailRecipient[]> {
  const normalizedIds = Array.from(new Set(employeeIds.map((id) => id.trim()).filter((id) => id.length > 0)));
  if (normalizedIds.length === 0) return [];

  try {
    const employees = await listActiveEmployees();

    return employees
      .filter((employee) => normalizedIds.includes(employee.id))
      .map((employee) => ({
        key: buildEmailRecipientKey('employee', employee.id),
        recipientType: 'employee' as const,
        recipientId: employee.id,
        recipientName: employee.name,
        recipientEmail: employee.email.trim(),
        hasEmail: employee.email.trim().length > 0,
        sources: [
          {
            kind: 'employee' as const,
            id: employee.id,
            label: employee.name,
          },
        ],
      }))
      .sort((left, right) => left.recipientName.localeCompare(right.recipientName, 'es', { sensitivity: 'base' }));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function resolveFatherRecipients(filters: {
  studentIds: string[];
  gradeIds: string[];
}): Promise<ResolvedEmailRecipient[]> {
  const selectedStudentIds = Array.from(new Set(filters.studentIds.map((id) => id.trim()).filter((id) => id.length > 0)));
  const selectedGradeIds = Array.from(new Set(filters.gradeIds.map((id) => id.trim()).filter((id) => id.length > 0)));

  if (selectedStudentIds.length === 0 && selectedGradeIds.length === 0) {
    return [];
  }

  try {
    const [students, grades] = await Promise.all([
      listActiveStudents({ includeFatherNames: false }),
      listGrades(),
    ]);
    const gradeNameById = new Map(grades.map((grade) => [grade.id, grade.name]));
    const targetedStudents = students.filter((student) => (
      selectedStudentIds.includes(student.id) || selectedGradeIds.includes(student.grade_id)
    ));
    const targetStudentIds = targetedStudents.map((student) => student.id);

    if (targetStudentIds.length === 0) {
      return [];
    }

    const studentById = new Map(targetedStudents.map((student) => [student.id, student]));
    const filter = buildOrFilter('student_id', targetStudentIds);
    const records = await pb.collection('students_fathers').getFullList<FatherLinkExpandedRecord>({
      filter,
      expand: 'father_id',
      sort: 'created_at,id',
      fields: 'id,student_id,father_id,expand.father_id.full_name,expand.father_id.email,expand.father_id.is_active',
      requestKey: `event-email-fathers-${targetStudentIds.join(',')}`,
    });

    const recipients: ResolvedEmailRecipient[] = [];

    for (const record of records) {
      const studentId = toStringValue(record.get?.('student_id') ?? record.student_id);
      const fatherId = toStringValue(record.get?.('father_id') ?? record.father_id);
      const expandedFather = getExpandedRecord(record, 'father_id');
      const fatherActive = toBooleanValue(expandedFather?.is_active);
      const student = studentById.get(studentId);

      if (!student || !fatherId || !fatherActive) {
        continue;
      }

      const sources: EmailRecipientSource[] = [];
      if (selectedStudentIds.includes(studentId)) {
        sources.push({
          kind: 'student',
          id: studentId,
          label: student.name,
        });
      }
      if (selectedGradeIds.includes(student.grade_id)) {
        sources.push({
          kind: 'grade',
          id: student.grade_id,
          label: gradeNameById.get(student.grade_id) ?? student.grade_name ?? student.grade_id,
        });
      }

      if (sources.length === 0) {
        continue;
      }

      const fatherEmail = toStringValue(expandedFather?.email);
      recipients.push({
        key: buildEmailRecipientKey('father', fatherId),
        recipientType: 'father',
        recipientId: fatherId,
        recipientName: toStringValue(expandedFather?.full_name) || fatherId,
        recipientEmail: fatherEmail,
        hasEmail: fatherEmail.length > 0,
        sources,
      });
    }

    return mergeResolvedEmailRecipients(recipients);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listEmailMessages(limit = 10): Promise<EmailMessageRecord[]> {
  try {
    const result = await pb.collection('email_messages').getList(1, limit, {
      sort: '-created_at',
      expand: 'created_by',
    });

    return result.items.map((record) => mapEmailMessageRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listEmailMessageRecipients(
  messageId: string,
): Promise<EmailMessageRecipientRecord[]> {
  const normalizedMessageId = messageId.trim();
  if (!normalizedMessageId) return [];

  try {
    const records = await pb.collection('email_message_recipients').getFullList({
      filter: `message_id = "${escapeFilterValue(normalizedMessageId)}"`,
      sort: 'created_at,id',
    });

    return records.map((record) => mapEmailMessageRecipientRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function sendEventEmail(
  input: SendEventEmailInput,
): Promise<SendEventEmailSummary> {
  try {
    const response = await pb.send('/api/tesis/event-email-messaging/send', {
      method: 'POST',
      body: {
        subject: input.subject.trim(),
        bodyText: input.bodyText.trim(),
        bodyHtml: buildEmailPreviewHtml(input.bodyText),
        recipients: input.recipients.map((recipient) => ({
          recipientType: recipient.recipientType,
          recipientId: recipient.recipientId,
          recipientName: recipient.recipientName,
          recipientEmail: recipient.recipientEmail,
          sources: recipient.sources,
        })),
      },
    });

    const mappedResponse = response as Record<string, unknown>;
    const rawRecipients = Array.isArray(mappedResponse.recipients)
      ? mappedResponse.recipients as Array<Record<string, unknown>>
      : [];

    return {
      messageId: toStringValue(mappedResponse.messageId),
      totalResolved: toNumberValue(mappedResponse.totalResolved),
      totalSendable: toNumberValue(mappedResponse.totalSendable),
      totalMissingEmail: toNumberValue(mappedResponse.totalMissingEmail),
      totalSent: toNumberValue(mappedResponse.totalSent),
      totalFailed: toNumberValue(mappedResponse.totalFailed),
      totalSkipped: toNumberValue(mappedResponse.totalSkipped),
      recipients: rawRecipients.map((recipient) => ({
        recipientType: toStringValue(recipient.recipientType) === 'father' ? 'father' : 'employee',
        recipientId: toStringValue(recipient.recipientId),
        recipientName: toStringValue(recipient.recipientName),
        recipientEmail: toStringValue(recipient.recipientEmail),
        status: (
          toStringValue(recipient.status) === 'sent'
          || toStringValue(recipient.status) === 'failed'
          || toStringValue(recipient.status) === 'missing_email'
          || toStringValue(recipient.status) === 'skipped'
        )
          ? toStringValue(recipient.status) as Exclude<EmailDeliveryStatus, 'pending'>
          : 'pending',
        errorMessage: toStringValue(recipient.errorMessage),
        providerMessageId: toStringValue(recipient.providerMessageId),
      })),
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
