import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './login';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  loginWithPassword: vi.fn(),
  isAuthenticated: vi.fn(),
  isAuthResolved: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ search: '?redirect=%2Freports' }),
}));

vi.mock('../lib/pocketbase/auth', () => ({
  loginWithPassword: mocks.loginWithPassword,
  isAuthenticated: mocks.isAuthenticated,
  isAuthResolved: mocks.isAuthResolved,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthenticated.mockReturnValue(false);
    mocks.isAuthResolved.mockReturnValue(true);
    mocks.loginWithPassword.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@test.com',
      roles: ['admin'],
    });
  });

  it('submits the server login action and redirects to the requested page', async () => {
    render(() => <LoginPage />);

    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'ana@test.com' } });
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mocks.loginWithPassword).toHaveBeenCalledWith('ana@test.com', 'Password123!');
    });

    expect(mocks.navigate).toHaveBeenCalledWith('/reports', { replace: true });
  });

  it('shows the server error message when login fails', async () => {
    mocks.loginWithPassword.mockRejectedValue({ message: 'Credenciales inválidas.' });

    render(() => <LoginPage />);

    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'ana@test.com' } });
    fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Credenciales inválidas.')).toBeInTheDocument();
  });

  it('redirects authenticated users away from the login route', async () => {
    mocks.isAuthenticated.mockReturnValue(true);

    render(() => <LoginPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
