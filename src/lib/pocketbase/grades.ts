import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';

export type GradeRecord = {
  id: string;
  name: string;
  capacity: number | string;
};

export type GradeCreateInput = {
  name: string;
  capacity: number;
};

export type GradeUpdateInput = GradeCreateInput;

export type GradeListSortField = 'name' | 'capacity';
export type GradeListSortDirection = 'asc' | 'desc';
export type GradeListOptions = {
  sortField?: GradeListSortField;
  sortDirection?: GradeListSortDirection;
};
export type PaginatedGradesResult = PaginatedListResult<GradeRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toCapacityValue(value: unknown): number | string {
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

function mapGradeRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): GradeRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    capacity: toCapacityValue(record.get?.('capacity') ?? record.capacity),
  };
}

function buildSortExpression(
  sortField: GradeListSortField,
  sortDirection: GradeListSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

export async function listGrades(): Promise<GradeRecord[]> {
  try {
    const records = await pb.collection('grades').getFullList({
      sort: 'name',
    });

    return records.map((record) => mapGradeRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listGradesPage(
  page: number,
  perPage: number,
  options: GradeListOptions = {},
): Promise<PaginatedGradesResult> {
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';
    const result = await pb.collection('grades').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
    });

    return {
      items: result.items.map((record) => mapGradeRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createGrade(payload: GradeCreateInput): Promise<GradeRecord> {
  try {
    const record = await pb.collection('grades').create({
      name: payload.name.trim(),
      capacity: payload.capacity,
    });

    return mapGradeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateGrade(
  id: string,
  payload: GradeUpdateInput,
): Promise<GradeRecord> {
  try {
    const record = await pb.collection('grades').update(id, {
      name: payload.name.trim(),
      capacity: payload.capacity,
    });

    return mapGradeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteGrade(id: string): Promise<void> {
  try {
    await pb.collection('grades').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function countActiveStudentsByGradeId(gradeId: string): Promise<number> {
  try {
    const result = await pb.collection('students').getList(1, 1, {
      filter: `grade_id = "${escapeFilterValue(gradeId)}" && active = true`,
    });

    return result.totalItems;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
