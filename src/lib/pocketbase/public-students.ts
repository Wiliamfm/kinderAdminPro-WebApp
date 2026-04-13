import {
  getUniqueFieldErrorMessage,
  isUniqueFieldError,
  normalizePocketBaseError,
  PocketBaseError,
} from './errors';
import type { StudentCreateInput, StudentRecord } from './students';
import { getPublicPb } from './public-client';

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

export async function publicCreateStudent(payload: StudentCreateInput): Promise<StudentRecord> {
  "use server";

  const pb = getPublicPb();

  try {
    const record = await pb.collection('students').create({
      name: payload.name.trim(),
      grade_id: payload.grade_id.trim(),
      date_of_birth: payload.date_of_birth.trim(),
      birth_place: payload.birth_place.trim(),
      department: payload.department.trim(),
      document_id: payload.document_id.trim(),
      weight: payload.weight,
      height: payload.height,
      blood_type: payload.blood_type.trim(),
      social_security: payload.social_security.trim(),
      allergies: payload.allergies.trim(),
      active: true,
      accepted: false,
    });

    return mapStudentRecord(record);
  } catch (error) {
    if (isUniqueFieldError(error, 'document_id')) {
      const normalized = normalizePocketBaseError(error);
      throw new PocketBaseError(
        getUniqueFieldErrorMessage('document_id'),
        normalized.status,
        normalized.isAbort,
      );
    }

    throw normalizePocketBaseError(error);
  }
}
