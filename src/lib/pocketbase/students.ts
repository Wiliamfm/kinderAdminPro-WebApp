import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';
import { listFatherNamesByStudentIds } from './students-fathers';

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
  father_names: string[];
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

export type StudentListSortField =
  | 'name'
  | 'grade_name'
  | 'date_of_birth'
  | 'birth_place'
  | 'department'
  | 'document_id'
  | 'weight'
  | 'height'
  | 'blood_type'
  | 'social_security'
  | 'allergies';

export type StudentListSortDirection = 'asc' | 'desc';

export type StudentListOptions = {
  sortField?: StudentListSortField;
  sortDirection?: StudentListSortDirection;
};

export type PaginatedStudentsResult = PaginatedListResult<StudentRecord>;

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
    father_names: [],
  };
}

async function withAssociatedFatherNames(items: StudentRecord[]): Promise<StudentRecord[]> {
  if (items.length === 0) return [];

  const namesByStudentId = await listFatherNamesByStudentIds(items.map((item) => item.id));
  return items.map((item) => ({
    ...item,
    father_names: namesByStudentId[item.id] ?? [],
  }));
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

const STUDENT_SORT_FIELD_MAP: Record<StudentListSortField, string> = {
  name: 'name',
  grade_name: 'grade_id.name',
  date_of_birth: 'date_of_birth',
  birth_place: 'birth_place',
  department: 'department',
  document_id: 'document_id',
  weight: 'weight',
  height: 'height',
  blood_type: 'blood_type',
  social_security: 'social_security',
  allergies: 'allergies',
};

function buildSortExpression(
  sortField: StudentListSortField,
  sortDirection: StudentListSortDirection,
): string {
  const mappedField = STUDENT_SORT_FIELD_MAP[sortField];
  return sortDirection === 'desc' ? `-${mappedField}` : mappedField;
}

export async function listActiveStudents(): Promise<StudentRecord[]> {
  try {
    const records = await pb.collection('students').getFullList({
      sort: 'name',
      expand: 'grade_id',
    });
    const activeRecords = records
      .map((record) => mapStudentRecord(record))
      .filter((record) => record.active);
    return withAssociatedFatherNames(activeRecords);
  } catch (error) {
    const normalized = normalizePocketBaseError(error);
    const message = normalized.message.toLowerCase();
    const isAbortLike = normalized.isAbort
      || message.includes('request was aborted')
      || message.includes('autocancel');

    if (isAbortLike) {
      console.warn('Ignoring PocketBase auto-cancelled request in listActiveStudents.', normalized);
      return [];
    }

    throw normalized;
  }
}

export async function listActiveStudentsPage(
  page: number,
  perPage: number,
  options: StudentListOptions = {},
): Promise<PaginatedStudentsResult> {
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';
    const result = await pb.collection('students').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: 'active = true',
      expand: 'grade_id',
    });
    const items = await withAssociatedFatherNames(
      result.items.map((record) => mapStudentRecord(record)),
    );

    return {
      items,
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getStudentById(id: string): Promise<StudentRecord> {
  try {
    const record = await pb.collection('students').getOne(id, {
      expand: 'grade_id',
    });
    const mapped = mapStudentRecord(record);
    const namesByStudentId = await listFatherNamesByStudentIds([id]);
    return {
      ...mapped,
      father_names: namesByStudentId[id] ?? [],
    };
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

export async function deleteStudent(id: string): Promise<void> {
  try {
    await pb.collection('students').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
