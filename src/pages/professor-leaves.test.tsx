import { render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorLeavesPage from './professor-leaves';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  getAuthUserId: vi.fn(),
  getEmployeeByUserId: vi.fn(),
  listEmployeeLeaves: vi.fn(),
  createEmployeeLeave: vi.fn(),
  updateEmployeeLeave: vi.fn(),
  hasLeaveOverlap: vi.fn(),
  getCurrentSemester: vi.fn(),
  listSemesterOptions: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
}));

vi.mock('../lib/pocketbase/users', () => ({
  getAuthUserId: mocks.getAuthUserId,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  getEmployeeByUserId: mocks.getEmployeeByUserId,
}));

vi.mock('../lib/pocketbase/leaves', () => ({
  listEmployeeLeaves: mocks.listEmployeeLeaves,
  createEmployeeLeave: mocks.createEmployeeLeave,
  updateEmployeeLeave: mocks.updateEmployeeLeave,
  hasLeaveOverlap: mocks.hasLeaveOverlap,
}));

vi.mock('../lib/pocketbase/semesters', () => ({
  getCurrentSemester: mocks.getCurrentSemester,
  listSemesterOptions: mocks.listSemesterOptions,
}));

describe('ProfessorLeavesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessModule.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u1');
    mocks.getCurrentSemester.mockResolvedValue(null);
    mocks.listSemesterOptions.mockResolvedValue([]);
    mocks.listEmployeeLeaves.mockResolvedValue({ items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 });
  });

  it('shows error state when no employee is linked to the logged-in user', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorLeavesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontró/i)).toBeInTheDocument();
    });
  });

  it('redirects to home when module access is denied', async () => {
    mocks.canAccessModule.mockReturnValue(false);
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorLeavesPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows leave table when employee is found', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      documentId: '123',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      userId: 'u1',
      jobId: 'j1',
      jobName: 'Docente',
      jobSalary: 1000,
      cvFileName: '',
      cvUrl: null,
    });
    mocks.listEmployeeLeaves.mockResolvedValue({
      items: [
        {
          id: 'l1',
          employeeId: 'e1',
          semesterId: 's1',
          semesterName: '2024-1',
          start_datetime: '2024-03-01T08:00:00Z',
          end_datetime: '2024-03-01T10:00:00Z',
          created: '',
          updated: '',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(() => <ProfessorLeavesPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /editar salida/i })).toBeInTheDocument();
    });
  });
});
