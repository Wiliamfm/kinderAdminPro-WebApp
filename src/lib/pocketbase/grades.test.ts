import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countActiveStudentsByGradeId,
  createGrade,
  deleteGrade,
  listGrades,
  listGradesByEmployeeId,
  listGradesPage,
  updateGrade,
  updateGradeProfessor,
} from './grades';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getListRecords = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  const getList = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const filter = vi.fn((template: string, _params: unknown) => template);

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'grades') {
        return {
          getFullList,
          getList: getListRecords,
          create,
          update,
          delete: del,
        };
      }

      return {
        getList,
      };
    }),
    filter,
  };

  return {
    getFullList,
    getListRecords,
    create,
    update,
    del,
    getList,
    filter,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('grades pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists grades with employee expand', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30, employee_id: null },
      { id: 'g2', name: 'Segundo A', capacity: 35, employee_id: 'e1', expand: { employee_id: { name: 'Ana' } } },
    ]);

    const result = await listGrades();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name', expand: 'employee_id' });
    expect(result[0]).toMatchObject({ id: 'g1', name: 'Primero A', capacity: 30, employeeId: null, employeeName: '' });
    expect(result[1]).toMatchObject({ id: 'g2', employeeId: 'e1', employeeName: 'Ana' });
  });

  it('lists grades page with employee expand', async () => {
    hoisted.getListRecords.mockResolvedValue({
      items: [
        { id: 'g1', name: 'Primero A', capacity: 30, employee_id: null },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listGradesPage(2, 10, {
      sortField: 'capacity',
      sortDirection: 'desc',
    });

    expect(hoisted.getListRecords).toHaveBeenCalledWith(2, 10, {
      sort: '-capacity',
      expand: 'employee_id',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toMatchObject({ id: 'g1', name: 'Primero A', capacity: 30, employeeId: null, employeeName: '' });
  });

  it('lists grades by employee id', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30, employee_id: 'e1', expand: { employee_id: { name: 'Ana' } } },
    ]);
    hoisted.filter.mockReturnValue('employee_id = "e1"');

    const result = await listGradesByEmployeeId('e1');

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'employee_id = "e1"',
      expand: 'employee_id',
      sort: 'name',
    });
    expect(result[0]).toMatchObject({ id: 'g1', employeeId: 'e1', employeeName: 'Ana' });
  });

  it('updates grade professor assignment', async () => {
    hoisted.update.mockResolvedValue({
      id: 'g1', name: 'Primero A', capacity: 30, employee_id: 'e1',
      expand: { employee_id: { name: 'Ana' } },
    });

    const result = await updateGradeProfessor('g1', 'e1');

    expect(hoisted.update).toHaveBeenCalledWith('g1', { employee_id: 'e1' }, { expand: 'employee_id' });
    expect(result).toMatchObject({ id: 'g1', employeeId: 'e1', employeeName: 'Ana' });
  });

  it('clears grade professor assignment', async () => {
    hoisted.update.mockResolvedValue({
      id: 'g1', name: 'Primero A', capacity: 30, employee_id: null,
    });

    const result = await updateGradeProfessor('g1', null);

    expect(hoisted.update).toHaveBeenCalledWith('g1', { employee_id: '' }, { expand: 'employee_id' });
    expect(result.employeeId).toBeNull();
  });

  it('creates and updates grades', async () => {
    hoisted.create.mockResolvedValue({ id: 'g1', name: 'Primero A', capacity: 30 });
    hoisted.update.mockResolvedValue({ id: 'g1', name: 'Primero B', capacity: 32 });

    await createGrade({ name: 'Primero A', capacity: 30 });
    expect(hoisted.create).toHaveBeenCalledWith({ name: 'Primero A', capacity: 30 });

    const updated = await updateGrade('g1', { name: 'Primero B', capacity: 32 });
    expect(hoisted.update).toHaveBeenCalledWith('g1', {
      name: 'Primero B',
      capacity: 32,
    });
    expect(updated.capacity).toBe(32);
  });

  it('deletes grades', async () => {
    await deleteGrade('g1');
    expect(hoisted.del).toHaveBeenCalledWith('g1');
  });

  it('counts active students linked to a grade', async () => {
    hoisted.getList.mockResolvedValue({ totalItems: 3 });

    const total = await countActiveStudentsByGradeId('g1');

    expect(total).toBe(3);
    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'grade_id = "g1" && active = true',
    });
  });

  it('normalizes errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listGrades()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
