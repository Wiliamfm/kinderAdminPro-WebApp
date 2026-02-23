import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  confirmPasswordSetupToken,
  confirmVerificationToken,
  createEmployeeUser,
  resendUserOnboarding,
  sendPasswordSetupEmail,
  sendUserOnboardingEmails,
  sendVerificationEmail,
} from './users';

const hoisted = vi.hoisted(() => {
  const create = vi.fn();
  const requestVerification = vi.fn();
  const requestPasswordReset = vi.fn();
  const confirmVerification = vi.fn();
  const confirmPasswordReset = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      create,
      requestVerification,
      requestPasswordReset,
      confirmVerification,
      confirmPasswordReset,
    })),
  };

  return {
    create,
    requestVerification,
    requestPasswordReset,
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
});
