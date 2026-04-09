import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorLeavesPage from './professor-leaves';

const employeeFixture = {
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

const currentSemesterFixture = {
  id: 'sem-current',
  name: '2026-1',
  start_date: '2026-03-01T00:00:00-05:00',
  end_date: '2026-07-31T00:00:00-05:00',
  is_current: true,
  created_at: '',
  updated_at: '',
};

const storedSemesterFixture = {
  id: 'sem-old',
  name: '2025-2',
  start_date: '2025-08-01T00:00:00-05:00',
  end_date: '2025-11-30T00:00:00-05:00',
  is_current: false,
  created_at: '',
  updated_at: '',
};

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
  getSemesterById: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
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
  getSemesterById: mocks.getSemesterById,
}));

function renderPage() {
  render(() => <ProfessorLeavesPage />);
}

async function openCreateModal() {
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Nueva ausencia' }));
}

describe('ProfessorLeavesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessModule.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u1');
    mocks.getEmployeeByUserId.mockResolvedValue(employeeFixture);
    mocks.listEmployeeLeaves.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });
    mocks.createEmployeeLeave.mockResolvedValue({
      id: 'leave-1',
      employeeId: 'e1',
      semesterId: 'sem-current',
      start_datetime: '2026-03-10T10:00:00.000Z',
      end_datetime: '2026-03-10T12:00:00.000Z',
    });
    mocks.updateEmployeeLeave.mockResolvedValue({
      id: 'leave-1',
      employeeId: 'e1',
      semesterId: 'sem-old',
      start_datetime: '2025-09-10T10:00:00.000Z',
      end_datetime: '2025-09-10T12:00:00.000Z',
    });
    mocks.hasLeaveOverlap.mockResolvedValue(false);
    mocks.getCurrentSemester.mockResolvedValue(currentSemesterFixture);
    mocks.getSemesterById.mockResolvedValue(storedSemesterFixture);
  });

  it('shows error state when no employee is linked to the logged-in user', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    renderPage();

    expect(
      await screen.findByText(/no se encontró un registro de empleado vinculado/i),
    ).toBeInTheDocument();
  });

  it('redirects to home when module access is denied', async () => {
    mocks.canAccessModule.mockReturnValue(false);

    renderPage();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows leave table when employee is found', async () => {
    mocks.listEmployeeLeaves.mockResolvedValue({
      items: [
        {
          id: 'leave-1',
          employeeId: 'e1',
          semesterId: 'sem-old',
          start_datetime: '2025-09-10T10:00:00.000Z',
          end_datetime: '2025-09-10T12:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    renderPage();

    expect(await screen.findByRole('button', { name: /editar ausencia/i })).toBeInTheDocument();
  });

  it('shows the current semester as read-only text in create mode', async () => {
    await openCreateModal();

    expect(await screen.findByText('2026-1')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /trimestre/i })).not.toBeInTheDocument();
    expect(mocks.getCurrentSemester).toHaveBeenCalledTimes(1);
    expect(mocks.getSemesterById).not.toHaveBeenCalled();
  });

  it('shows the missing-current-semester error and disables confirmation', async () => {
    mocks.getCurrentSemester.mockResolvedValue(null);

    await openCreateModal();

    expect(
      await screen.findByText('No hay un trimestre activo configurado. Contacta al administrador.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar ausencia' })).toBeDisabled();
  });

  it('shows inline boundary errors when the start datetime is outside the current semester', async () => {
    await openCreateModal();

    fireEvent.input(screen.getByLabelText('Fecha y hora de inicio'), {
      target: { value: '2026-02-28T10:00' },
    });
    fireEvent.input(screen.getByLabelText('Fecha y hora de fin'), {
      target: { value: '2026-03-01T12:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ausencia' }));

    expect(
      await screen.findByText('La fecha debe estar dentro del trimestre (01/03/2026 - 31/07/2026).'),
    ).toBeInTheDocument();
    expect(mocks.createEmployeeLeave).not.toHaveBeenCalled();
  });

  it('shows inline boundary errors when the end datetime is outside the current semester', async () => {
    await openCreateModal();

    fireEvent.input(screen.getByLabelText('Fecha y hora de inicio'), {
      target: { value: '2026-07-31T10:00' },
    });
    fireEvent.input(screen.getByLabelText('Fecha y hora de fin'), {
      target: { value: '2026-08-01T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ausencia' }));

    expect(
      await screen.findByText('La fecha debe estar dentro del trimestre (01/03/2026 - 31/07/2026).'),
    ).toBeInTheDocument();
    expect(mocks.createEmployeeLeave).not.toHaveBeenCalled();
  });

  it('creates a leave with the current semester id assigned automatically', async () => {
    await openCreateModal();
    await screen.findByText('2026-1');

    fireEvent.input(screen.getByLabelText('Fecha y hora de inicio'), {
      target: { value: '2026-03-10T10:00' },
    });
    fireEvent.input(screen.getByLabelText('Fecha y hora de fin'), {
      target: { value: '2026-03-10T12:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ausencia' }));

    await waitFor(() => {
      expect(mocks.createEmployeeLeave).toHaveBeenCalledTimes(1);
    });

    expect(mocks.createEmployeeLeave).toHaveBeenCalledWith({
      employeeId: 'e1',
      semesterId: 'sem-current',
      start_datetime: new Date('2026-03-10T10:00').toISOString(),
      end_datetime: new Date('2026-03-10T12:00').toISOString(),
    });
  });

  it('fetches the stored semester for edit mode and keeps it read-only', async () => {
    mocks.listEmployeeLeaves.mockResolvedValue({
      items: [
        {
          id: 'leave-42',
          employeeId: 'e1',
          semesterId: 'sem-old',
          start_datetime: '2025-09-10T10:00:00.000Z',
          end_datetime: '2025-09-10T12:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /editar ausencia/i }));

    expect(await screen.findByText('2025-2')).toBeInTheDocument();
    expect(mocks.getSemesterById).toHaveBeenCalledWith('sem-old');
    expect(screen.queryByRole('combobox', { name: /trimestre/i })).not.toBeInTheDocument();

    const startInput = screen.getByLabelText('Fecha y hora de inicio') as HTMLInputElement;
    const endInput = screen.getByLabelText('Fecha y hora de fin') as HTMLInputElement;

    expect(new Date(startInput.value).toISOString()).toBe('2025-09-10T10:00:00.000Z');
    expect(new Date(endInput.value).toISOString()).toBe('2025-09-10T12:00:00.000Z');

    fireEvent.input(endInput, { target: { value: '2025-09-10T13:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(mocks.updateEmployeeLeave).toHaveBeenCalledTimes(1);
    });

    expect(mocks.updateEmployeeLeave).toHaveBeenCalledWith('leave-42', {
      employeeId: 'e1',
      semesterId: 'sem-old',
      start_datetime: new Date(startInput.value).toISOString(),
      end_datetime: new Date('2025-09-10T13:00').toISOString(),
    });
  });

  it('shows the semester load error when the current semester request fails', async () => {
    mocks.getCurrentSemester.mockRejectedValue({
      message: 'No autorizado para consultar trimestres.',
      status: 403,
      isAbort: false,
    });

    await openCreateModal();

    expect(await screen.findByText('No autorizado para consultar trimestres.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar ausencia' })).toBeDisabled();
  });
});
