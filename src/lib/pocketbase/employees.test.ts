import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmployee,
  deactivateEmployee,
  getEmployeeById,
  listActiveEmployees,
  updateEmployee,
} from './employees';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      getOne,
      create,
      update,
    })),
  };

  return {
    getFullList,
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

  it('lists only active employees and maps user_id', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'e1',
        name: 'Ana',
        salary: 1000,
        job: 'Docente',
        email: 'ana@test.com',
        phone: '300',
        address: 'Calle 1',
        emergency_contact: 'Luis',
        active: true,
        user_id: 'u1',
      },
      {
        id: 'e2',
        name: 'Inactive',
        salary: 1000,
        job: 'Docente',
        email: 'inactive@test.com',
        phone: '301',
        address: 'Calle 2',
        emergency_contact: 'Juan',
        active: false,
        user_id: 'u2',
      },
    ]);

    const result = await listActiveEmployees();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'e1',
      userId: 'u1',
      active: true,
    });
  });

  it('gets employee by id', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      salary: 1000,
      job: 'Docente',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
    });

    const result = await getEmployeeById('e1');
    expect(result.userId).toBe('u1');
    expect(hoisted.getOne).toHaveBeenCalledWith('e1');
  });

  it('creates employee with user relation and active=true', async () => {
    hoisted.create.mockResolvedValue({
      id: 'e3',
      name: 'Ana',
      salary: 1200,
      job: 'Docente',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u3',
    });

    const result = await createEmployee({
      name: 'Ana',
      salary: 1200,
      job: 'Docente',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      userId: 'u3',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      name: 'Ana',
      salary: 1200,
      job: 'Docente',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      user_id: 'u3',
      active: true,
    });
    expect(result.userId).toBe('u3');
  });

  it('updates and deactivates employees', async () => {
    hoisted.update.mockResolvedValue({
      id: 'e1',
      name: 'Ana',
      salary: 1300,
      job: 'Coord',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
      active: true,
      user_id: 'u1',
    });

    const updated = await updateEmployee('e1', {
      name: 'Ana',
      salary: 1300,
      job: 'Coord',
      email: 'ana@test.com',
      phone: '300',
      address: 'Calle 1',
      emergency_contact: 'Luis',
    });

    expect(updated.salary).toBe(1300);
    expect(hoisted.update).toHaveBeenCalledWith('e1', expect.objectContaining({ salary: 1300 }));

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
