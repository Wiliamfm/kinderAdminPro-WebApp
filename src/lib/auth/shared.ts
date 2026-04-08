export const APP_ROLES = ['admin', 'professor', 'father'] as const;

export type AppRole = (typeof APP_ROLES)[number];
export type ProtectedModule =
  | 'staff'
  | 'enrollment'
  | 'reports'
  | 'events'
  | 'users'
  | 'professor-personal'
  | 'professor-students'
  | 'professor-events';

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  professor: 'Profesor',
  father: 'Padre',
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
};

export type AuthRecordLike = {
  id?: unknown;
  email?: unknown;
  get?: (key: string) => unknown;
  is_admin?: unknown;
  name?: unknown;
  roles?: unknown;
} | null;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeRoleValues(value: unknown): AppRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<AppRole>();
  const result: AppRole[] = [];

  for (const entry of value) {
    const normalized = toStringValue(entry);
    if (!isAppRole(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function mapAuthRecord(record: AuthRecordLike): AuthUser | null {
  const id = toStringValue(record?.get?.('id') ?? record?.id);
  if (!id) {
    return null;
  }

  const rawRoles = record?.get?.('roles') ?? record?.roles;
  const roles = normalizeRoleValues(rawRoles);

  if (toBooleanValue(record?.get?.('is_admin') ?? record?.is_admin) && !roles.includes('admin')) {
    roles.unshift('admin');
  }

  return {
    id,
    email: toStringValue(record?.get?.('email') ?? record?.email),
    name: toStringValue(record?.get?.('name') ?? record?.name),
    roles,
  };
}

export function getAuthUserIdentity(user: AuthUser | null): { name: string; email: string } {
  return {
    name: user?.name || 'Usuario',
    email: user?.email || 'Sin correo',
  };
}

const PROFESSOR_MODULES: readonly ProtectedModule[] = [
  'professor-personal',
  'professor-students',
  'professor-events',
];

export function canUserAccessModule(user: AuthUser | null, module: ProtectedModule): boolean {
  if (!user) {
    return false;
  }

  if (PROFESSOR_MODULES.includes(module)) {
    return user.roles.includes('professor');
  }

  return user.roles.includes('admin');
}

export function canUserAccessModules(
  user: AuthUser | null,
  modules: readonly ProtectedModule[],
): boolean {
  if (modules.length === 0) {
    return true;
  }

  return modules.some((module) => canUserAccessModule(user, module));
}
