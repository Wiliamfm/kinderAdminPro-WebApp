import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSemester,
  getCurrentSemester,
  getSemesterById,
  listSemesterOptions,
  listSemestersPage,
  updateSemester,
} from './semesters';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const getFullList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      getFullList,
      getOne,
      create,
      update,
    })),
  };

  return {
    getList,
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
          is_current: true,
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
      is_current: true,
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
      is_current: false,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
    });

    const result = await getSemesterById('s1');

    expect(hoisted.getOne).toHaveBeenCalledWith('s1');
    expect(result.name).toBe('2026-A');
  });

  it('gets current semester when one is active', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: '2026-A',
          start_date: '2026-01-15T05:00:00.000Z',
          end_date: '2026-06-15T05:00:00.000Z',
          is_current: true,
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-02-01T10:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 1,
      totalItems: 1,
      totalPages: 1,
    });

    const result = await getCurrentSemester();

    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'is_current = true',
      sort: '-updated_at',
    });
    expect(result).toEqual({
      id: 's1',
      name: '2026-A',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      is_current: true,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-02-01T10:00:00.000Z',
    });
  });

  it('returns null when there is no current semester', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 1,
      totalItems: 0,
      totalPages: 1,
    });

    const result = await getCurrentSemester();

    expect(result).toBeNull();
  });

  it('lists semester options for selector use cases', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 's1',
        name: '2026-A',
        start_date: '2026-01-15T05:00:00.000Z',
        end_date: '2026-06-15T05:00:00.000Z',
        is_current: true,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-02-01T10:00:00.000Z',
      },
    ]);

    const result = await listSemesterOptions();

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      sort: '-start_date',
      fields: 'id,name,start_date,end_date,is_current,created_at,updated_at',
    });
    expect(result).toEqual([
      {
        id: 's1',
        name: '2026-A',
        start_date: '2026-01-15T05:00:00.000Z',
        end_date: '2026-06-15T05:00:00.000Z',
        is_current: true,
        created_at: '2026-01-01T10:00:00.000Z',
        updated_at: '2026-02-01T10:00:00.000Z',
      },
    ]);
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
      is_current: true,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-06-01T10:00:00.000Z',
    });
    hoisted.getFullList.mockResolvedValue([]);

    await createSemester({
      name: ' 2026-A ',
      start_date: ' 2026-01-15T05:00:00.000Z ',
      end_date: ' 2026-06-15T05:00:00.000Z ',
      is_current: false,
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      name: '2026-A',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      is_current: false,
    });

    await updateSemester('s1', {
      name: ' 2026-B ',
      start_date: ' 2026-07-01T05:00:00.000Z ',
      end_date: ' 2026-12-01T05:00:00.000Z ',
      is_current: true,
    });

    expect(hoisted.update).toHaveBeenCalledWith('s1', {
      name: '2026-B',
      start_date: '2026-07-01T05:00:00.000Z',
      end_date: '2026-12-01T05:00:00.000Z',
      is_current: true,
    });
  });

  it('sets previous current semester to false before creating a new current semester', async () => {
    hoisted.getFullList.mockResolvedValue([{ id: 's-old' }]);
    hoisted.create.mockResolvedValue({
      id: 's-new',
      name: '2026-C',
      start_date: '2026-08-01T05:00:00.000Z',
      end_date: '2026-12-15T05:00:00.000Z',
      is_current: true,
      created_at: '2026-07-01T10:00:00.000Z',
      updated_at: '2026-07-01T10:00:00.000Z',
    });

    await createSemester({
      name: '2026-C',
      start_date: '2026-08-01T05:00:00.000Z',
      end_date: '2026-12-15T05:00:00.000Z',
      is_current: true,
    });

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'is_current = true',
      fields: 'id',
    });
    expect(hoisted.update).toHaveBeenCalledWith('s-old', { is_current: false });
    expect(hoisted.create).toHaveBeenCalledWith({
      name: '2026-C',
      start_date: '2026-08-01T05:00:00.000Z',
      end_date: '2026-12-15T05:00:00.000Z',
      is_current: true,
    });
  });

  it('sets other current semesters to false before updating semester as current', async () => {
    hoisted.getFullList.mockResolvedValue([{ id: 's-other' }]);
    hoisted.update.mockResolvedValue({
      id: 's1',
      name: '2026-D',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      is_current: true,
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-08-01T10:00:00.000Z',
    });

    await updateSemester('s1', {
      name: '2026-D',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      is_current: true,
    });

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'is_current = true && id != "s1"',
      fields: 'id',
    });
    expect(hoisted.update).toHaveBeenNthCalledWith(1, 's-other', { is_current: false });
    expect(hoisted.update).toHaveBeenNthCalledWith(2, 's1', {
      name: '2026-D',
      start_date: '2026-01-15T05:00:00.000Z',
      end_date: '2026-06-15T05:00:00.000Z',
      is_current: true,
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

  it('normalizes and rethrows selector loading errors', async () => {
    const rawError = new Error('selector');
    const normalized = { message: 'normalized selector', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listSemesterOptions()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
