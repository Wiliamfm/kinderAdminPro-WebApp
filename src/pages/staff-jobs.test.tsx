import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffJobsPage from './staff-jobs';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listEmployeeJobsPage: vi.fn(),
  createEmployeeJob: vi.fn(),
  updateEmployeeJob: vi.fn(),
  deleteEmployeeJob: vi.fn(),
  countEmployeesByJobId: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/employee-jobs', () => ({
  listEmployeeJobsPage: mocks.listEmployeeJobsPage,
  createEmployeeJob: mocks.createEmployeeJob,
  updateEmployeeJob: mocks.updateEmployeeJob,
  deleteEmployeeJob: mocks.deleteEmployeeJob,
  countEmployeesByJobId: mocks.countEmployeesByJobId,
}));

const jobsFixture = [
  { id: 'j1', name: 'Docente', salary: 1000 },
  { id: 'j2', name: 'Coordinador', salary: 1500 },
];

const jobsPageFixture = {
  items: jobsFixture,
  page: 1,
  perPage: 10,
  totalItems: jobsFixture.length,
  totalPages: 1,
};

describe('StaffJobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listEmployeeJobsPage.mockResolvedValue(jobsPageFixture);
    mocks.createEmployeeJob.mockResolvedValue(jobsFixture[0]);
    mocks.updateEmployeeJob.mockResolvedValue(jobsFixture[0]);
    mocks.deleteEmployeeJob.mockResolvedValue(undefined);
    mocks.countEmployeesByJobId.mockResolvedValue(0);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <StaffJobsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/staff-management', { replace: true });
    });
  });

  it('lists jobs and opens create modal', async () => {
    render(() => <StaffJobsPage />);
    expect(await screen.findByText('Docente')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Nuevo cargo'));
    expect(await screen.findByRole('heading', { name: 'Crear cargo' })).toBeInTheDocument();
  });

  it('requests jobs sorted by salary when header is clicked', async () => {
    render(() => <StaffJobsPage />);
    await screen.findByText('Docente');

    fireEvent.click(screen.getByRole('button', { name: 'Salario' }));
    await waitFor(() => {
      expect(mocks.listEmployeeJobsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'salary',
        sortDirection: 'asc',
      });
    });
  });

  it('creates a job', async () => {
    render(() => <StaffJobsPage />);
    await screen.findByText('Docente');

    fireEvent.click(screen.getByText('Nuevo cargo'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Auxiliar' } });
    fireEvent.input(screen.getByLabelText('Salario'), { target: { value: '900' } });
    fireEvent.click(screen.getAllByText('Crear cargo')[1]);

    await waitFor(() => {
      expect(mocks.createEmployeeJob).toHaveBeenCalledWith({ name: 'Auxiliar', salary: 900 });
    });
  });

  it('shows realtime validation in create modal after touching name', async () => {
    render(() => <StaffJobsPage />);
    await screen.findByText('Docente');

    fireEvent.click(screen.getByText('Nuevo cargo'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'A' } });

    expect(
      await screen.findByText('El nombre del cargo debe tener al menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(mocks.createEmployeeJob).not.toHaveBeenCalled();
  });

  it('edits a job', async () => {
    render(() => <StaffJobsPage />);
    await screen.findByText('Docente');

    fireEvent.click(screen.getByLabelText('Editar cargo Docente'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Docente titular' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateEmployeeJob).toHaveBeenCalledWith('j1', {
        name: 'Docente titular',
        salary: 1000,
      });
    });
  });

  it('blocks delete when job has linked employees', async () => {
    mocks.countEmployeesByJobId.mockResolvedValue(2);
    render(() => <StaffJobsPage />);
    await screen.findByText('Docente');

    fireEvent.click(screen.getByLabelText('Eliminar cargo Docente'));
    fireEvent.click(screen.getAllByText('Eliminar')[2]);

    await waitFor(() => {
      expect(mocks.countEmployeesByJobId).toHaveBeenCalledWith('j1');
    });
    expect(mocks.deleteEmployeeJob).not.toHaveBeenCalled();
    expect(await screen.findByText(/No se puede eliminar el cargo Docente/)).toBeInTheDocument();
  });

  it('supports jobs pagination next and previous', async () => {
    mocks.listEmployeeJobsPage.mockImplementation(async (page: number) => {
      if (page === 1) {
        return {
          items: [jobsFixture[0]],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }

      return {
        items: [jobsFixture[1]],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    render(() => <StaffJobsPage />);
    await screen.findByText('Docente');

    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(mocks.listEmployeeJobsPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'name',
        sortDirection: 'asc',
      });
    });

    fireEvent.click(screen.getByText('Anterior'));
    await waitFor(() => {
      expect(mocks.listEmployeeJobsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'name',
        sortDirection: 'asc',
      });
    });
  });
});
