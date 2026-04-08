import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';
import type { PaginatedListResult } from '../table/pagination';

export type GradeRecord = {
  id: string;
  name: string;
  capacity: number | string;
  employeeId: string | null;
  employeeName: string;
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

function toNullableStringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getExpandedEmployee(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const employee = expand?.employee_id;

  if (Array.isArray(employee)) {
    return (employee[0] as Record<string, unknown>) ?? null;
  }

  if (employee && typeof employee === 'object') {
    return employee as Record<string, unknown>;
  }

  return null;
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
  const expandedEmployee = getExpandedEmployee(record);
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    capacity: toCapacityValue(record.get?.('capacity') ?? record.capacity),
    employeeId: toNullableStringValue(record.get?.('employee_id') ?? record.employee_id),
    employeeName: toStringValue(expandedEmployee?.name),
  };
}

function buildSortExpression(
  sortField: GradeListSortField,
  sortDirection: GradeListSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

export async function listGrades(): Promise<GradeRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const records = await pb.collection('grades').getFullList({
      sort: 'name',
      expand: 'employee_id',
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
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';
    const result = await pb.collection('grades').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      expand: 'employee_id',
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
  "use server";
  const pb = await getAuthenticatedPb();
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
  "use server";
  const pb = await getAuthenticatedPb();
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
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    await pb.collection('grades').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function listGradesByEmployeeId(employeeId: string): Promise<GradeRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const records = await pb.collection('grades').getFullList({
      filter: pb.filter('employee_id = {:employeeId}', { employeeId }),
      expand: 'employee_id',
      sort: 'name',
    });
    return records.map((record) => mapGradeRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateGradeProfessor(
  gradeId: string,
  employeeId: string | null,
): Promise<GradeRecord> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('grades').update(gradeId, {
      employee_id: employeeId ?? '',
    }, {
      expand: 'employee_id',
    });
    return mapGradeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function countActiveStudentsByGradeId(gradeId: string): Promise<number> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const result = await pb.collection('students').getList(1, 1, {
      filter: `grade_id = "${escapeFilterValue(gradeId)}" && active = true`,
    });

    return result.totalItems;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
