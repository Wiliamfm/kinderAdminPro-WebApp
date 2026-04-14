import type PocketBase from 'pocketbase';
import { DUPLICATE_STUDENT_DOCUMENT_MESSAGE } from '../forms/student-registration';
import { getAuthenticatedPbWithUserId } from '../server/get-authenticated-pb';
import { requireModuleAccess } from '../server/require-module-access';
import {
  isUniqueFieldError,
  normalizePocketBaseError,
  PocketBaseError,
} from './errors';
import type { StudentCreateInput, StudentRecord } from './students';
import type { StudentFatherRelationship } from './students-fathers';

export type FatherStudentRegistrationInput = {
  student: StudentCreateInput;
  relationship: StudentFatherRelationship;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
  }

  return null;
}

function toActiveValue(value: unknown): boolean {
  return value !== false;
}

function mapStudentRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): StudentRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    grade_id: toStringValue(record.get?.('grade_id') ?? record.grade_id),
    grade_name: '',
    date_of_birth: toStringValue(record.get?.('date_of_birth') ?? record.date_of_birth),
    birth_place: toStringValue(record.get?.('birth_place') ?? record.birth_place),
    department: toStringValue(record.get?.('department') ?? record.department),
    document_id: toStringValue(record.get?.('document_id') ?? record.document_id),
    weight: toNumberValue(record.get?.('weight') ?? record.weight),
    height: toNumberValue(record.get?.('height') ?? record.height),
    blood_type: toStringValue(record.get?.('blood_type') ?? record.blood_type),
    social_security: toStringValue(record.get?.('social_security') ?? record.social_security),
    allergies: toStringValue(record.get?.('allergies') ?? record.allergies),
    active: toActiveValue(record.get?.('active') ?? record.active),
    father_names: [],
  };
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function getFatherIdForUser(pb: PocketBase, userId: string): Promise<string> {
  const fathers = await pb.collection('fathers').getList(1, 1, {
    filter: `user_id = "${escapeFilterValue(userId)}"`,
    fields: 'id',
    requestKey: `father-register-student-father-${userId}`,
  });

  const fatherId = fathers.items[0]?.id?.trim() ?? '';
  if (!fatherId) {
    throw new PocketBaseError('No pudimos encontrar tu perfil de acudiente.', 404, false);
  }

  return fatherId;
}

async function studentDocumentExists(pb: PocketBase, documentId: string): Promise<boolean> {
  const result = await pb.collection('students').getList(1, 1, {
    filter: `document_id = "${escapeFilterValue(documentId)}"`,
    fields: 'id',
    requestKey: `father-register-student-document-${documentId}`,
  });

  return result.totalItems > 0;
}

async function rollbackCreatedStudent(pb: PocketBase, studentId: string): Promise<void> {
  if (!studentId) return;

  try {
    await pb.collection('students').delete(studentId);
  } catch (error) {
    console.error('Failed to rollback father portal student registration.', error);
  }
}

export async function checkFatherStudentDocumentIdAvailable(documentId: string): Promise<boolean> {
  "use server";

  await requireModuleAccess('father-portal');
  const { pb, userId } = await getAuthenticatedPbWithUserId();
  const normalizedDocumentId = documentId.trim();

  if (!normalizedDocumentId) {
    return false;
  }

  try {
    await getFatherIdForUser(pb, userId);
    return !(await studentDocumentExists(pb, normalizedDocumentId));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function registerFatherStudent(
  payload: FatherStudentRegistrationInput,
): Promise<StudentRecord> {
  "use server";

  await requireModuleAccess('father-portal');
  const { pb, userId } = await getAuthenticatedPbWithUserId();
  let createdStudentId = '';

  try {
    const fatherId = await getFatherIdForUser(pb, userId);
    const normalizedDocumentId = payload.student.document_id.trim();

    if (await studentDocumentExists(pb, normalizedDocumentId)) {
      throw new PocketBaseError(DUPLICATE_STUDENT_DOCUMENT_MESSAGE, 400, false);
    }

    const createdStudent = await pb.collection('students').create({
      name: payload.student.name.trim(),
      grade_id: payload.student.grade_id.trim(),
      date_of_birth: payload.student.date_of_birth.trim(),
      birth_place: payload.student.birth_place.trim(),
      department: payload.student.department.trim(),
      document_id: normalizedDocumentId,
      weight: payload.student.weight,
      height: payload.student.height,
      blood_type: payload.student.blood_type.trim(),
      social_security: payload.student.social_security.trim(),
      allergies: payload.student.allergies.trim(),
      active: true,
      accepted: false,
    });
    createdStudentId = createdStudent.id;

    try {
      await pb.collection('students_fathers').create({
        student_id: createdStudent.id,
        father_id: fatherId,
        relationship: payload.relationship,
      });
    } catch (error) {
      await rollbackCreatedStudent(pb, createdStudent.id);
      createdStudentId = '';
      throw error;
    }

    return mapStudentRecord(createdStudent);
  } catch (error) {
    if (isUniqueFieldError(error, 'document_id')) {
      const normalized = normalizePocketBaseError(error);
      throw new PocketBaseError(
        DUPLICATE_STUDENT_DOCUMENT_MESSAGE,
        normalized.status,
        normalized.isAbort,
      );
    }

    if (createdStudentId) {
      await rollbackCreatedStudent(pb, createdStudentId);
    }

    throw normalizePocketBaseError(error);
  }
}
