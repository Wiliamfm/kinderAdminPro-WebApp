import { render, screen } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './app';

const authMocks = vi.hoisted(() => ({
  getAuthUserIdentity: vi.fn(),
  isAuthenticated: vi.fn(),
  isAuthResolved: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('./lib/pocketbase/auth', () => ({
  getAuthUserIdentity: authMocks.getAuthUserIdentity,
  isAuthenticated: authMocks.isAuthenticated,
  isAuthResolved: authMocks.isAuthResolved,
  logout: authMocks.logout,
  refreshAuth: authMocks.refreshAuth,
}));

vi.mock('./lib/auth/guard', () => ({
  requireAuth: authMocks.requireAuth,
}));

vi.mock('./components/Navbar', () => ({
  default: () => <div>Navbar</div>,
}));

vi.mock('./routes/index', () => ({
  default: () => <div>Home route</div>,
}));

vi.mock('./routes/login', () => ({
  default: () => <div>Login route</div>,
}));

vi.mock('./routes/register', () => ({
  default: () => <div>Register route</div>,
}));

vi.mock('./routes/staff-management', () => ({
  default: () => <div>Staff route</div>,
}));

vi.mock('./routes/enrollment-management', () => ({
  default: () => <div>Enrollment route</div>,
}));

vi.mock('./routes/event-management', () => ({
  default: () => <div>Event route</div>,
}));

vi.mock('./routes/reports', () => ({
  default: () => <div>Reports route</div>,
}));

vi.mock('./routes/professor/events', () => ({
  default: () => <div>Professor events</div>,
}));

vi.mock('./routes/professor/personal', () => ({
  default: () => <div>Professor personal</div>,
}));

vi.mock('./routes/professor/students', () => ({
  default: () => <div>Professor students</div>,
}));

describe('App public routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/register');
    authMocks.getAuthUserIdentity.mockReturnValue({ name: 'Ana', email: 'ana@example.com' });
    authMocks.isAuthResolved.mockReturnValue(true);
    authMocks.isAuthenticated.mockReturnValue(false);
    authMocks.refreshAuth.mockResolvedValue(undefined);
    authMocks.logout.mockResolvedValue(undefined);
    authMocks.requireAuth.mockReturnValue({ allow: false, to: '/login' });
  });

  it('renders /register for unauthenticated users without redirecting to login', async () => {
    render(() => <App />);

    expect(await screen.findByText('Register route')).toBeInTheDocument();
    expect(screen.queryByText('Login route')).not.toBeInTheDocument();
  });

  it('also renders /register for authenticated users', async () => {
    authMocks.isAuthenticated.mockReturnValue(true);

    render(() => <App />);

    expect(await screen.findByText('Register route')).toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
  });
});
