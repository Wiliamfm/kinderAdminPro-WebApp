"use server";

import { getAuthenticatedPb } from '../get-authenticated-pb';

export type SourceKind = 'student' | 'grade' | 'employee' | 'mixed';

export type Source = {
  kind: SourceKind;
  id: string;
  label: string;
};

export type RecipientInput = {
  recipientType: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  sources: Source[];
};

export type NormalizedRecipient = {
  recipientType: 'father' | 'employee';
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  sources: Source[];
  studentIds: string[];
  gradeIds: string[];
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

export function normalizeSource(rawSource: unknown): Source | null {
  const source = rawSource as Record<string, unknown> | undefined;
  if (!source) return null;

  const kind = toStringValue(source.kind);
  const id = toStringValue(source.id);
  const label = toStringValue(source.label);

  if (!kind || !id) return null;

  return {
    kind: kind === 'student' || kind === 'grade' ? (kind as SourceKind) : 'employee',
    id,
    label: label || id,
  };
}

export function normalizeSources(rawSources: unknown): Source[] {
  if (!Array.isArray(rawSources)) return [];

  const seen = new Map<string, boolean>();
  const result: Source[] = [];

  for (const rawSource of rawSources) {
    const source = normalizeSource(rawSource);
    if (!source) continue;

    const key = `${source.kind}:${source.id}`;
    if (seen.has(key)) continue;

    seen.set(key, true);
    result.push(source);
  }

  return result;
}

export function deriveSourceKind(sources: Source[]): SourceKind {
  if (sources.length === 0) return 'mixed';

  let currentKind = sources[0].kind;
  for (let i = 1; i < sources.length; i++) {
    if (sources[i].kind !== currentKind) {
      return 'mixed';
    }
  }

  return currentKind;
}

export function normalizeRecipient(rawRecipient: unknown): NormalizedRecipient | null {
  const recipient = rawRecipient as RecipientInput | undefined;
  if (!recipient) return null;

  const sources = normalizeSources(recipient.sources);

  return {
    recipientType: toStringValue(recipient.recipientType) === 'father' ? 'father' : 'employee',
    recipientId: toStringValue(recipient.recipientId),
    recipientName: toStringValue(recipient.recipientName),
    recipientEmail: toStringValue(recipient.recipientEmail),
    sources,
    studentIds: sources.filter((s) => s.kind === 'student').map((s) => s.id),
    gradeIds: sources.filter((s) => s.kind === 'grade').map((s) => s.id),
  };
}

export type RecipientSnapshot = {
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

export type ResolveResult = {
  ok: boolean;
  data: RecipientSnapshot;
};

async function findEmployeeRecord(employeeId: string) {
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('employees').getOne(employeeId, {
      requestKey: `email-recipient-employee-${employeeId}`,
    });
    return record;
  } catch {
    return null;
  }
}

async function findFatherRecord(fatherId: string) {
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('fathers').getOne(fatherId, {
      requestKey: `email-recipient-father-${fatherId}`,
    });
    return record;
  } catch {
    return null;
  }
}

async function findStudentRecord(studentId: string) {
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('students').getOne(studentId, {
      requestKey: `email-recipient-student-${studentId}`,
    });
    return record;
  } catch {
    return null;
  }
}

async function validateFatherSources(
  fatherId: string,
  studentIds: string[],
  gradeIds: string[],
): Promise<boolean> {
  if (studentIds.length === 0 && gradeIds.length === 0) {
    return false;
  }

  const pb = await getAuthenticatedPb();

  try {
    const links = await pb.collection('students_fathers').getFullList({
      filter: `father_id = "${fatherId}"`,
      fields: 'student_id',
      requestKey: `email-father-links-${fatherId}`,
    });

    for (const link of links) {
      const studentId = toStringValue(link.student_id);
      if (!studentId) continue;

      const student = await findStudentRecord(studentId);
      if (!student || !toBooleanValue(student.active)) continue;

      const gradeId = toStringValue(student.grade_id);
      if (studentIds.includes(studentId) || gradeIds.includes(gradeId)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function createFallbackSnapshot(
  recipient: NormalizedRecipient,
  status: RecipientSnapshot['status'],
  errorMessage: string,
): RecipientSnapshot {
  return {
    recipientType: recipient.recipientType,
    recipientId: recipient.recipientId,
    recipientName: recipient.recipientName || recipient.recipientId,
    recipientEmail: recipient.recipientEmail,
    sourceKind: deriveSourceKind(recipient.sources),
    sourceContext: JSON.stringify(recipient.sources),
    status,
    providerMessageId: '',
    errorMessage,
  };
}

export async function resolveRecipientSnapshot(
  recipient: NormalizedRecipient,
): Promise<ResolveResult> {
  if (!recipient.recipientId) {
    return {
      ok: false,
      data: createFallbackSnapshot(recipient, 'skipped', 'El destinatario no es válido.'),
    };
  }

  if (recipient.recipientType === 'employee') {
    const employee = await findEmployeeRecord(recipient.recipientId);
    if (!employee || !toBooleanValue(employee.active)) {
      return {
        ok: false,
        data: createFallbackSnapshot(
          recipient,
          'skipped',
          'El empleado ya no está activo o no existe.',
        ),
      };
    }

    return {
      ok: true,
      data: {
        ...createFallbackSnapshot(recipient, 'pending', ''),
        recipientName: toStringValue(employee.name) || recipient.recipientName,
        recipientEmail: toStringValue(employee.email) || recipient.recipientEmail,
      },
    };
  }

  const father = await findFatherRecord(recipient.recipientId);
  if (!father || !toBooleanValue(father.is_active)) {
    return {
      ok: false,
      data: createFallbackSnapshot(
        recipient,
        'skipped',
        'El padre o tutor ya no está activo o no existe.',
      ),
    };
  }

  const isValid = await validateFatherSources(
    recipient.recipientId,
    recipient.studentIds,
    recipient.gradeIds,
  );

  if (!isValid) {
    return {
      ok: false,
      data: createFallbackSnapshot(
        recipient,
        'skipped',
        'El padre o tutor ya no coincide con los filtros seleccionados.',
      ),
    };
  }

  return {
    ok: true,
    data: {
      ...createFallbackSnapshot(recipient, 'pending', ''),
      recipientName: toStringValue(father.full_name) || recipient.recipientName,
      recipientEmail: toStringValue(father.email) || recipient.recipientEmail,
    },
  };
}

export async function resolveRecipients(
  rawRecipients: unknown[],
): Promise<{ valid: NormalizedRecipient[]; invalid: NormalizedRecipient[] }> {
  const seen = new Map<string, boolean>();
  const valid: NormalizedRecipient[] = [];
  const invalid: NormalizedRecipient[] = [];

  for (const raw of rawRecipients) {
    const normalized = normalizeRecipient(raw);
    if (!normalized) continue;

    const key = `${normalized.recipientType}:${normalized.recipientId}`;
    if (!normalized.recipientId || seen.has(key)) continue;

    seen.set(key, true);

    if (normalized.recipientId) {
      valid.push(normalized);
    } else {
      invalid.push(normalized);
    }
  }

  return { valid, invalid };
}
