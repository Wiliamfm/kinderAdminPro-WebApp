import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';
import { getAuthUserId } from './users';

export type BulletinRecord = {
  id: string;
  category_id: string;
  category_name: string;
  description: string;
  grade_id: string;
  grade_name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  updated_by: string;
  updated_by_name: string;
  is_deleted: boolean;
};

export type BulletinCreateInput = {
  category_id: string;
  description: string;
  grade_id: string;
};

export type BulletinUpdateInput = BulletinCreateInput;

export type BulletinListSortField =
  | 'category_name'
  | 'grade_name'
  | 'description'
  | 'created_at'
  | 'updated_at'
  | 'created_by_name'
  | 'updated_by_name';

export type BulletinListSortDirection = 'asc' | 'desc';

export type BulletinListOptions = {
  sortField?: BulletinListSortField;
  sortDirection?: BulletinListSortDirection;
};

export type PaginatedBulletinsResult = PaginatedListResult<BulletinRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function getExpandedRecord(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: string,
): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const expandedValue = expand?.[key];

  if (Array.isArray(expandedValue)) {
    return (expandedValue[0] as Record<string, unknown>) ?? null;
  }

  if (expandedValue && typeof expandedValue === 'object') {
    return expandedValue as Record<string, unknown>;
  }

  return null;
}

function getUserDisplayName(record: Record<string, unknown> | null, fallbackId: string): string {
  if (!record) return fallbackId;

  const name = toStringValue(record.name);
  if (name.length > 0) return name;

  const email = toStringValue(record.email);
  if (email.length > 0) return email;

  return fallbackId;
}

function mapBulletinRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): BulletinRecord {
  const expandedCategory = getExpandedRecord(record, 'category_id');
  const expandedGrade = getExpandedRecord(record, 'grade_id');
  const expandedCreatedBy = getExpandedRecord(record, 'created_by');
  const expandedUpdatedBy = getExpandedRecord(record, 'updated_by');

  const createdBy = toStringValue(record.get?.('created_by') ?? record.created_by);
  const updatedBy = toStringValue(record.get?.('updated_by') ?? record.updated_by);

  return {
    id: record.id,
    category_id: toStringValue(record.get?.('category_id') ?? record.category_id),
    category_name: toStringValue(expandedCategory?.name),
    description: toStringValue(record.get?.('description') ?? record.description),
    grade_id: toStringValue(record.get?.('grade_id') ?? record.grade_id),
    grade_name: toStringValue(expandedGrade?.name),
    created_at: toStringValue(record.get?.('created_at') ?? record.created_at),
    updated_at: toStringValue(record.get?.('updated_at') ?? record.updated_at),
    created_by: createdBy,
    created_by_name: getUserDisplayName(expandedCreatedBy, createdBy),
    updated_by: updatedBy,
    updated_by_name: getUserDisplayName(expandedUpdatedBy, updatedBy),
    is_deleted: toBooleanValue(record.get?.('is_deleted') ?? record.is_deleted),
  };
}

const BULLETIN_SORT_FIELD_MAP: Record<BulletinListSortField, string> = {
  category_name: 'category_id.name',
  grade_name: 'grade_id.name',
  description: 'description',
  created_at: 'created_at',
  updated_at: 'updated_at',
  created_by_name: 'created_by.name',
  updated_by_name: 'updated_by.name',
};

function buildSortExpression(
  sortField: BulletinListSortField,
  sortDirection: BulletinListSortDirection,
): string {
  const mappedField = BULLETIN_SORT_FIELD_MAP[sortField];
  return sortDirection === 'desc' ? `-${mappedField}` : mappedField;
}

function requireAuthUserId(): string {
  const userId = getAuthUserId();
  if (!userId) {
    throw new Error('No hay usuario autenticado para completar la operación.');
  }

  return userId;
}

export async function listBulletinsPage(
  page: number,
  perPage: number,
  options: BulletinListOptions = {},
): Promise<PaginatedBulletinsResult> {
  try {
    const sortField = options.sortField ?? 'updated_at';
    const sortDirection = options.sortDirection ?? 'desc';
    const result = await pb.collection('bulletins').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: 'is_deleted != true',
      expand: 'category_id,grade_id,created_by,updated_by',
    });

    return {
      items: result.items.map((record) => mapBulletinRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createBulletin(payload: BulletinCreateInput): Promise<BulletinRecord> {
  const authUserId = requireAuthUserId();

  try {
    const record = await pb.collection('bulletins').create(
      {
        category_id: payload.category_id.trim(),
        description: payload.description.trim(),
        grade_id: payload.grade_id.trim(),
        created_by: authUserId,
        updated_by: authUserId,
        is_deleted: false,
      },
      {
        expand: 'category_id,grade_id,created_by,updated_by',
      },
    );

    return mapBulletinRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateBulletin(
  id: string,
  payload: BulletinUpdateInput,
): Promise<BulletinRecord> {
  const authUserId = requireAuthUserId();

  try {
    const record = await pb.collection('bulletins').update(
      id,
      {
        category_id: payload.category_id.trim(),
        description: payload.description.trim(),
        grade_id: payload.grade_id.trim(),
        updated_by: authUserId,
      },
      {
        expand: 'category_id,grade_id,created_by,updated_by',
      },
    );

    return mapBulletinRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function softDeleteBulletin(id: string): Promise<void> {
  const authUserId = requireAuthUserId();

  try {
    await pb.collection('bulletins').update(id, {
      is_deleted: true,
      updated_by: authUserId,
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
