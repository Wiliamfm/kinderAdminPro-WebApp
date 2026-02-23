import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countEmployeesByJobId,
  createEmployeeJob,
  deleteEmployeeJob,
  listEmployeeJobs,
  updateEmployeeJob,
} from './employee-jobs';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  const getList = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'employee_jobs') {
        return {
          getFullList,
          create,
          update,
          delete: del,
        };
      }

      return {
        getList,
      };
    }),
  };

  return {
    getFullList,
    create,
    update,
    del,
    getList,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('employee-jobs pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists jobs', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'j1', name: 'Docente', salary: 1000 },
      { id: 'j2', name: 'Coordinador', salary: 1500 },
    ]);

    const result = await listEmployeeJobs();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name' });
    expect(result).toEqual([
      { id: 'j1', name: 'Docente', salary: 1000 },
      { id: 'j2', name: 'Coordinador', salary: 1500 },
    ]);
  });

  it('creates and updates jobs', async () => {
    hoisted.create.mockResolvedValue({ id: 'j1', name: 'Docente', salary: 1000 });
    hoisted.update.mockResolvedValue({ id: 'j1', name: 'Docente Senior', salary: 1200 });

    await createEmployeeJob({ name: 'Docente', salary: 1000 });
    expect(hoisted.create).toHaveBeenCalledWith({ name: 'Docente', salary: 1000 });

    const updated = await updateEmployeeJob('j1', { name: 'Docente Senior', salary: 1200 });
    expect(hoisted.update).toHaveBeenCalledWith('j1', {
      name: 'Docente Senior',
      salary: 1200,
    });
    expect(updated.salary).toBe(1200);
  });

  it('deletes jobs', async () => {
    await deleteEmployeeJob('j1');
    expect(hoisted.del).toHaveBeenCalledWith('j1');
  });

  it('counts employees linked to a job', async () => {
    hoisted.getList.mockResolvedValue({ totalItems: 3 });

    const total = await countEmployeesByJobId('j1');

    expect(total).toBe(3);
    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'job_id = "j1" && active = true',
    });
  });

  it('normalizes errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listEmployeeJobs()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
