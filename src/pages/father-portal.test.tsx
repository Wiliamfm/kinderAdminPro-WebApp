import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FatherPortalPage from './father-portal';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  listFatherStudents: vi.fn(),
  listFatherBulletin: vi.fn(),
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
  listFatherStudents: mocks.listFatherStudents,
  listFatherBulletin: mocks.listFatherBulletin,
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
});
