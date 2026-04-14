import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FatherPortalPage from './father-portal';

const mocks = vi.hoisted(() => {
  const fatherGetList = vi.fn();

  return {
    navigate: vi.fn(),
    canAccessModule: vi.fn(),
    listFatherStudents: vi.fn(),
    listFatherBulletin: vi.fn(),
    getAuthenticatedPbWithUserId: vi.fn(),
    fatherGetList,
    pb: {
      collection: vi.fn(() => ({
        getList: fatherGetList,
      })),
    },
    listActiveEmployees: vi.fn(),
    resolveEmployeeRecipients: vi.fn(),
    sendEventEmail: vi.fn(),
    listPublicGrades: vi.fn(),
    checkFatherStudentDocumentIdAvailable: vi.fn(),
    submitFatherStudentRegistration: vi.fn(),
    exportFatherStudentReport: vi.fn(),
    downloadBase64File: vi.fn(),
  };
});

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
}));

vi.mock('../lib/pocketbase/father-portal', () => ({
  checkFatherStudentDocumentIdAvailable: mocks.checkFatherStudentDocumentIdAvailable,
  listFatherStudents: mocks.listFatherStudents,
  listFatherBulletin: mocks.listFatherBulletin,
  submitFatherStudentRegistration: mocks.submitFatherStudentRegistration,
}));

vi.mock('../lib/server/get-authenticated-pb', () => ({
  getAuthenticatedPbWithUserId: mocks.getAuthenticatedPbWithUserId,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  listActiveEmployees: mocks.listActiveEmployees,
}));

vi.mock('../lib/pocketbase/event-email-messaging', () => ({
  resolveEmployeeRecipients: mocks.resolveEmployeeRecipients,
  sendEventEmail: mocks.sendEventEmail,
}));

vi.mock('../lib/pocketbase/public-grades', () => ({
  listPublicGrades: mocks.listPublicGrades,
}));

vi.mock('../lib/server/exports/father-student-report', () => ({
  exportFatherStudentReport: mocks.exportFatherStudentReport,
}));

vi.mock('../lib/reports/download', () => ({
  downloadBase64File: mocks.downloadBase64File,
}));

const studentsFixture = [
  {
    id: 's1',
    name: 'Ana Pérez',
    documentId: '1001',
    gradeId: 'g1',
    gradeName: 'Primero A',
    status: 'Activo',
    active: true,
    accepted: true,
    rejectedAt: '',
  },
  {
    id: 's2',
    name: 'Luis Díaz',
    documentId: '1002',
    gradeId: 'g2',
    gradeName: 'Segundo A',
    status: 'Pendiente',
    active: true,
    accepted: false,
    rejectedAt: '',
  },
];

const bulletinsFixture = [
  {
    id: 'b1',
    bulletin_category_name: 'Académico',
    bulletin_description: 'Matemáticas',
    semester_name: '2026-1',
    grade_name: 'Primero A',
    note: 95,
    comments: 'Excelente',
  },
  {
    id: 'b2',
    bulletin_category_name: 'Convivencia',
    bulletin_description: 'Respeto',
    semester_name: '2026-1',
    grade_name: 'Primero A',
    note: 90,
    comments: 'Muy bien',
  },
];

