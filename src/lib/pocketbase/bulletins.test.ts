import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBulletin,
  listBulletinsPage,
  softDeleteBulletin,
  updateBulletin,
} from './bulletins';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getAuthUserId = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      create,
      update,
    })),
  };

  return {
    getList,
    create,
    update,
    normalizePocketBaseError,
    getAuthUserId,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

vi.mock('./users', () => ({
  getAuthUserId: hoisted.getAuthUserId,
}));

describe('bulletins pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockReturnValue('u-admin');
  });

  it('lists bulletins page with relation expansion', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'b1',
          category_id: 'c1',
          description: 'Excelente desempeño.',
          grade_id: 'g1',
          created_by: 'u1',
          updated_by: 'u2',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z',
          is_deleted: false,
          expand: {
            category_id: { name: 'Académico' },
            grade_id: { name: 'Primero A' },
            created_by: { name: 'Admin Uno', email: 'a1@example.com' },
            updated_by: { email: 'a2@example.com' },
          },
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listBulletinsPage(2, 10, {
      sortField: 'category_name',
      sortDirection: 'asc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(2, 10, {
      sort: 'category_id.name',
      filter: 'is_deleted != true',
      expand: 'category_id,grade_id,created_by,updated_by',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'b1',
      category_name: 'Académico',
      grade_name: 'Primero A',
      created_by_name: 'Admin Uno',
      updated_by_name: 'a2@example.com',
      is_deleted: false,
    }));
  });

  it('creates bulletin with authenticated user audit fields', async () => {
    hoisted.create.mockResolvedValue({
      id: 'b1',
      category_id: 'c1',
      description: 'Rendimiento alto',
      grade_id: 'g1',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
      is_deleted: false,
      expand: {
        category_id: { name: 'Académico' },
        grade_id: { name: 'Primero A' },
        created_by: { name: 'Admin' },
        updated_by: { name: 'Admin' },
      },
    });

    await createBulletin({
      category_id: ' c1 ',
      description: ' Rendimiento alto ',
      grade_id: ' g1 ',
    });

    expect(hoisted.create).toHaveBeenCalledWith(
      {
        category_id: 'c1',
        description: 'Rendimiento alto',
        grade_id: 'g1',
        created_by: 'u-admin',
        updated_by: 'u-admin',
        is_deleted: false,
      },
      {
        expand: 'category_id,grade_id,created_by,updated_by',
      },
    );
  });

  it('updates bulletin and only refreshes updated_by audit field', async () => {
    hoisted.update.mockResolvedValue({
      id: 'b1',
      category_id: 'c1',
      description: 'Actualizado',
      grade_id: 'g2',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-02T00:00:00.000Z',
      is_deleted: false,
      expand: {
        category_id: { name: 'Convivencia' },
        grade_id: { name: 'Segundo A' },
        created_by: { name: 'Admin' },
        updated_by: { name: 'Admin' },
      },
    });

    await updateBulletin('b1', {
      category_id: ' c1 ',
      description: ' Actualizado ',
      grade_id: ' g2 ',
    });

    expect(hoisted.update).toHaveBeenCalledWith(
      'b1',
      {
        category_id: 'c1',
        description: 'Actualizado',
        grade_id: 'g2',
        updated_by: 'u-admin',
      },
      {
        expand: 'category_id,grade_id,created_by,updated_by',
      },
    );
  });

  it('soft deletes bulletin and stores updated_by', async () => {
    await softDeleteBulletin('b1');
    expect(hoisted.update).toHaveBeenCalledWith('b1', {
      is_deleted: true,
      updated_by: 'u-admin',
    });
  });

  it('throws when there is no authenticated user', async () => {
    hoisted.getAuthUserId.mockReturnValue(null);

    await expect(createBulletin({
      category_id: 'c1',
      description: 'x',
      grade_id: 'g1',
    })).rejects.toThrow('No hay usuario autenticado');
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listBulletinsPage(1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
