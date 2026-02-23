import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppUsersPage from './app-users';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listAppUsers: vi.fn(),
  updateAppUser: vi.fn(),
  deleteAppUser: vi.fn(),
  getAuthUserId: vi.fn(),
  requestAuthenticatedUserEmailChange: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/users', () => ({
  listAppUsers: mocks.listAppUsers,
  updateAppUser: mocks.updateAppUser,
  deleteAppUser: mocks.deleteAppUser,
  getAuthUserId: mocks.getAuthUserId,
  requestAuthenticatedUserEmailChange: mocks.requestAuthenticatedUserEmailChange,
}));

const usersFixture = [
  {
    id: 'u-admin',
    name: 'Ana Admin',
    email: 'ana@test.com',
    isAdmin: true,
    verified: true,
  },
  {
    id: 'u-user',
    name: 'Luis User',
    email: 'luis@test.com',
    isAdmin: false,
    verified: true,
  },
];

describe('AppUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u-admin');
    mocks.listAppUsers.mockResolvedValue(usersFixture);
    mocks.updateAppUser.mockResolvedValue(usersFixture[0]);
    mocks.deleteAppUser.mockResolvedValue(undefined);
    mocks.requestAuthenticatedUserEmailChange.mockResolvedValue(undefined);
  });

  it('shows users table with expected columns and rows for admins', async () => {
    render(() => <AppUsersPage />);

    expect(await screen.findByText('Ana Admin')).toBeInTheDocument();
    expect(screen.getByText('Luis User')).toBeInTheDocument();
    expect(screen.getByText('Correo')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar usuario Ana Admin')).toBeInTheDocument();
  });

  it('redirects non-admin users to staff management', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <AppUsersPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/staff-management', { replace: true });
    });
    expect(mocks.listAppUsers).not.toHaveBeenCalled();
  });

  it('edits a user from modal and refreshes list', async () => {
    render(() => <AppUsersPage />);
    await screen.findByText('Ana Admin');

    fireEvent.click(screen.getByLabelText('Editar usuario Ana Admin'));
    await screen.findByRole('heading', { name: 'Editar usuario' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Ana Maria' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateAppUser).toHaveBeenCalledWith('u-admin', {
        name: 'Ana Maria',
        email: 'ana@test.com',
        isAdmin: true,
      });
    });

    expect(mocks.listAppUsers).toHaveBeenCalledTimes(2);
  });

  it('requests own email change when editing current user email', async () => {
    render(() => <AppUsersPage />);
    await screen.findByText('Ana Admin');

    fireEvent.click(screen.getByLabelText('Editar usuario Ana Admin'));
    await screen.findByRole('heading', { name: 'Editar usuario' });

    fireEvent.input(screen.getByLabelText('Correo'), { target: { value: 'ana.new@test.com' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.requestAuthenticatedUserEmailChange).toHaveBeenCalledWith('ana.new@test.com');
    });
  });

  it('hides delete action for current authenticated user', async () => {
    render(() => <AppUsersPage />);
    await screen.findByText('Ana Admin');

    expect(screen.queryByLabelText('Eliminar usuario Ana Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Tu usuario')).toBeInTheDocument();
  });

  it('deletes another user from confirmation modal', async () => {
    render(() => <AppUsersPage />);
    await screen.findByText('Luis User');

    fireEvent.click(screen.getByLabelText('Eliminar usuario Luis User'));
    await screen.findByRole('heading', { name: 'Eliminar usuario' });

    fireEvent.click(screen.getAllByText('Eliminar')[1]);

    await waitFor(() => {
      expect(mocks.deleteAppUser).toHaveBeenCalledWith('u-user');
    });
    expect(mocks.listAppUsers).toHaveBeenCalledTimes(2);
  });

  it('keeps email input disabled when editing another user', async () => {
    render(() => <AppUsersPage />);
    await screen.findByText('Luis User');

    fireEvent.click(screen.getByLabelText('Editar usuario Luis User'));
    await screen.findByRole('heading', { name: 'Editar usuario' });

    expect(screen.getByLabelText('Correo')).toBeDisabled();
    expect(
      screen.getByText('El correo de otros usuarios se gestiona desde PocketBase Admin.'),
    ).toBeInTheDocument();
  });
});
