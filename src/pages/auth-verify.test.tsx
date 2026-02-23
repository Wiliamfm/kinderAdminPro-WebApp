import { render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthVerifyPage from './auth-verify';

const mocks = vi.hoisted(() => ({
  useLocation: vi.fn(),
  confirmVerificationToken: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useLocation: mocks.useLocation,
}));

vi.mock('../lib/pocketbase/users', () => ({
  confirmVerificationToken: mocks.confirmVerificationToken,
}));

describe('AuthVerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLocation.mockReturnValue({ search: '?token=verify123' });
    mocks.confirmVerificationToken.mockResolvedValue(undefined);
  });

  it('confirms token and shows success', async () => {
    render(() => <AuthVerifyPage />);

    await waitFor(() => {
      expect(mocks.confirmVerificationToken).toHaveBeenCalledWith('verify123');
    });
    expect(await screen.findByText(/Correo verificado/)).toBeInTheDocument();
  });

  it('shows error if token is missing', async () => {
    mocks.useLocation.mockReturnValue({ search: '' });
    render(() => <AuthVerifyPage />);

    expect(
      await screen.findByText('El enlace de verificación no contiene un token válido.'),
    ).toBeInTheDocument();
    expect(mocks.confirmVerificationToken).not.toHaveBeenCalled();
  });
});
