import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBulletinStudent,
  listBulletinStudentFormOptions,
  listBulletinsStudentsPage,
  softDeleteBulletinStudent,
  updateBulletinStudent,
} from './bulletins-students';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const getFullList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getAuthUserId = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      getFullList,
      create,
      update,
    })),
  };

  return {
    getList,
    getFullList,
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

describe('bulletins-students pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockReturnValue('u-admin');
    hoisted.pb.collection.mockImplementation(() => ({
      getList: hoisted.getList,
      getFullList: hoisted.getFullList,
      create: hoisted.create,
      update: hoisted.update,
    }));
  });

  it('lists bulletins students page with expected sort/filter/expand', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'bs1',
          bulletin_id: 'b1',
          student_id: 's1',
          grade_id: 'g1',
          semester_id: 'sem1',
          note: 95,
          comments: ' Excelente ',
          created_by: 'u1',
          updated_by: 'u2',
          created_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-02T00:00:00.000Z',
          is_deleted: false,
          expand: {
            bulletin_id: {
              description: 'Notas de periodo',
              expand: {
                category_id: { name: 'Académico' },
              },
            },
            student_id: { name: 'Ana Pérez' },
            grade_id: { name: 'Primero A' },
            semester_id: { name: '2026-1' },
            created_by: { name: 'Admin Uno' },
            updated_by: { email: 'admin2@example.com' },
          },
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listBulletinsStudentsPage(2, 10, {
      sortField: 'bulletin_label',
      sortDirection: 'asc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(2, 10, {
      sort: 'bulletin_id.category_id.name',
      filter: 'is_deleted != true',
      expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'bs1',
      bulletin_label: 'Académico: Notas de periodo',
      student_name: 'Ana Pérez',
      grade_name: 'Primero A',
      semester_name: '2026-1',
      created_by_name: 'Admin Uno',
      updated_by_name: 'admin2@example.com',
      note: 95,
      comments: 'Excelente',
      is_deleted: false,
    }));
  });

  it('uses created_at descending as default sort', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await listBulletinsStudentsPage(1, 10);

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      filter: 'is_deleted != true',
      expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
    });
  });

  it('builds filter clauses for grade, semester and student query', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await listBulletinsStudentsPage(1, 10, {
      gradeId: ' g1 ',
      semesterId: ' sem1 ',
      studentQuery: 'Ana "123" \\ doc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      filter: 'is_deleted != true && grade_id = "g1" && semester_id = "sem1" && (student_id.name ~ "Ana \\"123\\" \\\\ doc" || student_id.document_id ~ "Ana \\"123\\" \\\\ doc")',
      expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
    });
  });

  it('builds exact student filters when specific student ids are provided', async () => {
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 10,
      totalItems: 0,
      totalPages: 1,
    });

    await listBulletinsStudentsPage(1, 10, {
      studentIds: [' s1 ', 's2', 's1'],
      studentQuery: 'Ana',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-created_at',
      filter: 'is_deleted != true && (student_id = "s1" || student_id = "s2")',
      expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
    });
  });

  it('creates bulletin student with audit defaults', async () => {
    hoisted.create.mockResolvedValue({
      id: 'bs1',
      bulletin_id: 'b1',
      student_id: 's1',
      grade_id: 'g1',
      semester_id: 'sem1',
      note: 100,
      comments: 'Excelente',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
      is_deleted: false,
      expand: {
        bulletin_id: {
          description: 'Notas',
          expand: {
            category_id: { name: 'Académico' },
          },
        },
        student_id: { name: 'Ana' },
        grade_id: { name: 'Primero A' },
        semester_id: { name: '2026-1' },
        created_by: { name: 'Admin' },
        updated_by: { name: 'Admin' },
      },
    });

    await createBulletinStudent({
      bulletin_id: ' b1 ',
      student_id: ' s1 ',
      grade_id: ' g1 ',
      semester_id: ' sem1 ',
      note: 100,
      comments: ' Excelente ',
    });

    expect(hoisted.create).toHaveBeenCalledWith(
      {
        bulletin_id: 'b1',
        student_id: 's1',
        grade_id: 'g1',
        semester_id: 'sem1',
        note: 100,
        comments: 'Excelente',
        created_by: 'u-admin',
        updated_by: 'u-admin',
        is_deleted: false,
      },
      {
        expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
      },
    );
  });

  it('updates bulletin student and refreshes updated_by', async () => {
    hoisted.update.mockResolvedValue({
      id: 'bs1',
      bulletin_id: 'b1',
      student_id: 's1',
      grade_id: 'g2',
      semester_id: 'sem2',
      note: 88,
      comments: 'Actualizado',
      created_by: 'u1',
      updated_by: 'u-admin',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-02T00:00:00.000Z',
      is_deleted: false,
      expand: {
        bulletin_id: {
          description: 'Notas',
          expand: {
            category_id: { name: 'Académico' },
          },
        },
        student_id: { name: 'Ana' },
        grade_id: { name: 'Segundo A' },
        semester_id: { name: '2026-2' },
        created_by: { name: 'Admin Uno' },
        updated_by: { name: 'Admin Dos' },
      },
    });

    await updateBulletinStudent('bs1', {
      bulletin_id: ' b1 ',
      student_id: ' s1 ',
      grade_id: ' g2 ',
      semester_id: ' sem2 ',
      note: 88,
      comments: ' Actualizado ',
    });

    expect(hoisted.update).toHaveBeenCalledWith(
      'bs1',
      {
        bulletin_id: 'b1',
        student_id: 's1',
        grade_id: 'g2',
        semester_id: 'sem2',
        note: 88,
        comments: 'Actualizado',
        updated_by: 'u-admin',
      },
      {
        expand: 'bulletin_id,bulletin_id.category_id,student_id,grade_id,semester_id,created_by,updated_by',
      },
    );
  });

  it('soft deletes bulletin student and stores updated_by', async () => {
    await softDeleteBulletinStudent('bs1');

    expect(hoisted.update).toHaveBeenCalledWith('bs1', {
      is_deleted: true,
      updated_by: 'u-admin',
    });
  });

  it('lists create/edit form options with normalized labels', async () => {
    hoisted.pb.collection.mockImplementation((name: string) => {
      if (name === 'bulletins') {
        return {
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'b1',
              description: 'Notas de periodo',
              expand: {
                category_id: { name: 'Académico' },
              },
            },
          ]),
        };
      }

      if (name === 'students') {
        return {
          getFullList: vi.fn().mockResolvedValue([{ id: 's1', name: 'Ana Pérez' }]),
        };
      }

      if (name === 'grades') {
        return {
          getFullList: vi.fn().mockResolvedValue([{ id: 'g1', name: 'Primero A' }]),
        };
      }

      if (name === 'semesters') {
        return {
          getFullList: vi.fn().mockResolvedValue([{ id: 'sem1', name: '2026-1' }]),
        };
      }

      return { getFullList: vi.fn().mockResolvedValue([]) };
    });

    const options = await listBulletinStudentFormOptions();

    expect(options).toEqual({
      bulletins: [{ id: 'b1', label: 'Académico: Notas de periodo' }],
      students: [{ id: 's1', label: 'Ana Pérez' }],
      grades: [{ id: 'g1', label: 'Primero A' }],
      semesters: [{ id: 'sem1', label: '2026-1' }],
    });
  });

  it('throws when there is no authenticated user', async () => {
    hoisted.getAuthUserId.mockReturnValue(null);

    await expect(createBulletinStudent({
      bulletin_id: 'b1',
      student_id: 's1',
      grade_id: 'g1',
      semester_id: 'sem1',
      note: 90,
      comments: '',
    })).rejects.toThrow('No hay usuario autenticado');
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listBulletinsStudentsPage(1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
