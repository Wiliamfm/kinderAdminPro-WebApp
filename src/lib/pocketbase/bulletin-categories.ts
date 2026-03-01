import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';

export type BulletinCategoryRecord = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type BulletinCategoryCreateInput = {
  name: string;
  description: string;
};

export type BulletinCategoryUpdateInput = BulletinCategoryCreateInput;

export type BulletinCategoryListSortField =
  | 'name'
  | 'description'
  | 'created_at'
  | 'updated_at';

export type BulletinCategoryListSortDirection = 'asc' | 'desc';

export type BulletinCategoryListOptions = {
  sortField?: BulletinCategoryListSortField;
  sortDirection?: BulletinCategoryListSortDirection;
};

export type PaginatedBulletinCategoriesResult = PaginatedListResult<BulletinCategoryRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapBulletinCategoryRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): BulletinCategoryRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    description: toStringValue(record.get?.('description') ?? record.description),
    created_at: toStringValue(record.get?.('created_at') ?? record.created_at),
    updated_at: toStringValue(record.get?.('updated_at') ?? record.updated_at),
  };
}

function buildSortExpression(
  sortField: BulletinCategoryListSortField,
  sortDirection: BulletinCategoryListSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

export async function listBulletinCategories(): Promise<BulletinCategoryRecord[]> {
  try {
    const records = await pb.collection('bulletin_categories').getFullList({
      sort: 'name',
    });

    return records.map((record) => mapBulletinCategoryRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listBulletinCategoriesPage(
  page: number,
  perPage: number,
  options: BulletinCategoryListOptions = {},
): Promise<PaginatedBulletinCategoriesResult> {
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';
    const result = await pb.collection('bulletin_categories').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
    });

    return {
      items: result.items.map((record) => mapBulletinCategoryRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createBulletinCategory(
  payload: BulletinCategoryCreateInput,
): Promise<BulletinCategoryRecord> {
  try {
    const record = await pb.collection('bulletin_categories').create({
      name: payload.name.trim(),
      description: payload.description.trim(),
    });

    return mapBulletinCategoryRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateBulletinCategory(
  id: string,
  payload: BulletinCategoryUpdateInput,
): Promise<BulletinCategoryRecord> {
  try {
    const record = await pb.collection('bulletin_categories').update(id, {
      name: payload.name.trim(),
      description: payload.description.trim(),
    });

    return mapBulletinCategoryRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteBulletinCategory(id: string): Promise<void> {
  try {
    await pb.collection('bulletin_categories').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function countBulletinsByCategoryId(categoryId: string): Promise<number> {
  try {
    const result = await pb.collection('bulletins').getList(1, 1, {
      filter: `category_id = "${escapeFilterValue(categoryId)}"`,
    });

    return result.totalItems;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
