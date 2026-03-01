import pb, { normalizePocketBaseError } from './client';

export const STUDENT_FATHER_RELATIONSHIPS = ['father', 'mother', 'other'] as const;

export type StudentFatherRelationship = (typeof STUDENT_FATHER_RELATIONSHIPS)[number];

export type StudentFatherLinkRecord = {
  id: string;
  studentId: string;
  fatherId: string;
  relationship: StudentFatherRelationship;
  studentName: string;
  studentActive: boolean;
  fatherName: string;
  fatherActive: boolean;
};

export type StudentFatherLinkInput = {
  fatherId: string;
  relationship: StudentFatherRelationship;
};

export type FatherStudentLinkInput = {
  studentId: string;
  relationship: StudentFatherRelationship;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toActiveValue(value: unknown): boolean {
  return value !== false;
}

function toRelationship(value: unknown): StudentFatherRelationship {
  const normalized = toStringValue(value);
  if (normalized === 'father' || normalized === 'mother' || normalized === 'other') {
    return normalized;
  }

  return 'other';
}

function getExpandedRecord(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: 'student_id' | 'father_id',
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

function mapStudentFatherLinkRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): StudentFatherLinkRecord {
  const expandedStudent = getExpandedRecord(record, 'student_id');
  const expandedFather = getExpandedRecord(record, 'father_id');

  return {
    id: record.id,
    studentId: toStringValue(record.get?.('student_id') ?? record.student_id),
    fatherId: toStringValue(record.get?.('father_id') ?? record.father_id),
    relationship: toRelationship(record.get?.('relationship') ?? record.relationship),
    studentName: toStringValue(expandedStudent?.name),
    studentActive: toActiveValue(expandedStudent?.active),
    fatherName: toStringValue(expandedFather?.full_name),
    fatherActive: toActiveValue(expandedFather?.is_active),
  };
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildOrFilter(field: string, values: string[]): string {
  if (values.length === 0) return '';

  return values
    .map((value) => `${field} = "${escapeFilterValue(value)}"`)
    .join(' || ');
}

function validateStudentLinkInputs(links: StudentFatherLinkInput[]): void {
  const seenFatherIds = new Set<string>();

  for (const link of links) {
    const fatherId = link.fatherId.trim();
    if (!fatherId) {
      throw new Error('Cada vínculo debe incluir un tutor.');
    }

    if (
      link.relationship !== 'father'
      && link.relationship !== 'mother'
      && link.relationship !== 'other'
    ) {
      throw new Error('Cada vínculo debe incluir una relación válida.');
    }

    if (seenFatherIds.has(fatherId)) {
      throw new Error('No se permiten tutores duplicados en los vínculos.');
    }

    seenFatherIds.add(fatherId);
  }
}

function validateFatherLinkInputs(links: FatherStudentLinkInput[]): void {
  const seenStudentIds = new Set<string>();

  for (const link of links) {
    const studentId = link.studentId.trim();
    if (!studentId) {
      throw new Error('Cada vínculo debe incluir un estudiante.');
    }

    if (
      link.relationship !== 'father'
      && link.relationship !== 'mother'
      && link.relationship !== 'other'
    ) {
      throw new Error('Cada vínculo debe incluir una relación válida.');
    }

    if (seenStudentIds.has(studentId)) {
      throw new Error('No se permiten estudiantes duplicados en los vínculos.');
    }

    seenStudentIds.add(studentId);
  }
}

type ExistingStudentLink = {
  id: string;
  father_id: string;
  relationship: StudentFatherRelationship;
};

type ExistingFatherLink = {
  id: string;
  student_id: string;
  relationship: StudentFatherRelationship;
};

async function cleanupCreatedLinks(linkIds: string[]): Promise<void> {
  for (const linkId of linkIds) {
    try {
      await pb.collection('students_fathers').delete(linkId);
    } catch {
      // Ignore rollback errors to preserve original failure context.
    }
  }
}

export async function listLinksByStudentId(studentId: string): Promise<StudentFatherLinkRecord[]> {
  try {
    const normalizedStudentId = studentId.trim();
    if (!normalizedStudentId) return [];

    const records = await pb.collection('students_fathers').getFullList({
      filter: `student_id = "${escapeFilterValue(normalizedStudentId)}"`,
      expand: 'student_id,father_id',
      sort: 'id',
      requestKey: `students-fathers-links-student-${normalizedStudentId}`,
    });

    return records.map((record) => mapStudentFatherLinkRecord(record));
  } catch (error) {
    const normalized = normalizePocketBaseError(error);
    const message = normalized.message.toLowerCase();
    const isAbortLike = normalized.isAbort
      || message.includes('request was aborted')
      || message.includes('autocancel');

    if (isAbortLike) {
      console.warn('Ignoring PocketBase auto-cancelled request in listLinksByStudentId.', normalized);
      return [];
    }

    throw normalized;
  }
}

export async function listLinksByFatherId(fatherId: string): Promise<StudentFatherLinkRecord[]> {
  try {
    const normalizedFatherId = fatherId.trim();
    if (!normalizedFatherId) return [];

    const records = await pb.collection('students_fathers').getFullList({
      filter: `father_id = "${escapeFilterValue(normalizedFatherId)}"`,
      expand: 'student_id,father_id',
      sort: 'id',
      requestKey: `students-fathers-links-father-${normalizedFatherId}`,
    });

    return records.map((record) => mapStudentFatherLinkRecord(record));
  } catch (error) {
    const normalized = normalizePocketBaseError(error);
    const message = normalized.message.toLowerCase();
    const isAbortLike = normalized.isAbort
      || message.includes('request was aborted')
      || message.includes('autocancel');

    if (isAbortLike) {
      console.warn('Ignoring PocketBase auto-cancelled request in listLinksByFatherId.', normalized);
      return [];
    }

    throw normalized;
  }
}

export async function createLinksForStudent(
  studentId: string,
  links: StudentFatherLinkInput[],
): Promise<void> {
  const createdLinkIds: string[] = [];

  try {
    const normalizedStudentId = studentId.trim();
    validateStudentLinkInputs(links);

    for (const link of links) {
      const created = await pb.collection('students_fathers').create({
        student_id: normalizedStudentId,
        father_id: link.fatherId.trim(),
        relationship: link.relationship,
      });
      createdLinkIds.push(created.id);
    }
  } catch (error) {
    if (createdLinkIds.length > 0) {
      await cleanupCreatedLinks(createdLinkIds);
    }
    throw normalizePocketBaseError(error);
  }
}

export async function createLinksForFather(
  fatherId: string,
  links: FatherStudentLinkInput[],
): Promise<void> {
  const createdLinkIds: string[] = [];

  try {
    const normalizedFatherId = fatherId.trim();
    validateFatherLinkInputs(links);

    for (const link of links) {
      const created = await pb.collection('students_fathers').create({
        student_id: link.studentId.trim(),
        father_id: normalizedFatherId,
        relationship: link.relationship,
      });
      createdLinkIds.push(created.id);
    }
  } catch (error) {
    if (createdLinkIds.length > 0) {
      await cleanupCreatedLinks(createdLinkIds);
    }
    throw normalizePocketBaseError(error);
  }
}

export async function replaceLinksForStudent(
  studentId: string,
  links: StudentFatherLinkInput[],
): Promise<void> {
  try {
    const normalizedStudentId = studentId.trim();
    validateStudentLinkInputs(links);

    const existing = await pb.collection('students_fathers').getFullList<ExistingStudentLink>({
      filter: `student_id = "${escapeFilterValue(normalizedStudentId)}"`,
      fields: 'id,father_id,relationship',
    });
    const existingByFatherId = new Map<string, ExistingStudentLink>();
    for (const existingLink of existing) {
      existingByFatherId.set(existingLink.father_id, existingLink);
    }

    for (const link of links) {
      const fatherId = link.fatherId.trim();
      const existingLink = existingByFatherId.get(fatherId);
      if (existingLink) {
        if (toRelationship(existingLink.relationship) !== link.relationship) {
          await pb.collection('students_fathers').update(existingLink.id, {
            relationship: link.relationship,
          });
        }
        existingByFatherId.delete(fatherId);
        continue;
      }

      await pb.collection('students_fathers').create({
        student_id: normalizedStudentId,
        father_id: fatherId,
        relationship: link.relationship,
      });
    }

    for (const staleLink of existingByFatherId.values()) {
      await pb.collection('students_fathers').delete(staleLink.id);
    }
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function replaceLinksForFather(
  fatherId: string,
  links: FatherStudentLinkInput[],
): Promise<void> {
  try {
    const normalizedFatherId = fatherId.trim();
    validateFatherLinkInputs(links);

    const existing = await pb.collection('students_fathers').getFullList<ExistingFatherLink>({
      filter: `father_id = "${escapeFilterValue(normalizedFatherId)}"`,
      fields: 'id,student_id,relationship',
    });
    const existingByStudentId = new Map<string, ExistingFatherLink>();
    for (const existingLink of existing) {
      existingByStudentId.set(existingLink.student_id, existingLink);
    }

    for (const link of links) {
      const studentId = link.studentId.trim();
      const existingLink = existingByStudentId.get(studentId);
      if (existingLink) {
        if (toRelationship(existingLink.relationship) !== link.relationship) {
          await pb.collection('students_fathers').update(existingLink.id, {
            relationship: link.relationship,
          });
        }
        existingByStudentId.delete(studentId);
        continue;
      }

      await pb.collection('students_fathers').create({
        student_id: studentId,
        father_id: normalizedFatherId,
        relationship: link.relationship,
      });
    }

    for (const staleLink of existingByStudentId.values()) {
      await pb.collection('students_fathers').delete(staleLink.id);
    }
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function countLinksByFatherId(fatherId: string): Promise<number> {
  try {
    const normalizedFatherId = fatherId.trim();
    if (!normalizedFatherId) return 0;

    const result = await pb.collection('students_fathers').getList(1, 1, {
      filter: `father_id = "${escapeFilterValue(normalizedFatherId)}"`,
    });

    return result.totalItems;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function countLinksByStudentId(studentId: string): Promise<number> {
  try {
    const normalizedStudentId = studentId.trim();
    if (!normalizedStudentId) return 0;

    const result = await pb.collection('students_fathers').getList(1, 1, {
      filter: `student_id = "${escapeFilterValue(normalizedStudentId)}"`,
    });

    return result.totalItems;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listFatherNamesByStudentIds(
  studentIds: string[],
): Promise<Record<string, string[]>> {
  try {
    const normalizedIds = studentIds.map((id) => id.trim()).filter((id) => id.length > 0);
    if (normalizedIds.length === 0) return {};

    const filter = buildOrFilter('student_id', normalizedIds);
    const records = await pb.collection('students_fathers').getFullList({
      filter,
      expand: 'father_id',
      fields: 'id,student_id,father_id,expand.father_id.full_name,expand.father_id.is_active',
    });

    const map: Record<string, string[]> = {};
    for (const studentId of normalizedIds) {
      map[studentId] = [];
    }

    for (const record of records) {
      const mapped = mapStudentFatherLinkRecord(record);
      if (!mapped.fatherActive || mapped.fatherName.length === 0) continue;

      const existing = map[mapped.studentId] ?? [];
      if (!existing.includes(mapped.fatherName)) {
        existing.push(mapped.fatherName);
      }
      map[mapped.studentId] = existing;
    }

    return map;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listStudentNamesByFatherIds(
  fatherIds: string[],
): Promise<Record<string, string[]>> {
  try {
    const normalizedIds = fatherIds.map((id) => id.trim()).filter((id) => id.length > 0);
    if (normalizedIds.length === 0) return {};

    const filter = buildOrFilter('father_id', normalizedIds);
    const records = await pb.collection('students_fathers').getFullList({
      filter,
      expand: 'student_id',
      fields: 'id,father_id,student_id,expand.student_id.name,expand.student_id.active',
    });

    const map: Record<string, string[]> = {};
    for (const fatherId of normalizedIds) {
      map[fatherId] = [];
    }

    for (const record of records) {
      const mapped = mapStudentFatherLinkRecord(record);
      if (!mapped.studentActive || mapped.studentName.length === 0) continue;

      const existing = map[mapped.fatherId] ?? [];
      if (!existing.includes(mapped.studentName)) {
        existing.push(mapped.studentName);
      }
      map[mapped.fatherId] = existing;
    }

    return map;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
