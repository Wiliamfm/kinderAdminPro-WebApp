import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';
import { getAuthUserId } from './users';

export type BulletinStudentRecord = {
  id: string;
  bulletin_id: string;
  bulletin_label: string;
  student_id: string;
  student_name: string;
  grade_id: string;
  grade_name: string;
  semester_id: string;
  semester_name: string;
  note: number | string;
  comments: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  updated_by: string;
  updated_by_name: string;
  is_deleted: boolean;
};

export type BulletinStudentCreateInput = {
  bulletin_id: string;
  student_id: string;
  grade_id: string;
  semester_id: string;
  note: number;
  comments?: string;
};

export type BulletinStudentUpdateInput = BulletinStudentCreateInput;

export type BulletinStudentListSortField =
  | 'bulletin_label'
  | 'student_name'
  | 'grade_name'
  | 'semester_name'
  | 'note'
  | 'comments'
  | 'created_at'
  | 'updated_at'
  | 'created_by_name'
  | 'updated_by_name';

export type BulletinStudentListSortDirection = 'asc' | 'desc';

export type BulletinStudentListOptions = {
  sortField?: BulletinStudentListSortField;
  sortDirection?: BulletinStudentListSortDirection;
};

export type PaginatedBulletinsStudentsResult = PaginatedListResult<BulletinStudentRecord>;

export type BulletinStudentOption = {
  id: string;
  label: string;
};

export type BulletinStudentFormOptions = {
  bulletins: BulletinStudentOption[];
  students: BulletinStudentOption[];
  grades: BulletinStudentOption[];
  semesters: BulletinStudentOption[];
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function toNumberValue(value: unknown): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return numeric;
      return trimmed;
    }
  }

  return '';
}

function getExpandContainer(record: Record<string, unknown> & { get?: (key: string) => unknown }) {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  return (directExpand ?? fromGet) as Record<string, unknown> | undefined;
}

function getExpandedChild(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: string,
): Record<string, unknown> | null {
  const expand = getExpandContainer(record);
  const fromExpand = expand?.[key];
  const fromRecord = record[key];
  const value = fromExpand ?? fromRecord;

  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' ? first as Record<string, unknown> : null;
  }

  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function getExpandedRecord(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  path: string,
): Record<string, unknown> | null {
  let current: Record<string, unknown> | null = record;

  for (const segment of path.split('.')) {
    if (!current) return null;
    current = getExpandedChild(current as Record<string, unknown> & { get?: (key: string) => unknown }, segment);
  }

  return current;
}

function getUserDisplayName(record: Record<string, unknown> | null, fallbackId: string): string {
  if (!record) return fallbackId;

  const name = toStringValue(record.name);
  if (name.length > 0) return name;

  const email = toStringValue(record.email);
  if (email.length > 0) return email;

  return fallbackId;
}

function buildBulletinLabel(categoryName: string, description: string, fallbackId: string): string {
  const normalizedCategory = categoryName.trim();
  const normalizedDescription = description.trim();

  if (normalizedCategory && normalizedDescription) {
    return `${normalizedCategory}: ${normalizedDescription}`;
  }

  if (normalizedCategory) return normalizedCategory;
  if (normalizedDescription) return normalizedDescription;
  return fallbackId;
}

function mapBulletinStudentRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): BulletinStudentRecord {
  const expandedBulletin = getExpandedRecord(record, 'bulletin_id');
  const expandedBulletinCategory = getExpandedRecord(record, 'bulletin_id.category_id');
  const expandedStudent = getExpandedRecord(record, 'student_id');
  const expandedGrade = getExpandedRecord(record, 'grade_id');
  const expandedSemester = getExpandedRecord(record, 'semester_id');
  const expandedCreatedBy = getExpandedRecord(record, 'created_by');
  const expandedUpdatedBy = getExpandedRecord(record, 'updated_by');

  const bulletinId = toStringValue(record.get?.('bulletin_id') ?? record.bulletin_id);
  const studentId = toStringValue(record.get?.('student_id') ?? record.student_id);
  const gradeId = toStringValue(record.get?.('grade_id') ?? record.grade_id);
  const semesterId = toStringValue(record.get?.('semester_id') ?? record.semester_id);
  const createdBy = toStringValue(record.get?.('created_by') ?? record.created_by);
  const updatedBy = toStringValue(record.get?.('updated_by') ?? record.updated_by);

  const bulletinCategoryName = toStringValue(expandedBulletinCategory?.name);
  const bulletinDescription = toStringValue(expandedBulletin?.description);

  return {
    id: record.id,
    bulletin_id: bulletinId,
    bulletin_label: buildBulletinLabel(bulletinCategoryName, bulletinDescription, bulletinId),
    student_id: studentId,
    student_name: toStringValue(expandedStudent?.name),
    grade_id: gradeId,
    grade_name: toStringValue(expandedGrade?.name),
    semester_id: semesterId,
    semester_name: toStringValue(expandedSemester?.name),
    note: toNumberValue(record.get?.('note') ?? record.note),
    comments: toStringValue(record.get?.('comments') ?? record.comments),
    created_at: toStringValue(record.get?.('created_at') ?? record.created_at),
    updated_at: toStringValue(record.get?.('updated_at') ?? record.updated_at),
    created_by: createdBy,
    created_by_name: getUserDisplayName(expandedCreatedBy, createdBy),
    updated_by: updatedBy,
    updated_by_name: getUserDisplayName(expandedUpdatedBy, updatedBy),
    is_deleted: toBooleanValue(record.get?.('is_deleted') ?? record.is_deleted),
  };
}

