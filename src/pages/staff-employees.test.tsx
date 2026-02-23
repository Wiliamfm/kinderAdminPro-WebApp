import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffEmployeesPage from './staff-employees';

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    isAuthUserAdmin: vi.fn(),
    listActiveEmployees: vi.fn(),
    deactivateEmployee: vi.fn(),
    listEmployeeLeaves: vi.fn(),
    createEmployeeLeave: vi.fn(),
    updateEmployeeLeave: vi.fn(),
    hasLeaveOverlap: vi.fn(),
  };
});

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  listActiveEmployees: mocks.listActiveEmployees,
  deactivateEmployee: mocks.deactivateEmployee,
}));

vi.mock('../lib/pocketbase/leaves', () => ({
  listEmployeeLeaves: mocks.listEmployeeLeaves,
  createEmployeeLeave: mocks.createEmployeeLeave,
  updateEmployeeLeave: mocks.updateEmployeeLeave,
  hasLeaveOverlap: mocks.hasLeaveOverlap,
}));

const employee = {
  id: 'e1',
  name: 'Ana',
  salary: 1000,
  job: 'Docente',
  email: 'ana@test.com',
  phone: '3000000',
  address: 'Calle 1',
  emergency_contact: 'Luis',
  active: true,
};

const emptyLeavesPage = {
  items: [],
  page: 1,
  perPage: 10,
  totalItems: 0,
  totalPages: 1,
};

