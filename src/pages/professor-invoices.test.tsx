import { render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorInvoicesPage from './professor-invoices';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  getAuthUserId: vi.fn(),
  getEmployeeByUserId: vi.fn(),
  listEmployeeInvoices: vi.fn(),
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

vi.mock('../lib/pocketbase/invoices', () => ({
  listEmployeeInvoices: mocks.listEmployeeInvoices,
}));

const employee = {
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
};

describe('ProfessorInvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessModule.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u1');
    mocks.listEmployeeInvoices.mockResolvedValue({ items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 });
  });

  it('shows error state when no employee is linked to the logged-in user', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontró/i)).toBeInTheDocument();
    });
  });

  it('redirects to home when module access is denied', async () => {
    mocks.canAccessModule.mockReturnValue(false);
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows invoices table when employee is found', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv1',
          employeeId: 'e1',
          employeeName: 'Ana',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago marzo',
          created: '2024-03-01T08:00:00Z',
          updated: '2024-03-05T08:00:00Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Pago marzo')).toBeInTheDocument();
    });
  });

  it('shows empty state message when no invoices exist', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listEmployeeInvoices.mockResolvedValue({ items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 });

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no hay facturas/i)).toBeInTheDocument();
    });
  });
});
