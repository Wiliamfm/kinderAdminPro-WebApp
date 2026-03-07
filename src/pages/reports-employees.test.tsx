import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsEmployeesPage from './reports-employees';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listEmployeeReportsPage: vi.fn(),
  listEmployeeReportFormOptions: vi.fn(),
  listEmployeeReportsAnalyticsRecords: vi.fn(),
  createEmployeeReport: vi.fn(),
  updateEmployeeReport: vi.fn(),
  softDeleteEmployeeReport: vi.fn(),
  chartCtor: vi.fn(),
  chartDestroy: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/employee-reports', () => ({
  listEmployeeReportsPage: mocks.listEmployeeReportsPage,
  listEmployeeReportFormOptions: mocks.listEmployeeReportFormOptions,
  listEmployeeReportsAnalyticsRecords: mocks.listEmployeeReportsAnalyticsRecords,
  createEmployeeReport: mocks.createEmployeeReport,
  updateEmployeeReport: mocks.updateEmployeeReport,
  softDeleteEmployeeReport: mocks.softDeleteEmployeeReport,
}));

vi.mock('chart.js/auto', () => {
  const ChartMock = vi.fn(function ChartMock(ctx: unknown, config: unknown) {
    mocks.chartCtor(ctx, config);
    return { destroy: mocks.chartDestroy };
  });

  return { default: ChartMock };
});

const rowsFixture = [
  {
    id: 'er1',
    employee_id: 'e1',
    employee_name: 'Ana Pérez',
    employee_document_id: '9001',
    job_id: 'j1',
    job_name: 'Docente',
    semester_id: 'sem1',
    semester_name: '2026-1',
    comments: 'Excelente rendimiento',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-02T00:00:00.000Z',
    created_by: 'u1',
    created_by_name: 'Admin Uno',
    updated_by: 'u1',
    updated_by_name: 'Admin Uno',
    is_deleted: false,
  },
];

const pageFixture = {
  items: rowsFixture,
  page: 1,
  perPage: 10,
  totalItems: 1,
  totalPages: 1,
};

const formOptionsFixture = {
  employees: [
    { id: 'e1', label: '9001 (Ana Pérez)', documentId: '9001' },
    { id: 'e2', label: '9002 (Luis Díaz)', documentId: '9002' },
  ],
  jobs: [{ id: 'j1', label: 'Docente' }],
  semesters: [{ id: 'sem1', label: '2026-1' }],
};

const analyticsFixture = [
  { employee_id: 'e1', job_id: 'j1', semester_id: 'sem1' },
  { employee_id: 'e1', job_id: 'j1', semester_id: 'sem1' },
];

function findChartConfigByLabel(label: string) {
  return mocks.chartCtor.mock.calls
    .map((call) => call[1] as { data?: { datasets?: Array<{ label?: string }> } })
    .find((config) => config.data?.datasets?.[0]?.label === label);
}

