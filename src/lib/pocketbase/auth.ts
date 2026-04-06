import pb from './client';

export type AuthChangeCallback = (isAuthenticated: boolean) => void;
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

type AuthRecordLike = {
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

function normalizeRoleValues(value: unknown): AppRole[] {
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

export async function loginWithPassword(email: string, password: string): Promise<void> {
  await pb.collection('users').authWithPassword(email, password);
}

export function logout(): void {
  pb.authStore.clear();
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

export function getAuthUser() {
  return pb.authStore.record;
}

export function getAuthUserRoles(): AppRole[] {
  const record = getAuthUser() as AuthRecordLike;
  const rawRoles = record?.get?.('roles') ?? record?.roles;
  const roles = normalizeRoleValues(rawRoles);

  if (toBooleanValue(record?.get?.('is_admin') ?? record?.is_admin) && !roles.includes('admin')) {
    return ['admin', ...roles];
  }

  return roles;
}

export function hasRole(role: AppRole): boolean {
  return getAuthUserRoles().includes(role);
}

export function hasAnyRole(roles: readonly AppRole[]): boolean {
  return roles.some((role) => hasRole(role));
}

const PROFESSOR_MODULES: readonly ProtectedModule[] = [
  'professor-personal',
  'professor-students',
  'professor-events',
];

export function canAccessModule(module: ProtectedModule): boolean {
  if (PROFESSOR_MODULES.includes(module)) {
    return hasRole('professor');
  }
  return hasRole('admin');
}

export function canAccessModules(modules: readonly ProtectedModule[]): boolean {
  if (modules.length === 0) {
    return true;
  }

  return modules.some((module) => canAccessModule(module));
}

export function isAuthUserAdmin(): boolean {
  return hasRole('admin');
}

export function getAuthUserIdentity(): { name: string; email: string } {
  const record = getAuthUser() as AuthRecordLike;
  const rawName = toStringValue(record?.get?.('name') ?? record?.name);
  const rawEmail = toStringValue(record?.get?.('email') ?? record?.email);

  return {
    name: rawName || 'Usuario',
    email: rawEmail || 'Sin correo',
  };
}

export function subscribeAuth(callback: AuthChangeCallback): () => void {
  return pb.authStore.onChange(() => {
    callback(pb.authStore.isValid);
  });
}
