import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmployee,
  deactivateEmployee,
  getEmployeeById,
  listActiveEmployees,
  listActiveEmployeesPage,
  updateEmployee,
} from './employees';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      getList,
      getOne,
      create,
      update,
    })),
  };

  return {
    getFullList,
    getList,
    getOne,
    create,
    update,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('employees pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only active employees and maps relations', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'e1',
        name: 'Ana',
        email: 'ana@test.com',
        phone: '300',
        address: 'Calle 1',
        emergency_contact: 'Luis',
        active: true,
        user_id: 'u1',
        job_id: 'j1',
        expand: {
          job_id: {
            id: 'j1',
            name: 'Docente',
            salary: 1000,
          },
        },
      },
      {
        id: 'e2',
        name: 'Inactive',
        email: 'inactive@test.com',
        phone: '301',
        address: 'Calle 2',
        emergency_contact: 'Juan',
        active: false,
        user_id: 'u2',
        job_id: 'j1',
      },
    ]);

    const result = await listActiveEmployees();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name', expand: 'job_id' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'e1',
      userId: 'u1',
      jobId: 'j1',
      jobName: 'Docente',
      jobSalary: 1000,
      active: true,
    });
  });

  it('lists active employees page with server-side relation sorting', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'e1',
          name: 'Ana',
          email: 'ana@test.com',
          phone: '300',
          address: 'Calle 1',
          emergency_contact: 'Luis',
          active: true,
          user_id: 'u1',
          job_id: 'j1',
          expand: {
            job_id: {
              id: 'j1',
              name: 'Docente',
              salary: 1000,
            },
          },
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listActiveEmployeesPage(2, 10, {
      sortField: 'jobSalary',
      sortDirection: 'desc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(2, 10, {
      sort: '-job_id.salary',
      filter: 'active = true',
      expand: 'job_id',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toMatchObject({
      id: 'e1',
      jobName: 'Docente',
      jobSalary: 1000,
    });
  });

  it('gets employee by id with expanded job', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
      job_id: 'j1',
      expand: {
        job_id: {
          id: 'j1',
          name: 'Docente',
          salary: 1000,
        },
      },
    });

    const result = await getEmployeeById('e1');
    expect(result.userId).toBe('u1');
    expect(result.jobName).toBe('Docente');
    expect(hoisted.getOne).toHaveBeenCalledWith('e1', { expand: 'job_id' });
  });

  it('creates employee with user and job relation', async () => {
    hoisted.create.mockResolvedValue({
      id: 'e3',
      name: 'Ana',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u3',
      job_id: 'j1',
      expand: {
        job_id: {
          id: 'j1',
          name: 'Docente',
          salary: 1200,
        },
      },
    });

    const result = await createEmployee({
      name: 'Ana',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      userId: 'u3',
      jobId: 'j1',
    });

    expect(hoisted.create).toHaveBeenCalledWith(
      {
        name: 'Ana',
        email: 'ana@test.com',
        phone: '300',
        address: 'Calle 1',
        emergency_contact: 'Luis',
        user_id: 'u3',
        job_id: 'j1',
        active: true,
      },
      {
        expand: 'job_id',
      },
    );
    expect(result.userId).toBe('u3');
    expect(result.jobId).toBe('j1');
  });

  it('updates and deactivates employees', async () => {
    hoisted.update.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
      job_id: 'j2',
      expand: {
        job_id: {
          id: 'j2',
          name: 'Coordinador',
          salary: 1300,
        },
      },
    });

    const updated = await updateEmployee('e1', {
      name: 'Ana',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      jobId: 'j2',
    });

    expect(updated.jobId).toBe('j2');
    expect(hoisted.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ job_id: 'j2' }),
      expect.objectContaining({ expand: 'job_id' }),
    );

    await deactivateEmployee('e1');
    expect(hoisted.update).toHaveBeenLastCalledWith('e1', { active: false });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listActiveEmployees()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
