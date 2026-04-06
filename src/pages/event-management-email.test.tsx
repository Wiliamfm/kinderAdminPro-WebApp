import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  listActiveEmployees: vi.fn(),
  listActiveStudents: vi.fn(),
  listGrades: vi.fn(),
  resolveEmployeeRecipients: vi.fn(),
  resolveFatherRecipients: vi.fn(),
  listEmailMessages: vi.fn(),
  listEmailMessageRecipients: vi.fn(),
  sendEventEmail: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  listActiveEmployees: mocks.listActiveEmployees,
}));

vi.mock('../lib/pocketbase/students', () => ({
  listActiveStudents: mocks.listActiveStudents,
}));

vi.mock('../lib/pocketbase/grades', () => ({
  listGrades: mocks.listGrades,
}));

vi.mock('../lib/pocketbase/event-email-messaging', () => ({
  resolveEmployeeRecipients: mocks.resolveEmployeeRecipients,
  resolveFatherRecipients: mocks.resolveFatherRecipients,
  listEmailMessages: mocks.listEmailMessages,
  listEmailMessageRecipients: mocks.listEmailMessageRecipients,
  sendEventEmail: mocks.sendEventEmail,
}));

let EventManagementEmailPage: (typeof import('./event-management-email'))['default'];
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

describe('EventManagementEmailPage', () => {
  beforeAll(async () => {
    ({ default: EventManagementEmailPage } = await import('./event-management-email'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.canAccessModule.mockReturnValue(true);
    mocks.listActiveEmployees.mockResolvedValue([
      {
        id: 'emp1',
        name: 'Ana Gomez',
        documentId: '1001',
        email: 'ana@example.com',
      },
    ]);
    mocks.listActiveStudents.mockResolvedValue([
      {
        id: 'stu1',
        name: 'Maria',
        grade_id: 'grade1',
        grade_name: 'Primero',
      },
    ]);
    mocks.listGrades.mockResolvedValue([
      { id: 'grade1', name: 'Primero' },
    ]);
    mocks.resolveEmployeeRecipients.mockImplementation(async (employeeIds: string[]) => (
      employeeIds.includes('emp1')
        ? [{
          key: 'employee:emp1',
          recipientType: 'employee',
          recipientId: 'emp1',
          recipientName: 'Ana Gomez',
          recipientEmail: 'ana@example.com',
          hasEmail: true,
          sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
        }]
        : []
    ));
    mocks.resolveFatherRecipients.mockImplementation(async ({ gradeIds }: { gradeIds: string[] }) => (
      gradeIds.includes('grade1')
        ? [
          {
            key: 'father:fat1',
            recipientType: 'father',
            recipientId: 'fat1',
            recipientName: 'Laura Tutor',
            recipientEmail: 'laura@example.com',
            hasEmail: true,
            sources: [{ kind: 'grade', id: 'grade1', label: 'Primero' }],
          },
          {
            key: 'father:fat2',
            recipientType: 'father',
            recipientId: 'fat2',
            recipientName: 'Carlos Tutor',
            recipientEmail: '',
            hasEmail: false,
            sources: [{ kind: 'grade', id: 'grade1', label: 'Primero' }],
          },
        ]
        : []
    ));
    mocks.listEmailMessages.mockResolvedValue([
      {
        id: 'msg-existing',
        subject: 'Correo previo',
        createdByName: 'Admin',
        createdAt: '2026-04-01T10:00:00.000Z',
        totalSent: 1,
        totalFailed: 0,
        totalMissingEmail: 0,
      },
    ]);
    mocks.listEmailMessageRecipients.mockResolvedValue([
      {
        id: 'history-1',
        recipientName: 'Ana Gomez',
        recipientEmail: 'ana@example.com',
        sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
        sourceKind: 'employee',
        status: 'sent',
        errorMessage: '',
      },
    ]);
    mocks.sendEventEmail.mockResolvedValue({
      messageId: 'msg-new',
      totalResolved: 3,
      totalSendable: 2,
      totalMissingEmail: 1,
      totalSent: 2,
      totalFailed: 0,
      totalSkipped: 0,
      recipients: [],
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('redirects non-admin users away from the workflow', async () => {
    mocks.canAccessModule.mockReturnValue(false);

    render(() => <EventManagementEmailPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/event-management', { replace: true });
    });
    expect(mocks.listActiveEmployees).not.toHaveBeenCalled();
  });

  it('loads filters, resolves recipients, previews the email, and sends selected recipients', async () => {
    render(() => <EventManagementEmailPage />);

    await screen.findByText('Mensajería administrativa');
    expect(await screen.findByText('Correo previo')).toBeInTheDocument();
    expect(mocks.listEmailMessageRecipients).toHaveBeenCalledWith('msg-existing');

    const employeesSelect = await screen.findByLabelText('Empleados');
    const gradesSelect = await screen.findByLabelText('Grados');

    (employeesSelect as HTMLSelectElement).options[0].selected = true;
    fireEvent.change(employeesSelect);
    (gradesSelect as HTMLSelectElement).options[0].selected = true;
    fireEvent.change(gradesSelect);

    await waitFor(() => {
      expect(mocks.resolveEmployeeRecipients).toHaveBeenCalledWith(['emp1']);
      expect(mocks.resolveFatherRecipients).toHaveBeenCalledWith({
        studentIds: [],
        gradeIds: ['grade1'],
      });
    });

    expect(await screen.findByText('Laura Tutor')).toBeInTheDocument();
    expect((await screen.findAllByText('Carlos Tutor')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar empleados (1)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar padres por grado (2)' }));

    fireEvent.input(screen.getByLabelText('Asunto'), { target: { value: 'Recordatorio general' } });
    fireEvent.input(screen.getByLabelText('Cuerpo'), { target: { value: 'Linea uno\n\nLinea dos' } });

    expect(screen.getByText('Recordatorio general')).toBeInTheDocument();
    expect(screen.getByText('Linea uno')).toBeInTheDocument();
    expect(screen.getByText('Linea dos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar correo' }));

    await waitFor(() => {
      expect(mocks.sendEventEmail).toHaveBeenCalledWith({
        subject: 'Recordatorio general',
        bodyText: 'Linea uno\n\nLinea dos',
        recipients: [
          {
            key: 'employee:emp1',
            recipientType: 'employee',
            recipientId: 'emp1',
            recipientName: 'Ana Gomez',
            recipientEmail: 'ana@example.com',
            hasEmail: true,
            sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
          },
          {
            key: 'father:fat1',
            recipientType: 'father',
            recipientId: 'fat1',
            recipientName: 'Laura Tutor',
            recipientEmail: 'laura@example.com',
            hasEmail: true,
            sources: [{ kind: 'grade', id: 'grade1', label: 'Primero' }],
          },
        ],
      });
    });

    expect(await screen.findByText(/Envío registrado/)).toBeInTheDocument();
    expect(mocks.listEmailMessages).toHaveBeenCalledTimes(2);
  });

  it('shows a setup notice instead of crashing when email history collections are missing', async () => {
    mocks.listEmailMessages.mockRejectedValue({
      message: "The requested resource wasn't found.",
      status: 404,
      isAbort: false,
    });

    render(() => <EventManagementEmailPage />);

    expect(await screen.findByText('Mensajería administrativa')).toBeInTheDocument();
    expect(await screen.findByText('La mensajería no está disponible en este momento.')).toBeInTheDocument();
    await screen.findByLabelText('Asunto');
    expect(screen.getByRole('button', { name: 'Enviar correo' })).toBeDisabled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('shows a generic error when the send route fails and logs the details', async () => {
    mocks.sendEventEmail.mockRejectedValue({
      message: 'La integración de correo no está configurada.',
      status: 500,
      isAbort: false,
    });

    render(() => <EventManagementEmailPage />);

    const employeesSelect = await screen.findByLabelText('Empleados');
    (employeesSelect as HTMLSelectElement).options[0].selected = true;
    fireEvent.change(employeesSelect);

    await waitFor(() => {
      expect(mocks.resolveEmployeeRecipients).toHaveBeenCalledWith(['emp1']);
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar empleados (1)' }));
    fireEvent.input(screen.getByLabelText('Asunto'), { target: { value: 'Recordatorio general' } });
    fireEvent.input(screen.getByLabelText('Cuerpo'), { target: { value: 'Linea uno' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar correo' }));

    expect(await screen.findByText('No se pudo enviar el correo en este momento. Intenta de nuevo.')).toBeInTheDocument();
    expect(screen.queryByText('La integración de correo no está configurada.')).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('hides provider-specific history errors behind a generic message', async () => {
    mocks.listEmailMessageRecipients.mockResolvedValue([
      {
        id: 'history-1',
        recipientName: 'Ana Gomez',
        recipientEmail: 'ana@example.com',
        sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gomez' }],
        sourceKind: 'employee',
        status: 'failed',
        errorMessage: 'You can only send testing emails to your own email address.',
      },
    ]);

    render(() => <EventManagementEmailPage />);

    expect(await screen.findByText('Correo previo')).toBeInTheDocument();
    expect(await screen.findByText('No se pudo entregar el correo.')).toBeInTheDocument();
    expect(screen.queryByText(/You can only send testing emails/i)).not.toBeInTheDocument();
  });
});
