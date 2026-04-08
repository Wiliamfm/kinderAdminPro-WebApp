import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canAccessModule,
  clearAuthState,
  getAuthUserId,
  isAuthenticated,
  loginWithPassword,
  logout,
  primeAuthState,
  refreshAuth,
} from './auth';

const hoisted = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loginWithPassword: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../server/auth', () => ({
  getCurrentUser: hoisted.getCurrentUser,
  loginWithPassword: hoisted.loginWithPassword,
  logout: hoisted.logout,
}));

describe('auth session state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthState();
  });

  it('refreshes auth state from the server function', async () => {
    hoisted.getCurrentUser.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      roles: ['admin'],
    });

    const user = await refreshAuth();

    expect(user?.id).toBe('u1');
    expect(isAuthenticated()).toBe(true);
    expect(getAuthUserId()).toBe('u1');
  });

  it('updates auth state after server-side login', async () => {
    hoisted.loginWithPassword.mockResolvedValue({
      id: 'u2',
      name: 'Luis',
      email: 'luis@test.com',
      roles: ['professor'],
    });

    await loginWithPassword('luis@test.com', 'Password123!');

    expect(hoisted.loginWithPassword).toHaveBeenCalledWith('luis@test.com', 'Password123!');
    expect(isAuthenticated()).toBe(true);
    expect(canAccessModule('professor-personal')).toBe(true);
    expect(canAccessModule('staff')).toBe(false);
  });

  it('clears auth state after server-side logout', async () => {
    primeAuthState({
      id: 'u3',
      name: 'Ana',
      email: 'ana@test.com',
      roles: ['admin'],
    });
    hoisted.logout.mockResolvedValue(undefined);

    await logout();

    expect(hoisted.logout).toHaveBeenCalled();
    expect(isAuthenticated()).toBe(false);
    expect(getAuthUserId()).toBeNull();
  });
});

describe('canAccessModule', () => {
  beforeEach(() => {
    clearAuthState();
  });

  it('grants admin modules to admin users', () => {
    primeAuthState({
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      roles: ['admin'],
    });
    expect(canAccessModule('staff')).toBe(true);
    expect(canAccessModule('enrollment')).toBe(true);
    expect(canAccessModule('reports')).toBe(true);
    expect(canAccessModule('events')).toBe(true);
    expect(canAccessModule('users')).toBe(true);
  });

  it('denies admin modules to professor-only users', () => {
    primeAuthState({
      id: 'u1',
      name: 'Luis',
      email: 'luis@test.com',
      roles: ['professor'],
    });
    expect(canAccessModule('staff')).toBe(false);
    expect(canAccessModule('enrollment')).toBe(false);
    expect(canAccessModule('reports')).toBe(false);
    expect(canAccessModule('events')).toBe(false);
    expect(canAccessModule('users')).toBe(false);
  });

  it('grants professor modules to professor users', () => {
    primeAuthState({
      id: 'u1',
      name: 'Luis',
      email: 'luis@test.com',
      roles: ['professor'],
    });
    expect(canAccessModule('professor-personal')).toBe(true);
    expect(canAccessModule('professor-students')).toBe(true);
    expect(canAccessModule('professor-events')).toBe(true);
  });

  it('denies professor modules to unauthenticated users', () => {
    expect(canAccessModule('professor-personal')).toBe(false);
    expect(canAccessModule('professor-students')).toBe(false);
    expect(canAccessModule('professor-events')).toBe(false);
  });

  it('denies professor modules to admin-only users', () => {
    primeAuthState({
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      roles: ['admin'],
    });
    expect(canAccessModule('professor-personal')).toBe(false);
    expect(canAccessModule('professor-students')).toBe(false);
    expect(canAccessModule('professor-events')).toBe(false);
  });

  it('grants both admin and professor modules to users with both roles', () => {
    primeAuthState({
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      roles: ['admin', 'professor'],
    });
    expect(canAccessModule('staff')).toBe(true);
    expect(canAccessModule('professor-personal')).toBe(true);
  });
});
