import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listFatherBulletin, listFatherStudents } from './father-portal';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getList = vi.fn();
  const requireModuleAccess = vi.fn();
  const getAuthenticatedPb = vi.fn();
  const listBulletinsStudentsForExport = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    authStore: {
      record: {
        father_id: 'f1',
        get: (key: string) => (key === 'father_id' ? 'f1' : undefined),
      },
    },
    collection: vi.fn(() => ({
      getFullList,
      getList,
    })),
  };

  return {
    getFullList,
    getList,
    requireModuleAccess,
    getAuthenticatedPb,
    listBulletinsStudentsForExport,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('../server/get-authenticated-pb', () => ({
  getAuthenticatedPb: hoisted.getAuthenticatedPb,
}));

vi.mock('../server/require-module-access', () => ({
  requireModuleAccess: hoisted.requireModuleAccess,
}));

vi.mock('./bulletins-students', () => ({
  listBulletinsStudentsForExport: hoisted.listBulletinsStudentsForExport,
}));

vi.mock('./errors', async () => {
  const actual = await vi.importActual<typeof import('./errors')>('./errors');
  return {
    ...actual,
    normalizePocketBaseError: hoisted.normalizePocketBaseError,
  };
});

describe('father portal pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthenticatedPb.mockResolvedValue(hoisted.pb);
    hoisted.requireModuleAccess.mockResolvedValue(undefined);
    hoisted.normalizePocketBaseError.mockImplementation((error: unknown) => error);
    hoisted.getList.mockResolvedValue({ totalItems: 1 });
    hoisted.listBulletinsStudentsForExport.mockResolvedValue([]);
  });

  it('lists linked students with computed status and alphabetical order', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'l2',
        student_id: 's2',
        expand: {
          student_id: {
            id: 's2',
            name: 'Luis',
            document_id: '1002',
            active: true,
            accepted: false,
            rejected: '',
            grade_id: 'g2',
            expand: {
              grade_id: { name: 'Segundo' },
            },
          },
        },
      },
      {
        id: 'l1',
        student_id: 's1',
        expand: {
          student_id: {
            id: 's1',
            name: 'Ana',
            document_id: '1001',
            active: true,
            accepted: true,
            rejected: '',
            grade_id: 'g1',
            expand: {
              grade_id: { name: 'Primero' },
            },
          },
        },
      },
      {
        id: 'l3',
        student_id: 's3',
        expand: {
          student_id: {
            id: 's3',
            name: 'Zoe',
            document_id: '1003',
            active: true,
            accepted: false,
            rejected: '2026-04-01T12:00:00.000Z',
            grade_id: 'g3',
            expand: {
              grade_id: { name: 'Tercero' },
            },
          },
        },
      },
    ]);

    const result = await listFatherStudents();

    expect(hoisted.requireModuleAccess).toHaveBeenCalledWith('father-portal');
    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'father_id = "f1"',
      expand: 'student_id,student_id.grade_id',
      sort: 'created_at,id',
      requestKey: 'father-portal-students-f1',
    });
    expect(result).toEqual([
      expect.objectContaining({ id: 's1', name: 'Ana', gradeName: 'Primero', status: 'Activo' }),
      expect.objectContaining({ id: 's2', name: 'Luis', gradeName: 'Segundo', status: 'Pendiente' }),
      expect.objectContaining({ id: 's3', name: 'Zoe', gradeName: 'Tercero', status: 'Rechazado' }),
    ]);
  });

  it('checks father ownership before listing a student bulletin', async () => {
    hoisted.listBulletinsStudentsForExport.mockResolvedValue([
      { id: 'b1', student_id: 's1' },
    ]);

    const result = await listFatherBulletin('s1');

    expect(hoisted.requireModuleAccess).toHaveBeenCalledWith('father-portal');
    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'father_id = "f1" && student_id = "s1"',
      fields: 'id',
      requestKey: 'father-portal-student-access-f1-s1',
    });
    expect(hoisted.listBulletinsStudentsForExport).toHaveBeenCalledWith({
      studentIds: ['s1'],
      sortField: 'created_at',
      sortDirection: 'desc',
    });
    expect(result).toEqual([{ id: 'b1', student_id: 's1' }]);
  });
});
