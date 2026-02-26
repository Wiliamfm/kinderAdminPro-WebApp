import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countActiveStudentsByGradeId,
  createGrade,
  deleteGrade,
  listGrades,
  listGradesPage,
  updateGrade,
} from './grades';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getListRecords = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  const getList = vi.fn();
  const normalizePocketBaseError = vi.fn();

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
  };

  return {
    getFullList,
    getListRecords,
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

describe('grades pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists grades', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30 },
      { id: 'g2', name: 'Segundo A', capacity: 35 },
    ]);

    const result = await listGrades();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name' });
    expect(result).toEqual([
      { id: 'g1', name: 'Primero A', capacity: 30 },
      { id: 'g2', name: 'Segundo A', capacity: 35 },
    ]);
  });

  it('lists grades page', async () => {
    hoisted.getListRecords.mockResolvedValue({
      items: [
        { id: 'g1', name: 'Primero A', capacity: 30 },
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
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toEqual({ id: 'g1', name: 'Primero A', capacity: 30 });
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
