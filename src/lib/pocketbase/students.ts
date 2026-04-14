import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';
import type { PaginatedListResult } from '../table/pagination';
import { listFatherNamesByStudentIds, type StudentFatherRelationship } from './students-fathers';

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

export type ActiveStudentListOptions = {
  includeFatherNames?: boolean;
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

type StudentDeactivationLink = {
  id: string;
  fatherId: string;
  relationship: StudentFatherRelationship;
  fatherActive: boolean;
  fatherUserId: string | null;
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

function toNullableStringValue(value: unknown): string | null {
  const normalized = toStringValue(value);
  return normalized.length > 0 ? normalized : null;
}

function toRelationshipValue(value: unknown): StudentFatherRelationship {
  const normalized = toStringValue(value);
  if (normalized === 'father' || normalized === 'mother' || normalized === 'other') {
    return normalized;
  }

  return 'other';
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

function mapStudentDeactivationLink(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): StudentDeactivationLink {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const expandedFather = expand?.father_id;
  const father = Array.isArray(expandedFather)
    ? (expandedFather[0] as Record<string, unknown> | undefined)
    : (expandedFather as Record<string, unknown> | undefined);

  return {
    id: record.id,
    fatherId: toStringValue(record.get?.('father_id') ?? record.father_id),
    relationship: toRelationshipValue(record.get?.('relationship') ?? record.relationship),
    fatherActive: toActiveValue(father?.is_active),
    fatherUserId: toNullableStringValue(father?.user_id),
  };
}

async function fatherHasActiveStudents(pb: Awaited<ReturnType<typeof getAuthenticatedPb>>, fatherId: string): Promise<boolean> {
  const records = await pb.collection('students_fathers').getFullList({
    filter: `father_id = "${escapeFilterValue(fatherId)}"`,
    expand: 'student_id',
    fields: 'id,expand.student_id.active',
    sort: 'created_at,id',
  });

  return records.some((record) => {
    const directExpand = (record as { expand?: Record<string, unknown> }).expand;
    const fromGet = (record as { get?: (key: string) => unknown }).get?.('expand');
    const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
    const expandedStudent = expand?.student_id;
    const student = Array.isArray(expandedStudent)
      ? expandedStudent[0] as Record<string, unknown> | undefined
      : expandedStudent as Record<string, unknown> | undefined;

    return toActiveValue(student?.active);
  });
}

async function rollbackDeactivation(
  pb: Awaited<ReturnType<typeof getAuthenticatedPb>>,
  studentId: string,
  deletedLinks: StudentDeactivationLink[],
  reactivatedFatherIds: string[],
  studentWasDeactivated: boolean,
): Promise<void> {
  for (let index = reactivatedFatherIds.length - 1; index >= 0; index -= 1) {
    try {
      await pb.collection('fathers').update(reactivatedFatherIds[index], { is_active: true });
    } catch {
      // Ignore rollback errors to preserve the original failure.
    }
  }

  if (studentWasDeactivated) {
    try {
      await pb.collection('students').update(studentId, { active: true });
    } catch {
      // Ignore rollback errors to preserve the original failure.
    }
  }

  for (const link of deletedLinks) {
    try {
      await pb.collection('students_fathers').create({
        student_id: studentId,
        father_id: link.fatherId,
        relationship: link.relationship,
      });
    } catch {
      // Ignore rollback errors to preserve the original failure.
    }
  }
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

export async function listActiveStudentsByGradeIds(gradeIds: string[]): Promise<StudentRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  if (gradeIds.length === 0) return [];

  const escapedFilter = gradeIds
    .map((id) => `grade_id = "${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
    .join(' || ');
  const filter = `active = true && (${escapedFilter})`;

  try {
    const records = await pb.collection('students').getFullList({
      filter,
      expand: 'grade_id',
      sort: 'name',
    });
    return records.map((record) => mapStudentRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listActiveStudents(options: ActiveStudentListOptions = {}): Promise<StudentRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const includeFatherNames = options.includeFatherNames ?? true;
    const records = await pb.collection('students').getFullList({
      sort: 'name',
      expand: 'grade_id',
    });
    const activeRecords = records
      .map((record) => mapStudentRecord(record))
      .filter((record) => record.active);
    if (!includeFatherNames) {
      return activeRecords;
    }

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
  "use server";
  const pb = await getAuthenticatedPb();
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
  "use server";
  const pb = await getAuthenticatedPb();
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
  "use server";
  const pb = await getAuthenticatedPb();
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
  "use server";
  const pb = await getAuthenticatedPb();
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
  "use server";
  const pb = await getAuthenticatedPb();
  const normalizedId = id.trim();
  const deletedLinks: StudentDeactivationLink[] = [];
  const deactivatedFatherIds: string[] = [];
  let studentWasDeactivated = false;

  try {
    const relationRecords = await pb.collection('students_fathers').getFullList({
      filter: `student_id = "${escapeFilterValue(normalizedId)}"`,
      expand: 'father_id',
      fields: 'id,father_id,relationship,expand.father_id.is_active,expand.father_id.user_id',
      sort: 'created_at,id',
    });
    const links = relationRecords.map((record) => mapStudentDeactivationLink(record));

    for (const link of links) {
      await pb.collection('students_fathers').delete(link.id);
      deletedLinks.push(link);
    }

    await pb.collection('students').update(normalizedId, { active: false });
    studentWasDeactivated = true;

    for (const link of links) {
      const hasActiveStudents = await fatherHasActiveStudents(pb, link.fatherId);
      if (hasActiveStudents || !link.fatherActive) {
        continue;
      }

      await pb.collection('fathers').update(link.fatherId, { is_active: false });
      deactivatedFatherIds.push(link.fatherId);

      if (!link.fatherUserId) {
        continue;
      }

      try {
        await pb.collection('users').delete(link.fatherUserId);
      } catch (userDeletionError) {
        console.error('Failed to delete linked father user during student deactivation.', {
          studentId: normalizedId,
          fatherId: link.fatherId,
          userId: link.fatherUserId,
          error: userDeletionError,
        });
      }
    }
  } catch (error) {
    await rollbackDeactivation(
      pb,
      normalizedId,
      deletedLinks,
      deactivatedFatherIds,
      studentWasDeactivated,
    );
    throw normalizePocketBaseError(error);
  }
}

export async function deleteStudent(id: string): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    await pb.collection('students').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export type EnrollmentRequestRecord = {
  id: string;
  name: string;
  document_id: string;
  grade_id: string;
  grade_name: string;
  birth_place: string;
  department: string;
  father_names: string[];
};

export type EnrollmentRequestSortField =
  | 'name'
  | 'document_id'
  | 'grade_name'
  | 'birth_place'
  | 'department';

export type EnrollmentRequestListOptions = {
  sortField?: EnrollmentRequestSortField;
  sortDirection?: 'asc' | 'desc';
};

export type PaginatedEnrollmentRequestsResult = PaginatedListResult<EnrollmentRequestRecord>;

const ENROLLMENT_REQUEST_SORT_FIELD_MAP: Record<EnrollmentRequestSortField, string> = {
  name: 'name',
  document_id: 'document_id',
  grade_name: 'grade_id.name',
  birth_place: 'birth_place',
  department: 'department',
};

function mapEnrollmentRequestRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EnrollmentRequestRecord {
  const expandedGrade = getExpandedGrade(record);

  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    document_id: toStringValue(record.get?.('document_id') ?? record.document_id),
    grade_id: toStringValue(record.get?.('grade_id') ?? record.grade_id),
    grade_name: toStringValue(expandedGrade?.name),
    birth_place: toStringValue(record.get?.('birth_place') ?? record.birth_place),
    department: toStringValue(record.get?.('department') ?? record.department),
    father_names: [],
  };
}

export async function listPendingEnrollmentRequests(
  page: number,
  perPage: number,
  options: EnrollmentRequestListOptions = {},
): Promise<PaginatedEnrollmentRequestsResult> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const sortField = options.sortField ?? 'document_id';
    const sortDirection = options.sortDirection ?? 'desc';
    const mappedField = ENROLLMENT_REQUEST_SORT_FIELD_MAP[sortField];
    const sort = sortDirection === 'desc' ? `-${mappedField}` : mappedField;

    const result = await pb.collection('students').getList(page, perPage, {
      sort: sort,
      filter: 'active = true && accepted = false && rejected = ""',
      expand: 'grade_id',
    });

    const items = result.items.map((record) => mapEnrollmentRequestRecord(record));
    const studentIds = items.map((item) => item.id);
    const namesByStudentId = studentIds.length > 0
      ? await listFatherNamesByStudentIds(studentIds)
      : {};

    return {
      items: items.map((item) => ({
        ...item,
        father_names: namesByStudentId[item.id] ?? [],
      })),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function acceptEnrollmentRequest(id: string): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    await pb.collection('students').update(id, {
      accepted: true,
      active: true,
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function rejectEnrollmentRequest(id: string): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    await pb.collection('students').update(id, {
      rejected: new Date().toISOString(),
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
