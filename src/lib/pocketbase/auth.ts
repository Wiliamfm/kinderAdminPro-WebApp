import { createSignal } from 'solid-js';
import {
  APP_ROLE_LABELS,
  APP_ROLES,
  canUserAccessModule,
  canUserAccessModules,
  getAuthUserIdentity as getIdentity,
  type AppRole,
  type AuthUser,
  type ProtectedModule,
} from '../auth/shared';
import {
  getCurrentUser as getCurrentUserServer,
  loginWithPassword as loginWithPasswordServer,
  logout as logoutServer,
} from '../server/auth';

const [authUser, setAuthUser] = createSignal<AuthUser | null>(null);
const [authResolved, setAuthResolved] = createSignal(false);

let refreshPromise: Promise<AuthUser | null> | null = null;

export { APP_ROLES, APP_ROLE_LABELS };
export type { AppRole, AuthUser, ProtectedModule };

export function primeAuthState(user: AuthUser | null): void {
  setAuthUser(() => user);
  setAuthResolved(true);
}

export function clearAuthState(): void {
  setAuthUser(null);
  setAuthResolved(true);
}

export async function refreshAuth(): Promise<AuthUser | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = getCurrentUserServer()
    .then((user) => {
      primeAuthState(user);
      return user;
    })
    .catch((error) => {
      clearAuthState();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  const user = await loginWithPasswordServer(email, password);
  primeAuthState(user);
  return user;
}

export async function logout(): Promise<void> {
  await logoutServer();
  clearAuthState();
}

export function isAuthResolved(): boolean {
  return authResolved();
}

export function isAuthenticated(): boolean {
  return authUser() !== null;
}

export function getAuthUser(): AuthUser | null {
  return authUser();
}

export function getAuthUserId(): string | null {
  return authUser()?.id ?? null;
}

export function getAuthUserRoles(): AppRole[] {
  return authUser()?.roles ?? [];
}

export function hasRole(role: AppRole): boolean {
  return getAuthUserRoles().includes(role);
}

export function hasAnyRole(roles: readonly AppRole[]): boolean {
  return roles.some((role) => hasRole(role));
}

export function canAccessModule(module: ProtectedModule): boolean {
  return canUserAccessModule(authUser(), module);
}

export function canAccessModules(modules: readonly ProtectedModule[]): boolean {
  return canUserAccessModules(authUser(), modules);
}

export function isAuthUserAdmin(): boolean {
  return hasRole('admin');
}

export function getAuthUserIdentity(): { name: string; email: string } {
  return getIdentity(authUser());
}