describe('ReportsEmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listEmployeeReportsPage.mockResolvedValue(pageFixture);
    mocks.listEmployeeReportFormOptions.mockResolvedValue(formOptionsFixture);
    mocks.listEmployeeReportsAnalyticsRecords.mockResolvedValue(analyticsFixture);
    mocks.createEmployeeReport.mockResolvedValue(rowsFixture[0]);
    mocks.updateEmployeeReport.mockResolvedValue(rowsFixture[0]);
    mocks.softDeleteEmployeeReport.mockResolvedValue(undefined);
  });

  it('redirects non-admin users to reports index', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <ReportsEmployeesPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/reports', { replace: true });
    });
  });

  it('renders normalized row values', async () => {
    render(() => <ReportsEmployeesPage />);

    expect(await screen.findByRole('cell', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '9001' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Docente' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '2026-1' })).toBeInTheDocument();
    expect(screen.getByText('Excelente rendimiento')).toBeInTheDocument();
  });

  it('requests initial list with created date descending defaults', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    expect(mocks.listEmployeeReportsPage).toHaveBeenCalledWith(1, 10, {
      sortField: 'created_at',
      sortDirection: 'desc',
      jobId: '',
      semesterId: '',
      employeeIds: [],
    });
  });

  it('builds initial charts using all jobs and last 5 semesters with distinct employee counts', async () => {
    mocks.listEmployeeReportFormOptions.mockResolvedValue({
      employees: [{ id: 'e1', label: '9001 (Ana Pérez)', documentId: '9001' }],
      jobs: [
        { id: 'j1', label: 'Cargo 1' },
        { id: 'j2', label: 'Cargo 2' },
        { id: 'j3', label: 'Cargo 3' },
      ],
      semesters: [
        { id: 'sem1', label: '2026-1' },
        { id: 'sem2', label: '2026-2' },
        { id: 'sem3', label: '2026-3' },
        { id: 'sem4', label: '2026-4' },
        { id: 'sem5', label: '2026-5' },
        { id: 'sem6', label: '2026-6' },
      ],
    });
    mocks.listEmployeeReportsAnalyticsRecords.mockResolvedValue([
      { employee_id: 'eA', job_id: 'j2', semester_id: 'sem3' },
      { employee_id: 'eA', job_id: 'j2', semester_id: 'sem3' },
      { employee_id: 'eB', job_id: 'j2', semester_id: 'sem3' },
      { employee_id: 'eC', job_id: 'j3', semester_id: 'sem6' },
      { employee_id: 'eD', job_id: 'j1', semester_id: 'sem1' },
    ]);

    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    await waitFor(() => {
      const byJob = findChartConfigByLabel('Empleados (todos los cargos)') as {
        data: { labels: string[]; datasets: Array<{ data: number[] }> };
      };
      expect(byJob).toBeDefined();
      expect(byJob.data.labels).toEqual(['Cargo 1', 'Cargo 2', 'Cargo 3']);
      expect(byJob.data.datasets[0]?.data).toEqual([1, 2, 1]);
    });

    await waitFor(() => {
      const bySemester = findChartConfigByLabel('Empleados (últimos 5 semestres)') as {
        data: { labels: string[]; datasets: Array<{ data: number[] }> };
      };
      expect(bySemester).toBeDefined();
      expect(bySemester.data.labels).toEqual(['2026-2', '2026-3', '2026-4', '2026-5', '2026-6']);
      expect(bySemester.data.datasets[0]?.data).toEqual([0, 2, 0, 0, 1]);
    });
  });

  it('updates charts when cross-filters change', async () => {
    mocks.listEmployeeReportFormOptions.mockResolvedValue({
      employees: [{ id: 'e1', label: '9001 (Ana Pérez)', documentId: '9001' }],
      jobs: [
        { id: 'j1', label: 'Cargo 1' },
        { id: 'j2', label: 'Cargo 2' },
        { id: 'j3', label: 'Cargo 3' },
      ],
      semesters: [
        { id: 'sem1', label: '2026-1' },
        { id: 'sem2', label: '2026-2' },
        { id: 'sem3', label: '2026-3' },
        { id: 'sem4', label: '2026-4' },
        { id: 'sem5', label: '2026-5' },
        { id: 'sem6', label: '2026-6' },
      ],
    });
    mocks.listEmployeeReportsAnalyticsRecords.mockResolvedValue([
      { employee_id: 'eA', job_id: 'j2', semester_id: 'sem3' },
      { employee_id: 'eA', job_id: 'j2', semester_id: 'sem3' },
      { employee_id: 'eB', job_id: 'j2', semester_id: 'sem3' },
      { employee_id: 'eD', job_id: 'j1', semester_id: 'sem6' },
      { employee_id: 'eC', job_id: 'j3', semester_id: 'sem6' },
      { employee_id: 'eZ', job_id: 'j1', semester_id: 'sem1' },
    ]);

    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.change(screen.getByLabelText('Semestre (para gráfico por cargo)'), {
      target: { value: 'sem6' },
    });

    await waitFor(() => {
      const byJobForSemester = findChartConfigByLabel('Empleados (2026-6)') as {
        data: { labels: string[]; datasets: Array<{ data: number[] }> };
      };
      expect(byJobForSemester).toBeDefined();
      expect(byJobForSemester.data.labels).toEqual(['Cargo 1', 'Cargo 2', 'Cargo 3']);
      expect(byJobForSemester.data.datasets[0]?.data).toEqual([1, 0, 1]);
    });

    fireEvent.change(screen.getByLabelText('Cargo (para gráfico por semestre)'), {
      target: { value: 'j2' },
    });

    await waitFor(() => {
      const bySemesterForJob = findChartConfigByLabel('Empleados (Cargo 2)') as {
        data: { labels: string[]; datasets: Array<{ data: number[] }> };
      };
      expect(bySemesterForJob).toBeDefined();
      expect(bySemesterForJob.data.labels).toEqual([
        '2026-1',
        '2026-2',
        '2026-3',
        '2026-4',
        '2026-5',
        '2026-6',
      ]);
      expect(bySemesterForJob.data.datasets[0]?.data).toEqual([0, 0, 2, 0, 0, 0]);
    });
  });

  it('shows empty chart state when there are no analytics rows', async () => {
    mocks.listEmployeeReportsAnalyticsRecords.mockResolvedValue([]);
    render(() => <ReportsEmployeesPage />);

    expect(await screen.findByText('No hay datos suficientes para generar las gráficas.')).toBeInTheDocument();
  });

  it('submits create modal payload', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByText('Nuevo reporte'));

    await waitFor(() => {
      expect(mocks.listEmployeeReportFormOptions).toHaveBeenCalled();
    });

    const createModalHeading = await screen.findByRole('heading', { name: 'Crear reporte de empleado' });
    const createModal = createModalHeading.closest('div');
    expect(createModal).not.toBeNull();
    const createModalQueries = within(createModal as HTMLElement);

    fireEvent.change(createModalQueries.getByLabelText('Empleado'), { target: { value: 'e1' } });
    fireEvent.change(createModalQueries.getByLabelText('Cargo'), { target: { value: 'j1' } });
    fireEvent.change(createModalQueries.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.input(createModalQueries.getByLabelText('Comentarios'), { target: { value: 'Muy bien.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear reporte' }));

    await waitFor(() => {
      expect(mocks.createEmployeeReport).toHaveBeenCalledWith({
        employee_id: 'e1',
        job_id: 'j1',
        semester_id: 'sem1',
        comments: 'Muy bien.',
      });
    });
  });

  it('submits edit modal payload', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByRole('button', { name: 'Editar reporte er1' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportFormOptions).toHaveBeenCalled();
    });

    fireEvent.input(screen.getByLabelText('Comentarios'), { target: { value: 'Actualizado' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateEmployeeReport).toHaveBeenCalledWith('er1', {
        employee_id: 'e1',
        job_id: 'j1',
        semester_id: 'sem1',
        comments: 'Actualizado',
      });
    });
  });

  it('soft deletes selected row', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar reporte er1' }));
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.softDeleteEmployeeReport).toHaveBeenCalledWith('er1');
    });
  });

  it('requests sorting when clicking a sortable header', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByRole('button', { name: 'Creado por' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'created_by_name',
        sortDirection: 'asc',
        jobId: '',
        semesterId: '',
        employeeIds: [],
      });
    });
  });

  it('requests next page via pagination controls', async () => {
    mocks.listEmployeeReportsPage.mockImplementation(async (page: number) => {
      if (page === 1) {
        return {
          items: [rowsFixture[0]],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }

      return {
        items: [{ ...rowsFixture[0], id: 'er2', employee_name: 'Luis Díaz' }],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        jobId: '',
        semesterId: '',
        employeeIds: [],
      });
    });
  });

  it('applies job and semester filters', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'j1' } });
    fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        jobId: 'j1',
        semesterId: 'sem1',
        employeeIds: [],
      });
    });
  });

  it('filters exactly by selected specific employees', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    const specificEmployeeInput = screen.getByLabelText('Seleccionar empleados específicos');
    fireEvent.input(specificEmployeeInput, { target: { value: '9001 (Ana Pérez)' } });
    fireEvent.input(specificEmployeeInput, { target: { value: '9002 (Luis Díaz)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        jobId: '',
        semesterId: '',
        employeeIds: ['e1', 'e2'],
      });
    });
  });

  it('clears filters and restores created date descending sort', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'j1' } });
    fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        jobId: 'j1',
        semesterId: 'sem1',
        employeeIds: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Creado por' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_by_name',
        sortDirection: 'asc',
        jobId: 'j1',
        semesterId: 'sem1',
        employeeIds: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    await waitFor(() => {
      expect(mocks.listEmployeeReportsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        jobId: '',
        semesterId: '',
        employeeIds: [],
      });
    });
  });

  it('blocks create submission for required relation fields', async () => {
    render(() => <ReportsEmployeesPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByText('Nuevo reporte'));
    await waitFor(() => {
      expect(mocks.listEmployeeReportFormOptions).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear reporte' }));

    expect(await screen.findByText('Empleado es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Cargo es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Semestre es obligatorio.')).toBeInTheDocument();
    expect(mocks.createEmployeeReport).not.toHaveBeenCalled();
  });
});
