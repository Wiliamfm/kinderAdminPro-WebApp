import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countBulletinsByCategoryId,
  createBulletinCategory,
  deleteBulletinCategory,
  listBulletinCategories,
  listBulletinCategoriesPage,
  updateBulletinCategory,
} from './bulletin-categories';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getListRecords = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  const getListBulletins = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'bulletin_categories') {
        return {
          getFullList,
          getList: getListRecords,
          create,
          update,
          delete: del,
        };
      }

      return {
        getList: getListBulletins,
      };
    }),
  };

  return {
    getFullList,
    getListRecords,
    create,
    update,
    del,
    getListBulletins,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('bulletin categories pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists categories', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'c1',
        name: 'Académico',
        description: 'Rendimiento',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ]);

    const result = await listBulletinCategories();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name' });
    expect(result).toEqual([
      {
        id: 'c1',
        name: 'Académico',
        description: 'Rendimiento',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ]);
  });

  it('lists categories page', async () => {
    hoisted.getListRecords.mockResolvedValue({
      items: [
        {
          id: 'c1',
          name: 'Convivencia',
          description: 'Comportamiento',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listBulletinCategoriesPage(2, 10, {
      sortField: 'updated_at',
      sortDirection: 'desc',
    });

    expect(hoisted.getListRecords).toHaveBeenCalledWith(2, 10, {
      sort: '-updated_at',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0].name).toBe('Convivencia');
  });

  it('creates and updates category', async () => {
    hoisted.create.mockResolvedValue({
      id: 'c1',
      name: 'Académico',
      description: 'Rendimiento',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
    });
    hoisted.update.mockResolvedValue({
      id: 'c1',
      name: 'Académico',
      description: 'Rendimiento destacado',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T10:00:00.000Z',
    });

    await createBulletinCategory({
      name: '  Académico  ',
      description: ' Rendimiento ',
    });
    expect(hoisted.create).toHaveBeenCalledWith({
      name: 'Académico',
      description: 'Rendimiento',
    });

    const updated = await updateBulletinCategory('c1', {
      name: ' Académico ',
      description: ' Rendimiento destacado ',
    });
    expect(hoisted.update).toHaveBeenCalledWith('c1', {
      name: 'Académico',
      description: 'Rendimiento destacado',
    });
    expect(updated.description).toBe('Rendimiento destacado');
  });

  it('deletes category', async () => {
    await deleteBulletinCategory('c1');
    expect(hoisted.del).toHaveBeenCalledWith('c1');
  });

  it('counts linked bulletins by category', async () => {
    hoisted.getListBulletins.mockResolvedValue({ totalItems: 4 });

    const total = await countBulletinsByCategoryId('c-1');

    expect(total).toBe(4);
    expect(hoisted.getListBulletins).toHaveBeenCalledWith(1, 1, {
      filter: 'category_id = "c-1"',
    });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getListRecords.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listBulletinCategoriesPage(1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
