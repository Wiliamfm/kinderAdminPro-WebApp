import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FatherPortalPage from './father-portal';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  listFatherStudents: vi.fn(),
  listFatherBulletin: vi.fn(),
  listPublicGrades: vi.fn(),
  checkFatherStudentDocumentIdAvailable: vi.fn(),
  submitFatherStudentRegistration: vi.fn(),
  exportFatherStudentReport: vi.fn(),
  downloadBase64File: vi.fn(),
}));

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
});
