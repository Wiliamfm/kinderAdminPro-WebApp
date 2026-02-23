import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthSetPasswordPage from './auth-set-password';

const mocks = vi.hoisted(() => ({
  useLocation: vi.fn(),
  confirmPasswordSetupToken: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useLocation: mocks.useLocation,
}));

vi.mock('../lib/pocketbase/users', () => ({
  confirmPasswordSetupToken: mocks.confirmPasswordSetupToken,
}));

describe('AuthSetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useLocation.mockReturnValue({ search: '?token=reset123' });
    mocks.confirmPasswordSetupToken.mockResolvedValue(undefined);
  });

  it('submits password setup with token', async () => {
    render(() => <AuthSetPasswordPage />);

    fireEvent.input(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Password123!' },
    });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByText('Guardar contraseña'));

    await waitFor(() => {
      expect(mocks.confirmPasswordSetupToken).toHaveBeenCalledWith(
        'reset123',
        'Password123!',
        'Password123!',
      );
    });
    expect(await screen.findByText(/Contraseña actualizada/)).toBeInTheDocument();
  });

  it('blocks submit when passwords do not match', async () => {
    render(() => <AuthSetPasswordPage />);

    fireEvent.input(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'Password123!' },
    });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByText('Guardar contraseña'));

    expect(await screen.findByText('La confirmación de contraseña no coincide.')).toBeInTheDocument();
    expect(mocks.confirmPasswordSetupToken).not.toHaveBeenCalled();
  });

  it('blocks submit when password is weak', async () => {
    render(() => <AuthSetPasswordPage />);

    fireEvent.input(screen.getByLabelText('Nueva contraseña'), {
      target: { value: 'weakpass' },
    });
    fireEvent.input(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'weakpass' },
    });
    fireEvent.click(screen.getByText('Guardar contraseña'));

    expect(
      await screen.findByText(
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.',
      ),
    ).toBeInTheDocument();
    expect(mocks.confirmPasswordSetupToken).not.toHaveBeenCalled();
  });
});
