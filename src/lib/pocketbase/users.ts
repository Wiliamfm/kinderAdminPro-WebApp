import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';
import type { AppRole } from './auth';

export type AppUserRecord = {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
  verified: boolean;
};

export type CreateEmployeeUserInput = {
  email: string;
  name: string;
  password: string;
};

export type UpdateAppUserInput = {
  email: string;
  name: string;
  roles: AppRole[];
};

export type AppUserListSortField = 'name' | 'roles' | 'email';
export type AppUserListSortDirection = 'asc' | 'desc';
export type AppUserListOptions = {
  sortField?: AppUserListSortField;
  sortDirection?: AppUserListSortDirection;
};
export type PaginatedAppUsersResult = PaginatedListResult<AppUserRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function isAppRole(value: string): value is AppRole {
  return ['admin', 'professor', 'father'].includes(value);
}

function normalizeRoles(value: unknown, legacyIsAdmin: boolean): AppRole[] {
  const seen = new Set<AppRole>();
  const result: AppRole[] = [];

  if (Array.isArray(value)) {
    for (const entry of value) {
      const normalized = toStringValue(entry);
      if (!isAppRole(normalized) || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push(normalized);
    }
  }

  if (legacyIsAdmin && !seen.has('admin')) {
    result.unshift('admin');
  }

  return result;
}

function mapUserRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): AppUserRecord {
  const legacyIsAdmin = toBooleanValue(record.get?.('is_admin') ?? record.is_admin);
  return {
    id: record.id,
    email: toStringValue(record.get?.('email') ?? record.email),
    name: toStringValue(record.get?.('name') ?? record.name),
    roles: normalizeRoles(record.get?.('roles') ?? record.roles, legacyIsAdmin),
    verified: toBooleanValue(record.get?.('verified') ?? record.verified),
  };
}

const APP_USER_SORT_FIELD_MAP: Record<AppUserListSortField, string> = {
  name: 'name',
  roles: 'roles',
  email: 'email',
};

function buildSortExpression(
  sortField: AppUserListSortField,
  sortDirection: AppUserListSortDirection,
): string {
  const mappedField = APP_USER_SORT_FIELD_MAP[sortField];
  return sortDirection === 'desc' ? `-${mappedField}` : mappedField;
}

export async function createEmployeeUser(payload: CreateEmployeeUserInput): Promise<AppUserRecord> {
  const email = payload.email.trim();
  const name = payload.name.trim();
  const password = payload.password;

  try {
    const record = await pb.collection('users').create({
      email,
      name,
      password,
      passwordConfirm: password,
      roles: ['professor'],
      is_admin: false,
    });

    return mapUserRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export function getAuthUserId(): string | null {
  const authModel = pb.authStore.model as { id?: unknown } | null;
  const modelId = toStringValue(authModel?.id);
  if (modelId.length > 0) {
    return modelId;
  }

  const authRecord = pb.authStore.record as { id?: unknown } | null;
  const recordId = toStringValue(authRecord?.id);
  return recordId.length > 0 ? recordId : null;
}

export async function listEmployeeUserIds(): Promise<Set<string>> {
  try {
    const records = await pb.collection('employees').getFullList({
      fields: 'user_id',
    });
    const ids = new Set<string>();
    for (const record of records) {
      const userId = toStringValue(record.get?.('user_id') ?? record.user_id);
      if (userId.length > 0) ids.add(userId);
    }
    return ids;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listAppUsers(): Promise<AppUserRecord[]> {
  try {
    const records = await pb.collection('users').getFullList({
      sort: 'name',
    });
    return records.map((record) => mapUserRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listAppUsersPage(
  page: number,
  perPage: number,
  options: AppUserListOptions = {},
): Promise<PaginatedAppUsersResult> {
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';
    const result = await pb.collection('users').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
    });

    return {
      items: result.items.map((record) => mapUserRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateAppUser(id: string, payload: UpdateAppUserInput): Promise<AppUserRecord> {
  try {
    const record = await pb.collection('users').update(id, {
      email: payload.email.trim(),
      name: payload.name.trim(),
      roles: payload.roles,
      is_admin: payload.roles.includes('admin'),
    });
    return mapUserRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteAppUser(id: string): Promise<void> {
  try {
    await pb.collection('users').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function requestAuthenticatedUserEmailChange(newEmail: string): Promise<void> {
  try {
    await pb.collection('users').requestEmailChange(newEmail.trim());
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function sendVerificationEmail(email: string): Promise<void> {
  try {
    await pb.collection('users').requestVerification(email.trim());
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function confirmVerificationToken(token: string): Promise<void> {
  try {
    await pb.collection('users').confirmVerification(token.trim());
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function confirmPasswordSetupToken(
  token: string,
  password: string,
  passwordConfirm: string,
): Promise<void> {
  try {
    await pb.collection('users').confirmPasswordReset(token.trim(), password, passwordConfirm);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
