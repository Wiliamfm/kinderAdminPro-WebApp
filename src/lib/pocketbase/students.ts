import pb, { normalizePocketBaseError } from './client';

export type StudentRecord = {
  id: string;
  name: string;
  grade_id: string;
  grade_name: string;
  date_of_birth: string;
  birth_place: string;
  department: string;
  document_id: string;
  weight: number | null;
  height: number | null;
  blood_type: string;
  social_security: string;
  allergies: string;
  active: boolean;
};

export type StudentCreateInput = {
  name: string;
  grade_id: string;
  date_of_birth: string;
  birth_place: string;
  department: string;
  document_id: string;
  weight: number | null;
  height: number | null;
  blood_type: string;
  social_security: string;
  allergies: string;
};

export type StudentUpdateInput = StudentCreateInput;

type PbStudentPayload = {
  name: string;
  grade_id: string;
  date_of_birth: string;
  birth_place: string;
  department: string;
  document_id: string;
  weight: number | null;
  height: number | null;
  blood_type: string;
  social_security: string;
  allergies: string;
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

function getExpandedGrade(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const grade = expand?.grade_id;

  if (Array.isArray(grade)) {
    return (grade[0] as Record<string, unknown>) ?? null;
  }

  if (grade && typeof grade === 'object') {
    return grade as Record<string, unknown>;
  }

  return null;
}

function mapStudentRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): StudentRecord {
  const expandedGrade = getExpandedGrade(record);

  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    grade_id: toStringValue(record.get?.('grade_id') ?? record.grade_id),
    grade_name: toStringValue(expandedGrade?.name),
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
  };
}

function mapStudentPayload(payload: StudentCreateInput | StudentUpdateInput): PbStudentPayload {
  return {
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
  };
}

export async function listActiveStudents(): Promise<StudentRecord[]> {
  try {
    const records = await pb.collection('students').getFullList({
      sort: 'name',
      expand: 'grade_id',
    });
    return records.map((record) => mapStudentRecord(record)).filter((record) => record.active);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getStudentById(id: string): Promise<StudentRecord> {
  try {
    const record = await pb.collection('students').getOne(id, {
      expand: 'grade_id',
    });
    return mapStudentRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createStudent(payload: StudentCreateInput): Promise<StudentRecord> {
  try {
    const record = await pb.collection('students').create(
      {
        ...mapStudentPayload(payload),
        active: true,
      },
      {
        expand: 'grade_id',
      },
    );
    return mapStudentRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateStudent(id: string, payload: StudentUpdateInput): Promise<StudentRecord> {
  try {
    const record = await pb.collection('students').update(id, mapStudentPayload(payload), {
      expand: 'grade_id',
    });
    return mapStudentRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deactivateStudent(id: string): Promise<void> {
  try {
    await pb.collection('students').update(id, { active: false });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
