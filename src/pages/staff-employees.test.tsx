import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffEmployeesPage from './staff-employees';

const mocks = vi.hoisted(() => {
  return {
    navigate: vi.fn(),
    isAuthUserAdmin: vi.fn(),
    listActiveEmployees: vi.fn(),
    listEmployeeJobs: vi.fn(),
    createEmployee: vi.fn(),
    deactivateEmployee: vi.fn(),
    createEmployeeUser: vi.fn(),
    sendUserOnboardingEmails: vi.fn(),
    resendUserOnboarding: vi.fn(),
    listEmployeeLeaves: vi.fn(),
    createEmployeeLeave: vi.fn(),
    updateEmployeeLeave: vi.fn(),
    hasLeaveOverlap: vi.fn(),
    listEmployeeInvoices: vi.fn(),
    createInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    createInvoiceFile: vi.fn(),
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
  createEmployee: mocks.createEmployee,
  deactivateEmployee: mocks.deactivateEmployee,
}));

vi.mock('../lib/pocketbase/employee-jobs', () => ({
  listEmployeeJobs: mocks.listEmployeeJobs,
}));

vi.mock('../lib/pocketbase/users', () => ({
  createEmployeeUser: mocks.createEmployeeUser,
  sendUserOnboardingEmails: mocks.sendUserOnboardingEmails,
  resendUserOnboarding: mocks.resendUserOnboarding,
}));

vi.mock('../lib/pocketbase/leaves', () => ({
  listEmployeeLeaves: mocks.listEmployeeLeaves,
  createEmployeeLeave: mocks.createEmployeeLeave,
  updateEmployeeLeave: mocks.updateEmployeeLeave,
  hasLeaveOverlap: mocks.hasLeaveOverlap,
}));

vi.mock('../lib/pocketbase/invoices', () => ({
  listEmployeeInvoices: mocks.listEmployeeInvoices,
  createInvoice: mocks.createInvoice,
  updateInvoice: mocks.updateInvoice,
}));

vi.mock('../lib/pocketbase/invoice-files', () => ({
  createInvoiceFile: mocks.createInvoiceFile,
}));

const employee = {
  id: 'e1',
  name: 'Ana',
  jobId: 'j1',
  jobName: 'Docente',
  jobSalary: 1000,
  email: 'ana@test.com',
  phone: '3000000',
  address: 'Calle 1',
  emergency_contact: 'Luis',
  active: true,
  userId: 'u1',
};

const emptyLeavesPage = {
  items: [],
  page: 1,
  perPage: 10,
  totalItems: 0,
  totalPages: 1,
};

const emptyInvoicesPage = {
  items: [],
  page: 1,
  perPage: 10,
  totalItems: 0,
  totalPages: 1,
};

