import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmployeeReport,
  listEmployeeReportFormOptions,
  listEmployeeReportsAnalyticsRecords,
  listEmployeeReportsPage,
  softDeleteEmployeeReport,
  updateEmployeeReport,
} from './employee-reports';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const getFullList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getAuthUserId = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      getFullList,
      create,
      update,
    })),
  };

  return {
    getList,
    getFullList,
    create,
    update,
    normalizePocketBaseError,
    getAuthUserId,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

vi.mock('./users', () => ({
  getAuthUserId: hoisted.getAuthUserId,
}));

describe('employee-reports pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockReturnValue('u-admin');
    hoisted.pb.collection.mockImplementation(() => ({
      getList: hoisted.getList,
      getFullList: hoisted.getFullList,
      create: hoisted.create,
      update: hoisted.update,
    }));
  });

  it('lists employee reports page with expected sort/filter/expand', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'er1',
          employee_id: 'e1',
          job_id: 'j1',
          semester_id: 'sem1',
          comments: ' Excelente desempeño ',
          created_by: 'u1',
          updated_by: 'u2',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z',
          is_deleted: false,
          expand: {
            employee_id: { name: 'Ana Pérez' },
            job_id: { name: 'Docente' },
            semester_id: { name: '2026-1' },
            created_by: { name: 'Admin Uno' },
            updated_by: { email: 'admin2@example.com' },
          },
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listEmployeeReportsPage(2, 10, {
      sortField: 'employee_name',
      sortDirection: 'asc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(2, 10, {
      sort: 'employee_id.name',
      filter: 'is_deleted != true',
      expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      requestKey: 'reports-employees-table-list',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'er1',
      employee_name: 'Ana Pérez',
      job_name: 'Docente',
      semester_name: '2026-1',
      comments: 'Excelente desempeño',
      created_by_name: 'Admin Uno',
      updated_by_name: 'admin2@example.com',
      is_deleted: false,
    }));
  });

  it('uses created_at descending as default sort', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await listEmployeeReportsPage(1, 10);

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      filter: 'is_deleted != true',
      expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      requestKey: 'reports-employees-table-list',
    });
  });

  it('builds filter clauses for job, semester and employee query', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await listEmployeeReportsPage(1, 10, {
      jobId: ' j1 ',
      semesterId: ' sem1 ',
      employeeQuery: 'Ana "123" \\ x',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      filter: 'is_deleted != true && job_id = "j1" && semester_id = "sem1" && (employee_id.name ~ "Ana \\"123\\" \\\\ x" || employee_id.email ~ "Ana \\"123\\" \\\\ x")',
      expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      requestKey: 'reports-employees-table-list',
    });
  });

  it('builds exact employee filters when specific employee ids are provided', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await listEmployeeReportsPage(1, 10, {
      employeeIds: [' e1 ', 'e2', 'e1'],
      employeeQuery: 'Ana',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      filter: 'is_deleted != true && (employee_id = "e1" || employee_id = "e2")',
      expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      requestKey: 'reports-employees-table-list',
    });
  });

  it('creates employee report with audit defaults', async () => {
    hoisted.create.mockResolvedValue({
      id: 'er1',
      employee_id: 'e1',
      job_id: 'j1',
      semester_id: 'sem1',
      comments: 'Excelente',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
      is_deleted: false,
      expand: {
        employee_id: { name: 'Ana' },
        job_id: { name: 'Docente' },
        semester_id: { name: '2026-1' },
        created_by: { name: 'Admin' },
        updated_by: { name: 'Admin' },
      },
    });

    await createEmployeeReport({
      employee_id: ' e1 ',
      job_id: ' j1 ',
      semester_id: ' sem1 ',
      comments: ' Excelente ',
    });

    expect(hoisted.create).toHaveBeenCalledWith(
      {
        employee_id: 'e1',
        job_id: 'j1',
        semester_id: 'sem1',
        comments: 'Excelente',
        created_by: 'u-admin',
        updated_by: 'u-admin',
        is_deleted: false,
      },
      {
        expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      },
    );
  });

  it('updates employee report and refreshes updated_by', async () => {
    hoisted.update.mockResolvedValue({
      id: 'er1',
      employee_id: 'e1',
      job_id: 'j2',
      semester_id: 'sem2',
      comments: 'Actualizado',
      created_by: 'u1',
      updated_by: 'u-admin',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-02T00:00:00.000Z',
      is_deleted: false,
      expand: {
        employee_id: { name: 'Ana' },
        job_id: { name: 'Coordinador' },
        semester_id: { name: '2026-2' },
        created_by: { name: 'Admin Uno' },
        updated_by: { name: 'Admin Dos' },
      },
    });

    await updateEmployeeReport('er1', {
      employee_id: ' e1 ',
      job_id: ' j2 ',
      semester_id: ' sem2 ',
      comments: ' Actualizado ',
    });

    expect(hoisted.update).toHaveBeenCalledWith(
      'er1',
      {
        employee_id: 'e1',
        job_id: 'j2',
        semester_id: 'sem2',
        comments: 'Actualizado',
        updated_by: 'u-admin',
      },
      {
        expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      },
    );
  });

  it('soft deletes employee report and stores updated_by', async () => {
    await softDeleteEmployeeReport('er1');

    expect(hoisted.update).toHaveBeenCalledWith('er1', {
      is_deleted: true,
      updated_by: 'u-admin',
    });
  });

  it('lists create/edit form options with normalized labels', async () => {
    hoisted.pb.collection.mockImplementation((name: string) => {
      if (name === 'employees') {
        return {
          getFullList: vi.fn().mockResolvedValue([{ id: 'e1', name: 'Ana Pérez' }]),
        };
      }

      if (name === 'employee_jobs') {
        return {
          getFullList: vi.fn().mockResolvedValue([{ id: 'j1', name: 'Docente' }]),
        };
      }

      if (name === 'semesters') {
        return {
          getFullList: vi.fn().mockResolvedValue([{ id: 'sem1', name: '2026-1' }]),
        };
      }

      return { getFullList: vi.fn().mockResolvedValue([]) };
    });

    const options = await listEmployeeReportFormOptions();

    expect(options).toEqual({
      employees: [{ id: 'e1', label: 'Ana Pérez' }],
      jobs: [{ id: 'j1', label: 'Docente' }],
      semesters: [{ id: 'sem1', label: '2026-1' }],
    });
  });

  it('lists analytics records with normalized values and excludes incomplete rows', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        employee_id: ' e1 ',
        job_id: ' j1 ',
        semester_id: ' sem1 ',
      },
      {
        employee_id: 'e2',
        job_id: '',
        semester_id: 'sem2',
      },
    ]);

    const records = await listEmployeeReportsAnalyticsRecords();

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      sort: '-created_at',
      filter: 'is_deleted != true',
      fields: 'employee_id,job_id,semester_id',
      requestKey: 'reports-employees-analytics-list',
    });
    expect(records).toEqual([
      {
        employee_id: 'e1',
        job_id: 'j1',
        semester_id: 'sem1',
      },
    ]);
  });

  it('normalizes and rethrows analytics errors', async () => {
    const rawError = new Error('analytics failed');
    const normalized = { message: 'normalized analytics', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listEmployeeReportsAnalyticsRecords()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });

  it('throws when there is no authenticated user', async () => {
    hoisted.getAuthUserId.mockReturnValue(null);

    await expect(createEmployeeReport({
      employee_id: 'e1',
      job_id: 'j1',
      semester_id: 'sem1',
      comments: '',
    })).rejects.toThrow('No hay usuario autenticado');
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listEmployeeReportsPage(1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