describe('StaffEmployeesPage leaves feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listActiveEmployees.mockResolvedValue([employee]);
    mocks.listEmployeeLeaves.mockResolvedValue(emptyLeavesPage);
    mocks.hasLeaveOverlap.mockResolvedValue(false);
    mocks.createEmployeeLeave.mockResolvedValue({
      id: 'leave-1',
      employee: 'e1',
      start_datetime: '2026-02-20T10:00:00.000Z',
      end_datetime: '2026-02-20T12:00:00.000Z',
    });
    mocks.updateEmployeeLeave.mockResolvedValue({
      id: 'leave-1',
      employee: 'e1',
      start_datetime: '2026-02-20T10:00:00.000Z',
      end_datetime: '2026-02-20T12:00:00.000Z',
    });
  });

  const openLeavesModal = async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    fireEvent.click(screen.getByLabelText('Gestionar licencias de Ana'));
    await screen.findByText('Licencias de Ana');
  };

  it('shows leaves action for admins', async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    expect(screen.getByLabelText('Gestionar licencias de Ana')).toBeInTheDocument();
  });

  it('hides leaves action for non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    expect(screen.queryByLabelText('Gestionar licencias de Ana')).not.toBeInTheDocument();
  });

  it('opens leaves modal with form and table', async () => {
    await openLeavesModal();

    expect(screen.getByText('Inicio de licencia')).toBeInTheDocument();
    expect(screen.getByText('Fin de licencia')).toBeInTheDocument();
    expect(screen.getByText('Este empleado no tiene licencias registradas.')).toBeInTheDocument();
  });

  it('blocks submit when end datetime is not later than start datetime', async () => {
    await openLeavesModal();

    const startInput = screen.getByLabelText('Inicio de licencia');
    const endInput = screen.getByLabelText('Fin de licencia');

    fireEvent.input(startInput, { target: { value: '2026-02-20T10:00' } });
    fireEvent.input(endInput, { target: { value: '2026-02-20T09:00' } });
    fireEvent.click(screen.getByText('Guardar licencia'));

    expect(
      await screen.findByText('La fecha de fin debe ser posterior a la fecha de inicio.'),
    ).toBeInTheDocument();
    expect(mocks.createEmployeeLeave).not.toHaveBeenCalled();
  });

  it('blocks submit when overlap exists', async () => {
    await openLeavesModal();
    mocks.hasLeaveOverlap.mockResolvedValue(true);

    fireEvent.input(screen.getByLabelText('Inicio de licencia'), {
      target: { value: '2026-02-20T10:00' },
    });
    fireEvent.input(screen.getByLabelText('Fin de licencia'), {
      target: { value: '2026-02-20T12:00' },
    });
    fireEvent.click(screen.getByText('Guardar licencia'));

    expect(
      await screen.findByText('La licencia se cruza con otra licencia existente para este empleado.'),
    ).toBeInTheDocument();
    expect(mocks.createEmployeeLeave).not.toHaveBeenCalled();
  });

  it('creates leave and resets form values', async () => {
    await openLeavesModal();

    const startInput = screen.getByLabelText('Inicio de licencia') as HTMLInputElement;
    const endInput = screen.getByLabelText('Fin de licencia') as HTMLInputElement;

    fireEvent.input(startInput, { target: { value: '2026-02-20T10:00' } });
    fireEvent.input(endInput, { target: { value: '2026-02-20T12:00' } });
    fireEvent.click(screen.getByText('Guardar licencia'));

    await waitFor(() => {
      expect(mocks.createEmployeeLeave).toHaveBeenCalledTimes(1);
    });

    expect(mocks.createEmployeeLeave).toHaveBeenCalledWith({
      employee: 'e1',
      start_datetime: new Date('2026-02-20T10:00').toISOString(),
      end_datetime: new Date('2026-02-20T12:00').toISOString(),
    });

    expect(startInput.value).toBe('');
    expect(endInput.value).toBe('');

    const lastCall = mocks.listEmployeeLeaves.mock.calls.at(-1);
    expect(lastCall).toEqual(['e1', 1, 10]);
  });

  it('prefills form when editing a leave row', async () => {
    mocks.listEmployeeLeaves.mockResolvedValue({
      items: [
        {
          id: 'leave-42',
          employee: 'e1',
          start_datetime: '2026-02-20T10:00:00.000Z',
          end_datetime: '2026-02-20T12:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    await openLeavesModal();
    fireEvent.click(screen.getByLabelText('Editar licencia leave-42'));

    const startInput = screen.getByLabelText('Inicio de licencia') as HTMLInputElement;
    const endInput = screen.getByLabelText('Fin de licencia') as HTMLInputElement;

    expect(new Date(startInput.value).toISOString()).toBe('2026-02-20T10:00:00.000Z');
    expect(new Date(endInput.value).toISOString()).toBe('2026-02-20T12:00:00.000Z');
    expect(screen.getByText('Actualizar licencia')).toBeInTheDocument();
  });

  it('updates leave when form is in edit mode', async () => {
    mocks.listEmployeeLeaves.mockResolvedValue({
      items: [
        {
          id: 'leave-42',
          employee: 'e1',
          start_datetime: '2026-02-20T10:00:00.000Z',
          end_datetime: '2026-02-20T12:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    await openLeavesModal();
    fireEvent.click(screen.getByLabelText('Editar licencia leave-42'));
    fireEvent.input(screen.getByLabelText('Fin de licencia'), {
      target: { value: '2026-02-20T13:00' },
    });
    fireEvent.click(screen.getByText('Actualizar licencia'));

    await waitFor(() => {
      expect(mocks.updateEmployeeLeave).toHaveBeenCalledTimes(1);
    });

    const updateCall = mocks.updateEmployeeLeave.mock.calls[0];
    const updatePayload = updateCall[1];
    expect(mocks.updateEmployeeLeave).toHaveBeenCalledWith('leave-42', {
      employee: 'e1',
      start_datetime: updatePayload.start_datetime,
      end_datetime: new Date('2026-02-20T13:00').toISOString(),
    });
    expect(new Date(updatePayload.start_datetime).toISOString()).toBe('2026-02-20T10:00:00.000Z');
    expect(mocks.createEmployeeLeave).not.toHaveBeenCalled();
    expect(mocks.hasLeaveOverlap).toHaveBeenCalledWith(
      'e1',
      updatePayload.start_datetime,
      new Date('2026-02-20T13:00').toISOString(),
      'leave-42',
    );
  });

  it('supports leaves pagination next and previous', async () => {
    mocks.listEmployeeLeaves.mockImplementation(async (_employeeId: string, page: number) => {
      if (page === 1) {
        return {
          items: [],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }
      return {
        items: [],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    await openLeavesModal();
    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(mocks.listEmployeeLeaves).toHaveBeenCalledWith('e1', 2, 10);
    });

    fireEvent.click(screen.getByText('Anterior'));
    await waitFor(() => {
      expect(mocks.listEmployeeLeaves).toHaveBeenCalledWith('e1', 1, 10);
    });
  });
});
