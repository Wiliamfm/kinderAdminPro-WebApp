import { ClientResponseError } from 'pocketbase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countBulletinsByCategoryId,
  createBulletinCategory,
  deleteBulletinsByCategoryId,
  deleteBulletinCategory,
  listBulletinCategories,
  listBulletinCategoriesPage,
  updateBulletinCategory,
} from './bulletin-categories';

const hoisted = vi.hoisted(() => {
  const getFullListCategories = vi.fn();
  const getListRecords = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const deleteCategory = vi.fn();
  const getListBulletins = vi.fn();
  const getFullListBulletins = vi.fn();
  const deleteBulletin = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getAuthenticatedPb = vi.fn();

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'bulletin_categories') {
        return {
          getFullList: getFullListCategories,
          getList: getListRecords,
          create,
          update,
          delete: deleteCategory,
        };
      }

      return {
        getList: getListBulletins,
        getFullList: getFullListBulletins,
        delete: deleteBulletin,
      };
    }),
  };

  return {
    getFullListCategories,
    getListRecords,
    create,
    update,
    deleteCategory,
    getListBulletins,
    getFullListBulletins,
    deleteBulletin,
    normalizePocketBaseError,
    getAuthenticatedPb,
    pb,
  };
});

vi.mock('../server/get-authenticated-pb', () => ({
  getAuthenticatedPb: hoisted.getAuthenticatedPb,
}));

vi.mock('./errors', async () => {
  const actual = await vi.importActual<typeof import('./errors')>('./errors');
  return {
    ...actual,
    normalizePocketBaseError: hoisted.normalizePocketBaseError,
  };
});

describe('bulletin categories pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthenticatedPb.mockResolvedValue(hoisted.pb);
  });

  it('lists categories', async () => {
    hoisted.getFullListCategories.mockResolvedValue([
      {
        id: 'c1',
        name: 'Académico',
        description: 'Rendimiento',
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ]);

    const result = await listBulletinCategories();

    expect(hoisted.getFullListCategories).toHaveBeenCalledWith({ sort: 'name' });
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

  it('throws a contextual error when creating a duplicate category name', async () => {
    const rawError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          name: {
            code: 'validation_not_unique',
            message: 'Value must be unique',
          },
        },
      },
    });
    hoisted.create.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue({
      message: 'No se pudo crear el registro',
      status: 400,
      isAbort: false,
    });

    await expect(createBulletinCategory({
      name: 'Académico',
      description: 'Rendimiento',
    })).rejects.toMatchObject({
      message: 'El nombre ya está en uso',
      status: 400,
      isAbort: false,
    });
  });

  it('throws a contextual error when updating a duplicate category name', async () => {
    const rawError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to update record.',
        data: {
          name: {
            code: 'validation_not_unique',
            message: 'Value must be unique',
          },
        },
      },
    });
    hoisted.update.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue({
      message: 'No se pudo actualizar el registro',
      status: 400,
      isAbort: false,
    });

    await expect(updateBulletinCategory('c1', {
      name: 'Académico',
      description: 'Rendimiento destacado',
    })).rejects.toMatchObject({
      message: 'El nombre ya está en uso',
      status: 400,
      isAbort: false,
    });
  });

  it('deletes category after cascading linked bulletins', async () => {
    hoisted.getFullListBulletins.mockResolvedValue([]);

    await deleteBulletinCategory('c1');

    expect(hoisted.getFullListBulletins).toHaveBeenCalledWith({
      filter: 'category_id = "c1"',
    });
    expect(hoisted.deleteCategory).toHaveBeenCalledWith('c1');
  });

  it('counts linked active bulletins by category', async () => {
    hoisted.getListBulletins.mockResolvedValue({ totalItems: 4 });

    const total = await countBulletinsByCategoryId('c-1');

    expect(total).toBe(4);
    expect(hoisted.getListBulletins).toHaveBeenCalledWith(1, 1, {
      filter: 'category_id = "c-1" && is_deleted = false',
    });
  });

  it('hard deletes all bulletins for a category', async () => {
    hoisted.getFullListBulletins.mockResolvedValue([
      { id: 'b1' },
      { id: 'b2' },
    ]);

    await deleteBulletinsByCategoryId('c-1');

    expect(hoisted.getFullListBulletins).toHaveBeenCalledWith({
      filter: 'category_id = "c-1"',
    });
    expect(hoisted.deleteBulletin).toHaveBeenCalledTimes(2);
    expect(hoisted.deleteBulletin).toHaveBeenNthCalledWith(1, 'b1');
    expect(hoisted.deleteBulletin).toHaveBeenNthCalledWith(2, 'b2');
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