const BULLETIN_STUDENT_SORT_FIELD_MAP: Record<BulletinStudentListSortField, string> = {
  bulletin_label: 'bulletin_id.category_id.name',
  student_name: 'student_id.name',
  grade_name: 'grade_id.name',
  semester_name: 'semester_id.name',
  note: 'note',
  comments: 'comments',
  created_at: 'created_at',
  updated_at: 'updated_at',
  created_by_name: 'created_by.name',
  updated_by_name: 'updated_by.name',
};

function buildSortExpression(
  sortField: BulletinStudentListSortField,
  sortDirection: BulletinStudentListSortDirection,
): string {
  const mappedField = BULLETIN_STUDENT_SORT_FIELD_MAP[sortField];
  return sortDirection === 'desc' ? `-${mappedField}` : mappedField;
}

function requireAuthUserId(): string {
  const userId = getAuthUserId();
  if (!userId) {
    throw new Error('No hay usuario autenticado para completar la operación.');
  }

  return userId;
}

function mapBulletinStudentPayload(payload: BulletinStudentCreateInput | BulletinStudentUpdateInput) {
  return {
    bulletin_id: payload.bulletin_id.trim(),
    student_id: payload.student_id.trim(),
    grade_id: payload.grade_id.trim(),
    semester_id: payload.semester_id.trim(),
    note: payload.note,
    comments: (payload.comments ?? '').trim(),
  };
}

export async function listBulletinsStudentsPage(
  page: number,
  perPage: number,
  options: BulletinStudentListOptions = {},
): Promise<PaginatedBulletinsStudentsResult> {
  try {
    const sortField = options.sortField ?? 'updated_at';
    const sortDirection = options.sortDirection ?? 'desc';

    const result = await pb.collection('bulletins_students').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: 'is_deleted != true',
      expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
    });

    return {
      items: result.items.map((record) => mapBulletinStudentRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createBulletinStudent(
  payload: BulletinStudentCreateInput,
): Promise<BulletinStudentRecord> {
  const authUserId = requireAuthUserId();

  try {
    const record = await pb.collection('bulletins_students').create(
      {
        ...mapBulletinStudentPayload(payload),
        created_by: authUserId,
        updated_by: authUserId,
        is_deleted: false,
      },
      {
        expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
      },
    );

    return mapBulletinStudentRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateBulletinStudent(
  id: string,
  payload: BulletinStudentUpdateInput,
): Promise<BulletinStudentRecord> {
  const authUserId = requireAuthUserId();

  try {
    const record = await pb.collection('bulletins_students').update(
      id,
      {
        ...mapBulletinStudentPayload(payload),
        updated_by: authUserId,
      },
      {
        expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
      },
    );

    return mapBulletinStudentRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function softDeleteBulletinStudent(id: string): Promise<void> {
  const authUserId = requireAuthUserId();

  try {
    await pb.collection('bulletins_students').update(id, {
      is_deleted: true,
      updated_by: authUserId,
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listBulletinStudentFormOptions(): Promise<BulletinStudentFormOptions> {
  try {
    const [bulletins, students, grades, semesters] = await Promise.all([
      pb.collection('bulletins').getFullList({
        sort: '-updated_at',
        filter: 'is_deleted != true',
        expand: 'category_id',
      }),
      pb.collection('students').getFullList({
        sort: 'name',
        filter: 'active = true',
      }),
      pb.collection('grades').getFullList({
        sort: 'name',
      }),
      pb.collection('semesters').getFullList({
        sort: 'name',
      }),
    ]);

    return {
      bulletins: bulletins.map((record) => {
        const category = getExpandedRecord(record, 'category_id');
        const categoryName = toStringValue(category?.name);
        const description = toStringValue(record.get?.('description') ?? record.description);
        return {
          id: toStringValue(record.id),
          label: buildBulletinLabel(categoryName, description, toStringValue(record.id)),
        };
      }),
      students: students.map((record) => ({
        id: toStringValue(record.id),
        label: toStringValue(record.get?.('name') ?? record.name) || toStringValue(record.id),
      })),
      grades: grades.map((record) => ({
        id: toStringValue(record.id),
        label: toStringValue(record.get?.('name') ?? record.name) || toStringValue(record.id),
      })),
      semesters: semesters.map((record) => ({
        id: toStringValue(record.id),
        label: toStringValue(record.get?.('name') ?? record.name) || toStringValue(record.id),
      })),
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
