import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canAccessModule } from './auth';

const hoisted = vi.hoisted(() => {
  const pb = {
    collection: vi.fn(() => ({})),
    authStore: {
      isValid: false,
      record: null as { roles?: string[]; is_admin?: boolean } | null,
      clear: vi.fn(),
      onChange: vi.fn(),
    },
  };

  return { pb };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
}));

function setAuthRecord(record: { roles?: string[]; is_admin?: boolean } | null) {
  hoisted.pb.authStore.record = record;
}

describe('canAccessModule', () => {
  beforeEach(() => {
    setAuthRecord(null);
  });

  it('grants admin modules to admin users', () => {
    setAuthRecord({ roles: ['admin'] });
    expect(canAccessModule('staff')).toBe(true);
    expect(canAccessModule('enrollment')).toBe(true);
    expect(canAccessModule('reports')).toBe(true);
    expect(canAccessModule('events')).toBe(true);
    expect(canAccessModule('users')).toBe(true);
  });

  it('denies admin modules to professor-only users', () => {
    setAuthRecord({ roles: ['professor'] });
    expect(canAccessModule('staff')).toBe(false);
    expect(canAccessModule('enrollment')).toBe(false);
    expect(canAccessModule('reports')).toBe(false);
    expect(canAccessModule('events')).toBe(false);
    expect(canAccessModule('users')).toBe(false);
  });

  it('grants professor-personal to professor users', () => {
    setAuthRecord({ roles: ['professor'] });
    expect(canAccessModule('professor-personal')).toBe(true);
  });

  it('grants professor-students to professor users', () => {
    setAuthRecord({ roles: ['professor'] });
    expect(canAccessModule('professor-students')).toBe(true);
  });

  it('grants professor-events to professor users', () => {
    setAuthRecord({ roles: ['professor'] });
    expect(canAccessModule('professor-events')).toBe(true);
  });

  it('denies professor modules to unauthenticated users', () => {
    setAuthRecord(null);
    expect(canAccessModule('professor-personal')).toBe(false);
    expect(canAccessModule('professor-students')).toBe(false);
    expect(canAccessModule('professor-events')).toBe(false);
  });

  it('denies professor modules to admin-only users', () => {
    setAuthRecord({ roles: ['admin'] });
    expect(canAccessModule('professor-personal')).toBe(false);
    expect(canAccessModule('professor-students')).toBe(false);
    expect(canAccessModule('professor-events')).toBe(false);
  });

  it('grants both admin and professor modules to users with both roles', () => {
    setAuthRecord({ roles: ['admin', 'professor'] });
    expect(canAccessModule('staff')).toBe(true);
    expect(canAccessModule('professor-personal')).toBe(true);
  });
});
