import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';

export type SemesterRecord = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type SemesterCreateInput = {
  name: string;
  start_date: string;
  end_date: string;
};

export type SemesterUpdateInput = SemesterCreateInput;

export type SemesterListSortField =
  | 'name'
  | 'start_date'
  | 'end_date'
  | 'created_at'
  | 'updated_at';

export type SemesterListSortDirection = 'asc' | 'desc';

export type SemesterListOptions = {
  sortField?: SemesterListSortField;
  sortDirection?: SemesterListSortDirection;
};

export type PaginatedSemestersResult = PaginatedListResult<SemesterRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapSemesterRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): SemesterRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    start_date: toStringValue(record.get?.('start_date') ?? record.start_date),
    end_date: toStringValue(record.get?.('end_date') ?? record.end_date),
    created_at: toStringValue(record.get?.('created_at') ?? record.created_at),
    updated_at: toStringValue(record.get?.('updated_at') ?? record.updated_at),
  };
}

function buildSortExpression(
  sortField: SemesterListSortField,
  sortDirection: SemesterListSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

function mapSemesterPayload(payload: SemesterCreateInput | SemesterUpdateInput) {
  return {
    name: payload.name.trim(),
    start_date: payload.start_date.trim(),
    end_date: payload.end_date.trim(),
  };
}

export async function listSemestersPage(
  page: number,
  perPage: number,
  options: SemesterListOptions = {},
): Promise<PaginatedSemestersResult> {
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';

    const result = await pb.collection('semesters').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
    });

    return {
      items: result.items.map((record) => mapSemesterRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getSemesterById(id: string): Promise<SemesterRecord> {
  try {
    const record = await pb.collection('semesters').getOne(id);
    return mapSemesterRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createSemester(payload: SemesterCreateInput): Promise<SemesterRecord> {
  try {
    const record = await pb.collection('semesters').create(mapSemesterPayload(payload));
    return mapSemesterRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateSemester(
  id: string,
  payload: SemesterUpdateInput,
): Promise<SemesterRecord> {
  try {
    const record = await pb.collection('semesters').update(id, mapSemesterPayload(payload));
    return mapSemesterRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
