import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSemester,
  getSemesterById,
  listSemestersPage,
  updateSemester,
} from './semesters';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      getOne,
      create,
      update,
    })),
  };

  return {
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

describe('semesters pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists semesters page with sorting', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: '2026-A',
          start_date: '2026-01-15T05:00:00.000Z',
          end_date: '2026-06-15T05:00:00.000Z',
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-01-01T10:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const result = await listSemestersPage(1, 10, {
      sortField: 'start_date',
      sortDirection: 'desc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-start_date',
    });
    expect(result.items[0]).toEqual({
      id: 's1',
      name: '2026-A',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
    });
  });

  it('gets one semester by id', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 's1',
      name: '2026-A',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
    });

    const result = await getSemesterById('s1');

    expect(hoisted.getOne).toHaveBeenCalledWith('s1');
    expect(result.name).toBe('2026-A');
  });

  it('creates and updates semesters with trimmed payload', async () => {
    hoisted.create.mockResolvedValue({
      id: 's1',
      name: '2026-A',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
    });
    hoisted.update.mockResolvedValue({
      id: 's1',
      name: '2026-B',
      start_date: '2026-07-01T05:00:00.000Z',
      end_date: '2026-12-01T05:00:00.000Z',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-06-01T10:00:00.000Z',
    });

    await createSemester({
      name: ' 2026-A ',
      start_date: ' 2026-01-15T05:00:00.000Z ',
      end_date: ' 2026-06-15T05:00:00.000Z ',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      name: '2026-A',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
    });

    await updateSemester('s1', {
      name: ' 2026-B ',
      start_date: ' 2026-07-01T05:00:00.000Z ',
      end_date: ' 2026-12-01T05:00:00.000Z ',
    });

    expect(hoisted.update).toHaveBeenCalledWith('s1', {
      name: '2026-B',
      start_date: '2026-07-01T05:00:00.000Z',
      end_date: '2026-12-01T05:00:00.000Z',
    });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listSemestersPage(1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
