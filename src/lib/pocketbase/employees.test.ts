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
  const getURL = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      getList,
      getOne,
      create,
      update,
    })),
    files: {
      getURL,
    },
  };

  return {
    getFullList,
    getList,
    getOne,
    create,
    update,
    getURL,
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
    hoisted.getURL.mockImplementation((_record: unknown, fileName: string) => `https://files/${fileName}`);
  });

  it('lists only active employees and maps relations', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'e1',
        name: 'Ana',
        document_id: '123456',
        email: 'ana@test.com',
        phone: '300',
        address: 'Calle 1',
        emergency_contact: 'Luis',
        active: true,
        user_id: 'u1',
        job_id: 'j1',
        cv: 'ana_cv.pdf',
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
        document_id: '654321',
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
      documentId: '123456',
      userId: 'u1',
      jobId: 'j1',
      jobName: 'Docente',
      jobSalary: 1000,
      active: true,
      cvFileName: 'ana_cv.pdf',
      cvUrl: 'https://files/ana_cv.pdf',
    });
    expect(hoisted.getURL).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), 'ana_cv.pdf');
  });

  it('lists active employees page with server-side relation sorting', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'e1',
          name: 'Ana',
          document_id: '123456',
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
      cvFileName: '',
      cvUrl: null,
    });
  });

  it('gets employee by id with expanded job', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      document_id: '123456',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
      job_id: 'j1',
      cv: 'ana_cv.pdf',
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
    expect(result.cvFileName).toBe('ana_cv.pdf');
    expect(result.cvUrl).toBe('https://files/ana_cv.pdf');
    expect(hoisted.getOne).toHaveBeenCalledWith('e1', { expand: 'job_id' });
  });

  it('maps cv file name when PocketBase returns file field as array', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      document_id: '123456',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
      job_id: 'j1',
      cv: ['ana_cv.pdf'],
      expand: {
        job_id: {
          id: 'j1',
          name: 'Docente',
          salary: 1000,
        },
      },
    });

    const result = await getEmployeeById('e1');
    expect(result.cvFileName).toBe('ana_cv.pdf');
    expect(result.cvUrl).toBe('https://files/ana_cv.pdf');
    expect(hoisted.getURL).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }), 'ana_cv.pdf');
  });

  it('creates employee with user and job relation', async () => {
    hoisted.create.mockResolvedValue({
      id: 'e3',
      name: 'Ana',
      document_id: '123456',
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
      documentId: '123456',
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
        document_id: '123456',
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

  it('creates employee with cv file using FormData payload', async () => {
    hoisted.create.mockResolvedValue({
      id: 'e3',
      name: 'Ana',
      document_id: '123456',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u3',
      job_id: 'j1',
      cv: 'ana_cv.pdf',
      expand: {
        job_id: {
          id: 'j1',
          name: 'Docente',
          salary: 1200,
        },
      },
    });

    const cv = new File(['pdf-content'], 'ana_cv.pdf', { type: 'application/pdf' });
    await createEmployee({
      name: 'Ana',
      documentId: '123456',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      userId: 'u3',
      jobId: 'j1',
      cv,
    });

    const payload = hoisted.create.mock.calls[0][0];
    expect(payload).toBeInstanceOf(FormData);
    expect(payload.get('name')).toBe('Ana');
    expect(payload.get('document_id')).toBe('123456');
    expect(payload.get('job_id')).toBe('j1');
    expect(payload.get('user_id')).toBe('u3');
    expect(payload.get('active')).toBe('true');
    expect(payload.get('cv')).toBe(cv);
  });

  it('updates and deactivates employees', async () => {
    hoisted.update.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      document_id: '123456',
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
      documentId: '123456',
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

  it('updates employee with cv file using FormData payload', async () => {
    hoisted.update.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      document_id: '123456',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
      job_id: 'j2',
      cv: 'ana_cv_new.pdf',
      expand: {
        job_id: {
          id: 'j2',
          name: 'Coordinador',
          salary: 1300,
        },
      },
    });

    const cv = new File(['pdf-content'], 'ana_cv_new.pdf', { type: 'application/pdf' });
    await updateEmployee('e1', {
      name: 'Ana',
      documentId: '123456',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      jobId: 'j2',
      cv,
    });

    const payload = hoisted.update.mock.calls[0][1];
    expect(payload).toBeInstanceOf(FormData);
    expect(payload.get('name')).toBe('Ana');
    expect(payload.get('job_id')).toBe('j2');
    expect(payload.get('cv')).toBe(cv);
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
