import { render, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './home';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  hasRole: vi.fn(),
  getDashboardData: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  A: (props: { href: string; children: unknown }) => <a href={props.href}>{props.children}</a>,
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  hasRole: mocks.hasRole,
}));

vi.mock('../lib/pocketbase/dashboard', () => ({
  getDashboardData: mocks.getDashboardData,
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDashboardData.mockResolvedValue({
      semester: null,
      grades: [],
      totalStudents: 0,
    });
    mocks.hasRole.mockImplementation((role: string) => role === 'father');
  });

  it('redirects father-only users to the father portal', async () => {
    render(() => <HomePage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/father-portal', { replace: true });
    });
  });
});
