import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';
import type { PaginatedListResult } from '../table/pagination';
import { listStudentNamesByFatherIds } from './students-fathers';

export type FatherRecord = {
  id: string;
  full_name: string;
  document_id: string;
  phone_number: string;
  occupation: string;
  company: string;
  email: string;
  address: string;
  is_active: boolean;
  userId: string | null;
  student_names: string[];
};

export type FatherCreateInput = {
  full_name: string;
  document_id: string;
  phone_number: string;
  occupation: string;
  company: string;
  email: string;
  address: string;
  userId?: string | null;
};

export type FatherUpdateInput = FatherCreateInput;

export type FatherListSortField =
  | 'full_name'
  | 'document_id'
  | 'phone_number'
  | 'occupation'
  | 'company'
  | 'email'
  | 'address';

export type FatherListSortDirection = 'asc' | 'desc';

export type FatherListOptions = {
  sortField?: FatherListSortField;
  sortDirection?: FatherListSortDirection;
};

export type ActiveFatherListOptions = {
  includeStudentNames?: boolean;
};

export type PaginatedFathersResult = PaginatedListResult<FatherRecord>;

type PbFatherPayload = {
  full_name: string;
  document_id: string;
  phone_number: string;
  occupation: string;
  company: string;
  email: string;
  address: string;
  user_id?: string | null;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toActiveValue(value: unknown): boolean {
  return value !== false;
}

function toNullableStringValue(value: unknown): string | null {
  const normalized = toStringValue(value);
  return normalized.length > 0 ? normalized : null;
}

function mapFatherRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): FatherRecord {
  return {
    id: record.id,
    full_name: toStringValue(record.get?.('full_name') ?? record.full_name),
    document_id: toStringValue(record.get?.('document_id') ?? record.document_id),
    phone_number: toStringValue(record.get?.('phone_number') ?? record.phone_number),
    occupation: toStringValue(record.get?.('occupation') ?? record.occupation),
    company: toStringValue(record.get?.('company') ?? record.company),
    email: toStringValue(record.get?.('email') ?? record.email),
    address: toStringValue(record.get?.('address') ?? record.address),
    is_active: toActiveValue(record.get?.('is_active') ?? record.is_active),
    userId: toNullableStringValue(record.get?.('user_id') ?? record.user_id),
    student_names: [],
  };
}

function mapFatherPayload(payload: FatherCreateInput | FatherUpdateInput): PbFatherPayload {
  const mapped: PbFatherPayload = {
    full_name: payload.full_name.trim(),
    document_id: payload.document_id.trim(),
    phone_number: payload.phone_number.trim(),
    occupation: payload.occupation.trim(),
    company: payload.company.trim(),
    email: payload.email.trim(),
    address: payload.address.trim(),
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'userId')) {
    mapped.user_id = toNullableStringValue(payload.userId);
  }

  return mapped;
}

function buildSortExpression(
  sortField: FatherListSortField,
  sortDirection: FatherListSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

async function withAssociatedStudents(items: FatherRecord[]): Promise<FatherRecord[]> {
  if (items.length === 0) return [];

  const namesByFatherId = await listStudentNamesByFatherIds(items.map((item) => item.id));
  return items.map((item) => ({
    ...item,
    student_names: namesByFatherId[item.id] ?? [],
  }));
}

export async function listActiveFathers(options: ActiveFatherListOptions = {}): Promise<FatherRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const includeStudentNames = options.includeStudentNames ?? true;
    const records = await pb.collection('fathers').getFullList({
      sort: 'full_name',
      filter: 'is_active != false',
    });

    const mapped = records.map((record) => mapFatherRecord(record)).filter((record) => record.is_active);
    if (!includeStudentNames) {
      return mapped;
    }

    return withAssociatedStudents(mapped);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listActiveFathersPage(
  page: number,
  perPage: number,
  options: FatherListOptions = {},
): Promise<PaginatedFathersResult> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const sortField = options.sortField ?? 'full_name';
    const sortDirection = options.sortDirection ?? 'asc';

    const result = await pb.collection('fathers').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: 'is_active != false',
    });

    const mappedItems = result.items.map((record) => mapFatherRecord(record));
    const items = await withAssociatedStudents(mappedItems);

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

export async function getFatherById(id: string): Promise<FatherRecord> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('fathers').getOne(id);
    const mapped = mapFatherRecord(record);
    const namesByFatherId = await listStudentNamesByFatherIds([id]);

    return {
      ...mapped,
      student_names: namesByFatherId[id] ?? [],
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createFather(payload: FatherCreateInput): Promise<FatherRecord> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('fathers').create({
      ...mapFatherPayload(payload),
      is_active: true,
    });

    return mapFatherRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateFather(id: string, payload: FatherUpdateInput): Promise<FatherRecord> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('fathers').update(id, mapFatherPayload(payload));
    return mapFatherRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deactivateFather(id: string): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    await pb.collection('fathers').update(id, { is_active: false });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteFather(id: string): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    await pb.collection('fathers').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