describe('FatherPortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessModule.mockReturnValue(true);
    mocks.listFatherStudents.mockResolvedValue(studentsFixture);
    mocks.listFatherBulletin.mockResolvedValue(bulletinsFixture);
    mocks.getAuthenticatedPbWithUserId.mockResolvedValue({
      pb: mocks.pb,
      userId: 'user-father-1',
    });
    mocks.fatherGetList.mockResolvedValue({
      items: [{ full_name: 'Laura Tutor', email: 'laura@example.com' }],
    });
    mocks.listActiveEmployees.mockResolvedValue([
      {
        id: 'emp1',
        name: 'Ana Gómez',
        documentId: '1001',
        email: 'ana@example.com',
      },
      {
        id: 'emp2',
        name: 'Carlos Ruiz',
        documentId: '1002',
        email: 'carlos@example.com',
      },
    ]);
    mocks.resolveEmployeeRecipients.mockImplementation(async (employeeIds: string[]) => (
      employeeIds
        .filter((employeeId) => employeeId === 'emp1' || employeeId === 'emp2')
        .map((employeeId) => ({
          key: `employee:${employeeId}`,
          recipientType: 'employee',
          recipientId: employeeId,
          recipientName: employeeId === 'emp1' ? 'Ana Gómez' : 'Carlos Ruiz',
          recipientEmail: employeeId === 'emp1' ? 'ana@example.com' : 'carlos@example.com',
          hasEmail: true,
          sources: [{
            kind: 'employee',
            id: employeeId,
            label: employeeId === 'emp1' ? 'Ana Gómez' : 'Carlos Ruiz',
          }],
        }))
    ));
    mocks.sendEventEmail.mockResolvedValue({
      messageId: 'msg-1',
      totalResolved: 1,
      totalSendable: 1,
      totalMissingEmail: 0,
      totalSent: 1,
      totalFailed: 0,
      totalSkipped: 0,
      recipients: [],
    });
    mocks.listPublicGrades.mockResolvedValue([
      { id: 'g1', name: 'Primero A' },
      { id: 'g2', name: 'Segundo A' },
    ]);
    mocks.checkFatherStudentDocumentIdAvailable.mockResolvedValue(true);
    mocks.submitFatherStudentRegistration.mockResolvedValue(undefined);
    mocks.exportFatherStudentReport.mockResolvedValue({
      fileName: 'boletines_ana_perez_20260410_1200.pdf',
      data: 'ZmFrZQ==',
      mimeType: 'application/pdf',
    });
  });

  it('redirects unauthorized users to home', async () => {
    mocks.canAccessModule.mockReturnValue(false);

    render(() => <FatherPortalPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('renders multiple linked students with their statuses', async () => {
    render(() => <FatherPortalPage />);

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Luis Díaz')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('loads bulletins on expand and shows grouped bulletin details', async () => {
    render(() => <FatherPortalPage />);

    const viewButtons = await screen.findAllByRole('button', { name: 'Ver boletines' });
    fireEvent.click(viewButtons[0]!);

    await waitFor(() => {
      expect(mocks.listFatherBulletin).toHaveBeenCalledWith('s1');
    });

    expect(await screen.findByText('Trimestre: 2026-1')).toBeInTheDocument();
    expect(screen.getAllByText('Académico').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Matemáticas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Excelente').length).toBeGreaterThan(0);
  });

  it('exports the selected student PDF', async () => {
    render(() => <FatherPortalPage />);

    const exportButtons = await screen.findAllByRole('button', { name: 'Exportar PDF' });
    fireEvent.click(exportButtons[0]!);

    await waitFor(() => {
      expect(mocks.exportFatherStudentReport).toHaveBeenCalledWith('s1');
    });
    expect(mocks.downloadBase64File).toHaveBeenCalledWith(
      'boletines_ana_perez_20260410_1200.pdf',
      'ZmFrZQ==',
      'application/pdf',
    );
  });

  it('registers a new student from the modal and refreshes the list', async () => {
    mocks.listFatherStudents
      .mockResolvedValueOnce(studentsFixture)
      .mockResolvedValueOnce([
        ...studentsFixture,
        {
          id: 's3',
          name: 'Carlos Ruiz',
          documentId: '3003',
          gradeId: 'g1',
          gradeName: 'Primero A',
          status: 'Pendiente',
          active: true,
          accepted: false,
          rejectedAt: '',
        },
      ]);

    render(() => <FatherPortalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar nuevo estudiante' }));

    fireEvent.input(await screen.findByLabelText('Nombre'), { target: { value: 'Carlos Ruiz' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2016-01-10T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogotá' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '3003' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'O+' } });
    fireEvent.blur(screen.getByLabelText('Documento'));

    await waitFor(() => {
      expect(mocks.checkFatherStudentDocumentIdAvailable).toHaveBeenCalledWith('3003');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar estudiante' }));

    await waitFor(() => {
      expect(mocks.submitFatherStudentRegistration).toHaveBeenCalledWith(expect.objectContaining({
        relationship: 'father',
        student: expect.objectContaining({
          name: 'Carlos Ruiz',
          grade_id: 'g1',
          document_id: '3003',
          birth_place: 'Bogotá',
          department: 'Cundinamarca',
          blood_type: 'O+',
        }),
      }));
    });

    expect(await screen.findByText('Tu solicitud está pendiente de aprobación')).toBeInTheDocument();
    expect(await screen.findByText('Carlos Ruiz')).toBeInTheDocument();
  });

  it('shows duplicate document validation on blur', async () => {
    mocks.checkFatherStudentDocumentIdAvailable.mockResolvedValue(false);

    render(() => <FatherPortalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar nuevo estudiante' }));

    const documentInput = await screen.findByLabelText('Documento');
    fireEvent.input(documentInput, { target: { value: '1001' } });
    fireEvent.blur(documentInput);

    await waitFor(() => {
      expect(mocks.checkFatherStudentDocumentIdAvailable).toHaveBeenCalledWith('1001');
    });

    expect(await screen.findByText('Ya existe un estudiante con este documento')).toBeInTheDocument();
    expect(mocks.submitFatherStudentRegistration).not.toHaveBeenCalled();
  });

  it('opens the contact modal and loads father data plus employees', async () => {
    render(() => <FatherPortalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Contactar' }));

    expect(await screen.findByRole('heading', { name: 'Contactar administradores y profesores' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.getAuthenticatedPbWithUserId).toHaveBeenCalled();
      expect(mocks.listActiveEmployees).toHaveBeenCalled();
    });

    expect(await screen.findByText('laura@example.com - Laura Tutor:')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ana Gómez - ana@example.com' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carlos Ruiz - carlos@example.com' })).toBeInTheDocument();
  });

  it('keeps contact send disabled until recipients, subject, and body are provided', async () => {
    render(() => <FatherPortalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Contactar' }));

    const sendButton = await screen.findByRole('button', { name: 'Enviar' });
    const employeesSelect = screen.getByLabelText('Empleados') as HTMLSelectElement;
    const subjectInput = screen.getByLabelText('Asunto');
    const bodyInput = screen.getByLabelText('Mensaje');

    expect(sendButton).toBeDisabled();

    employeesSelect.options[0]!.selected = true;
    fireEvent.change(employeesSelect);
    expect(sendButton).toBeDisabled();

    fireEvent.input(subjectInput, { target: { value: 'Necesito información' } });
    expect(sendButton).toBeDisabled();

    fireEvent.input(bodyInput, { target: { value: 'Quiero hablar con el área administrativa.' } });
    await waitFor(() => {
      expect(sendButton).toBeEnabled();
    });

    fireEvent.input(subjectInput, { target: { value: '' } });
    await waitFor(() => {
      expect(sendButton).toBeDisabled();
    });

    expect(mocks.sendEventEmail).not.toHaveBeenCalled();
  });

  it('sends the contact email with the father prefix and selected recipients', async () => {
    render(() => <FatherPortalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Contactar' }));

    const employeesSelect = await screen.findByLabelText('Empleados') as HTMLSelectElement;
    employeesSelect.options[0]!.selected = true;
    fireEvent.change(employeesSelect);
    fireEvent.input(screen.getByLabelText('Asunto'), { target: { value: 'Solicitud de reunión' } });
    fireEvent.input(screen.getByLabelText('Mensaje'), { target: { value: 'Necesito una reunión esta semana.' } });

    const sendButton = screen.getByRole('button', { name: 'Enviar' });
    await waitFor(() => {
      expect(sendButton).toBeEnabled();
    });

    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mocks.resolveEmployeeRecipients).toHaveBeenCalledWith(['emp1']);
      expect(mocks.sendEventEmail).toHaveBeenCalledWith({
        subject: 'laura@example.com - Laura Tutor: Solicitud de reunión',
        bodyText: 'Necesito una reunión esta semana.',
        recipients: [
          {
            key: 'employee:emp1',
            recipientType: 'employee',
            recipientId: 'emp1',
            recipientName: 'Ana Gómez',
            recipientEmail: 'ana@example.com',
            hasEmail: true,
            sources: [{ kind: 'employee', id: 'emp1', label: 'Ana Gómez' }],
          },
        ],
      });
    });

    expect(await screen.findByText('Mensaje enviado. Enviados: 1, fallidos: 0, sin correo: 0.')).toBeInTheDocument();
  });

  it('shows contact send errors without closing the modal', async () => {
    mocks.sendEventEmail.mockRejectedValue({
      message: 'No se pudo enviar el correo.',
      status: 500,
      isAbort: false,
    });

    render(() => <FatherPortalPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Contactar' }));

    const employeesSelect = await screen.findByLabelText('Empleados') as HTMLSelectElement;
    employeesSelect.options[0]!.selected = true;
    fireEvent.change(employeesSelect);
    fireEvent.input(screen.getByLabelText('Asunto'), { target: { value: 'Seguimiento' } });
    fireEvent.input(screen.getByLabelText('Mensaje'), { target: { value: 'Necesito un seguimiento del caso.' } });

    const sendButton = screen.getByRole('button', { name: 'Enviar' });
    await waitFor(() => {
      expect(sendButton).toBeEnabled();
    });

    fireEvent.click(sendButton);

    expect((await screen.findAllByText('No se pudo enviar el correo.')).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Contactar administradores y profesores' })).toBeInTheDocument();
  });
});
