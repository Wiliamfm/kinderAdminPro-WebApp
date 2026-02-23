import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmPasswordSetupToken,
  confirmVerificationToken,
  createEmployeeUser,
  deleteAppUser,
  getAuthUserId,
  listAppUsers,
  requestAuthenticatedUserEmailChange,
  resendUserOnboarding,
  sendPasswordSetupEmail,
  sendUserOnboardingEmails,
  sendVerificationEmail,
  updateAppUser,
} from './users';

const hoisted = vi.hoisted(() => {
  const create = vi.fn();
  const getFullList = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  const requestVerification = vi.fn();
  const requestPasswordReset = vi.fn();
  const requestEmailChange = vi.fn();
  const confirmVerification = vi.fn();
  const confirmPasswordReset = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      create,
      getFullList,
      update,
      delete: del,
      requestVerification,
      requestPasswordReset,
      requestEmailChange,
      confirmVerification,
      confirmPasswordReset,
    })),
    authStore: {
      model: null as { id?: string } | null,
      record: null as { id?: string } | null,
    },
  };

  return {
    create,
    getFullList,
    update,
    del,
    requestVerification,
    requestPasswordReset,
    requestEmailChange,
    confirmVerification,
    confirmPasswordReset,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('users pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.pb.authStore.model = null;
    hoisted.pb.authStore.record = null;
  });

  it('creates employee user and defaults to non-admin', async () => {
    hoisted.create.mockResolvedValue({
      id: 'u1',
      email: 'ana@test.com',
      name: 'Ana',
      is_admin: false,
      verified: false,
    });

    const result = await createEmployeeUser({
      email: 'ana@test.com',
      name: 'Ana',
    });

    const payload = hoisted.create.mock.calls[0][0];
    expect(payload).toMatchObject({
      email: 'ana@test.com',
      name: 'Ana',
      is_admin: false,
    });
    expect(typeof payload.password).toBe('string');
    expect(payload.password).toBe(payload.passwordConfirm);
    expect(result).toMatchObject({
      id: 'u1',
      email: 'ana@test.com',
      name: 'Ana',
      isAdmin: false,
      verified: false,
    });
  });

  it('sends verification email', async () => {
    await sendVerificationEmail('ana@test.com');
    expect(hoisted.requestVerification).toHaveBeenCalledWith('ana@test.com');
  });

  it('sends password setup email', async () => {
    await sendPasswordSetupEmail('ana@test.com');
    expect(hoisted.requestPasswordReset).toHaveBeenCalledWith('ana@test.com');
  });

  it('requests authenticated user email change', async () => {
    await requestAuthenticatedUserEmailChange('ana+new@test.com');
    expect(hoisted.requestEmailChange).toHaveBeenCalledWith('ana+new@test.com');
  });

  it('sends onboarding emails in order and supports resend', async () => {
    await sendUserOnboardingEmails('ana@test.com');
    expect(hoisted.requestVerification).not.toHaveBeenCalled();
    expect(hoisted.requestPasswordReset).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    await resendUserOnboarding('ana@test.com');
    expect(hoisted.requestVerification).not.toHaveBeenCalled();
    expect(hoisted.requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('confirms verification token', async () => {
    await confirmVerificationToken('token-1');
    expect(hoisted.confirmVerification).toHaveBeenCalledWith('token-1');
  });

  it('confirms password setup token', async () => {
    await confirmPasswordSetupToken('token-2', 'Password123!', 'Password123!');
    expect(hoisted.confirmPasswordReset).toHaveBeenCalledWith(
      'token-2',
      'Password123!',
      'Password123!',
    );
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.requestVerification.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(sendVerificationEmail('ana@test.com')).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });

  it('lists app users', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'u1',
        email: 'ana@test.com',
        name: 'Ana',
        is_admin: true,
        verified: true,
      },
      {
        id: 'u2',
        email: 'luis@test.com',
        name: 'Luis',
        is_admin: false,
        verified: false,
      },
    ]);

    const result = await listAppUsers();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name' });
    expect(result).toEqual([
      {
        id: 'u1',
        email: 'ana@test.com',
        name: 'Ana',
        isAdmin: true,
        verified: true,
      },
      {
        id: 'u2',
        email: 'luis@test.com',
        name: 'Luis',
        isAdmin: false,
        verified: false,
      },
    ]);
  });

  it('updates app user fields', async () => {
    hoisted.update.mockResolvedValue({
      id: 'u1',
      email: 'ana+1@test.com',
      name: 'Ana Maria',
      is_admin: true,
      verified: true,
    });

    const result = await updateAppUser('u1', {
      email: ' ana+1@test.com ',
      name: ' Ana Maria ',
      isAdmin: true,
    });

    expect(hoisted.update).toHaveBeenCalledWith('u1', {
      email: 'ana+1@test.com',
      name: 'Ana Maria',
      is_admin: true,
    });
    expect(result).toEqual({
      id: 'u1',
      email: 'ana+1@test.com',
      name: 'Ana Maria',
      isAdmin: true,
      verified: true,
    });
  });

  it('deletes app user by id', async () => {
    await deleteAppUser('u2');
    expect(hoisted.del).toHaveBeenCalledWith('u2');
  });

  it('returns authenticated user id from model or record', () => {
    hoisted.pb.authStore.model = { id: 'u-model' };
    expect(getAuthUserId()).toBe('u-model');

    hoisted.pb.authStore.model = null;
    hoisted.pb.authStore.record = { id: 'u-record' };
    expect(getAuthUserId()).toBe('u-record');

    hoisted.pb.authStore.record = null;
    expect(getAuthUserId()).toBeNull();
  });
});