describe('StaffEmployeesPage features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listActiveEmployees.mockResolvedValue([employee]);
    mocks.listEmployeeJobs.mockResolvedValue([
      {
        id: 'j1',
        name: 'Docente',
        salary: 1500,
      },
    ]);
    mocks.listEmployeeLeaves.mockResolvedValue(emptyLeavesPage);
    mocks.listEmployeeInvoices.mockResolvedValue(emptyInvoicesPage);
    mocks.createEmployeeUser.mockResolvedValue({
      id: 'u2',
      email: 'new@test.com',
      name: 'New Employee',
      isAdmin: false,
      verified: false,
    });
    mocks.createEmployee.mockResolvedValue({
      id: 'e2',
      name: 'New Employee',
      jobId: 'j1',
      jobName: 'Docente',
      jobSalary: 1500,
      email: 'new@test.com',
      phone: '3001234',
      address: 'Calle 9',
      emergency_contact: 'Maria',
      active: true,
      userId: 'u2',
    });
    mocks.sendUserOnboardingEmails.mockResolvedValue(undefined);
    mocks.resendUserOnboarding.mockResolvedValue(undefined);
    mocks.hasLeaveOverlap.mockResolvedValue(false);
    mocks.createEmployeeLeave.mockResolvedValue({
      id: 'leave-1',
      employeeId: 'e1',
      start_datetime: '2026-02-20T10:00:00.000Z',
      end_datetime: '2026-02-20T12:00:00.000Z',
    });
    mocks.updateEmployeeLeave.mockResolvedValue({
      id: 'leave-1',
      employeeId: 'e1',
      start_datetime: '2026-02-20T10:00:00.000Z',
      end_datetime: '2026-02-20T12:00:00.000Z',
    });
    mocks.createInvoiceFile.mockResolvedValue({
      id: 'file-1',
      fileName: 'invoice.pdf',
    });
    mocks.createInvoice.mockResolvedValue({
      id: 'inv-1',
      employeeId: 'e1',
      fileId: 'file-1',
      name: 'invoice_20260223_1000.pdf',
      created: '2026-02-23T10:00:00.000Z',
      updated: '2026-02-23T10:00:00.000Z',
    });
    mocks.updateInvoice.mockResolvedValue({
      id: 'inv-1',
      employeeId: 'e1',
      fileId: 'file-2',
      name: 'invoice_new_20260223_1100.pdf',
      created: '2026-02-23T10:00:00.000Z',
      updated: '2026-02-23T11:00:00.000Z',
    });
  });

  const openLeavesModal = async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    fireEvent.click(screen.getByLabelText('Gestionar licencias de Ana'));
    await screen.findByText('Licencias de Ana');
  };

  const openInvoiceModal = async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    fireEvent.click(screen.getByLabelText('Subir factura de Ana'));
    await screen.findByText('Facturas de Ana');
  };

  it('shows leaves action for admins', async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    expect(screen.getByLabelText('Gestionar licencias de Ana')).toBeInTheDocument();
    expect(screen.getByLabelText('Subir factura de Ana')).toBeInTheDocument();
  });

  it('hides admin actions for non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');
    expect(screen.queryByLabelText('Gestionar licencias de Ana')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Subir factura de Ana')).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevo empleado')).not.toBeInTheDocument();
  });

  it('creates employee, linked user, and sends onboarding invite', async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo empleado'));
    await screen.findByRole('heading', { name: 'Crear empleado' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'New Employee' } });
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'j1' } });
    fireEvent.input(screen.getByLabelText('Correo'), { target: { value: 'new@test.com' } });
    fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: '3001234' } });
    fireEvent.input(screen.getByLabelText('Dirección'), { target: { value: 'Calle 9' } });
    fireEvent.input(screen.getByLabelText('Contacto de emergencia'), { target: { value: 'Maria' } });

    fireEvent.click(screen.getAllByText('Crear empleado')[1]);

    await waitFor(() => {
      expect(mocks.createEmployeeUser).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createEmployeeUser).toHaveBeenCalledWith({
      email: 'new@test.com',
      name: 'New Employee',
    });
    expect(mocks.createEmployee).toHaveBeenCalledWith({
      name: 'New Employee',
      jobId: 'j1',
      email: 'new@test.com',
      phone: '3001234',
      address: 'Calle 9',
      emergency_contact: 'Maria',
      userId: 'u2',
    });
    await waitFor(() => {
      expect(mocks.sendUserOnboardingEmails).toHaveBeenCalledWith('new@test.com');
    });
  });

  it('keeps employee creation when invite fails and allows resend', async () => {
    mocks.sendUserOnboardingEmails.mockRejectedValue(new Error('smtp down'));
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo empleado'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'New Employee' } });
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'j1' } });
    fireEvent.input(screen.getByLabelText('Correo'), { target: { value: 'new@test.com' } });
    fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: '3001234' } });
    fireEvent.input(screen.getByLabelText('Dirección'), { target: { value: 'Calle 9' } });
    fireEvent.input(screen.getByLabelText('Contacto de emergencia'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getAllByText('Crear empleado')[1]);

    expect(await screen.findByText(/Empleado creado, pero no se pudo enviar la invitación inicial/)).toBeInTheDocument();
    expect(mocks.createEmployee).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Reenviar invitación a Ana'));
    await waitFor(() => {
      expect(mocks.resendUserOnboarding).toHaveBeenCalledWith('ana@test.com');
    });
  });

  it('blocks create employee submit when phone format is invalid', async () => {
    render(() => <StaffEmployeesPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo empleado'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'New Employee' } });
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'j1' } });
    fireEvent.input(screen.getByLabelText('Correo'), { target: { value: 'new@test.com' } });
    fireEvent.input(screen.getByLabelText('Teléfono'), { target: { value: 'abc' } });
    fireEvent.input(screen.getByLabelText('Dirección'), { target: { value: 'Calle 9' } });
    fireEvent.input(screen.getByLabelText('Contacto de emergencia'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getAllByText('Crear empleado')[1]);

    expect(
      await screen.findByText('El teléfono debe tener entre 7 y 20 caracteres válidos.'),
    ).toBeInTheDocument();
    expect(mocks.createEmployeeUser).not.toHaveBeenCalled();
    expect(mocks.createEmployee).not.toHaveBeenCalled();
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
      employeeId: 'e1',
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
          employeeId: 'e1',
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
          employeeId: 'e1',
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
      employeeId: 'e1',
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

  it('opens invoices modal with upload and history table', async () => {
    await openInvoiceModal();

    expect(screen.getByText('Archivo de factura (PDF)')).toBeInTheDocument();
    expect(screen.getByText('Este empleado no tiene facturas registradas.')).toBeInTheDocument();
  });

  it('blocks invoice submit when file is missing', async () => {
    await openInvoiceModal();
    fireEvent.click(screen.getByText('Subir factura'));

    expect(await screen.findByText('Debes seleccionar un archivo PDF.')).toBeInTheDocument();
    expect(mocks.createInvoiceFile).not.toHaveBeenCalled();
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('blocks invoice submit when file is not pdf', async () => {
    await openInvoiceModal();

    const input = screen.getByLabelText('Archivo de factura (PDF)') as HTMLInputElement;
    const file = new File(['text'], 'invoice.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText('Subir factura'));

    expect(await screen.findByText('Solo se permiten archivos PDF.')).toBeInTheDocument();
    expect(mocks.createInvoiceFile).not.toHaveBeenCalled();
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('uploads invoice file and creates invoice record', async () => {
    await openInvoiceModal();

    const input = screen.getByLabelText('Archivo de factura (PDF)') as HTMLInputElement;
    const file = new File(['pdf-content'], 'invoice.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText('Subir factura'));

    await waitFor(() => {
      expect(mocks.createInvoiceFile).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createInvoiceFile).toHaveBeenCalledWith({ file });
    expect(mocks.createInvoice).toHaveBeenCalledWith({
      employeeId: 'e1',
      fileId: 'file-1',
      originalFileName: 'invoice.pdf',
    });
  });

  it('shows invoice file name in history table', async () => {
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv-1',
          employeeId: 'e1',
          fileId: 'file-1',
          name: 'factura_demo_20260223_1000.pdf',
          created: '2026-02-23T10:00:00.000Z',
          updated: '2026-02-23T10:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    await openInvoiceModal();

    expect(screen.getByText('Nombre de archivo')).toBeInTheDocument();
    expect(screen.getByText('Acción')).toBeInTheDocument();
    expect(screen.getByText('factura_demo_20260223_1000.pdf')).toBeInTheDocument();
    expect(screen.queryByText('file-1')).not.toBeInTheDocument();
  });

  it('replaces invoice file when edit action is selected', async () => {
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv-1',
          employeeId: 'e1',
          fileId: 'file-1',
          name: 'factura_demo_20260223_1000.pdf',
          created: '2026-02-23T10:00:00.000Z',
          updated: '2026-02-23T10:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    await openInvoiceModal();
    fireEvent.click(screen.getByLabelText('Reemplazar archivo factura_demo_20260223_1000.pdf'));

    const input = screen.getByLabelText('Archivo de factura (PDF)') as HTMLInputElement;
    const file = new File(['pdf-content'], 'factura nueva.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText('Reemplazar factura'));

    await waitFor(() => {
      expect(mocks.createInvoiceFile).toHaveBeenCalledTimes(1);
    });
    expect(mocks.updateInvoice).toHaveBeenCalledWith('inv-1', {
      fileId: 'file-1',
      originalFileName: 'factura nueva.pdf',
    });
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });

  it('supports invoices pagination next and previous', async () => {
    mocks.listEmployeeInvoices.mockImplementation(async (_employeeId: string, page: number) => {
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

    await openInvoiceModal();
    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(mocks.listEmployeeInvoices).toHaveBeenCalledWith('e1', 2, 10);
    });

    fireEvent.click(screen.getByText('Anterior'));
    await waitFor(() => {
      expect(mocks.listEmployeeInvoices).toHaveBeenCalledWith('e1', 1, 10);
    });
  });
});
