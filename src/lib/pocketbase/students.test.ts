import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStudent,
  deactivateStudent,
  getStudentById,
  listActiveStudents,
  listActiveStudentsByGradeIds,
  listActiveStudentsPage,
  updateStudent,
} from './students';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const deleteRecord = vi.fn();
  const studentFatherGetFullList = vi.fn();
  const studentFatherCreate = vi.fn();
  const studentFatherDelete = vi.fn();
  const fatherUpdate = vi.fn();
  const userDelete = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const listFatherNamesByStudentIds = vi.fn();
  const getAuthenticatedPb = vi.fn();

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'students') {
        return {
          getFullList,
          getList,
          getOne,
          create,
          update,
          delete: deleteRecord,
        };
      }

      if (name === 'students_fathers') {
        return {
          getFullList: studentFatherGetFullList,
          create: studentFatherCreate,
          delete: studentFatherDelete,
        };
      }

      if (name === 'fathers') {
        return {
          update: fatherUpdate,
        };
      }

      if (name === 'users') {
        return {
          delete: userDelete,
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return {
    getFullList,
    getList,
    getOne,
    create,
    update,
    deleteRecord,
    studentFatherGetFullList,
    studentFatherCreate,
    studentFatherDelete,
    fatherUpdate,
    userDelete,
    normalizePocketBaseError,
    listFatherNamesByStudentIds,
    getAuthenticatedPb,
    pb,
  };
});

vi.mock('../server/get-authenticated-pb', () => ({
  getAuthenticatedPb: hoisted.getAuthenticatedPb,
}));

vi.mock('./errors', () => ({
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

vi.mock('./students-fathers', () => ({
  listFatherNamesByStudentIds: hoisted.listFatherNamesByStudentIds,
}));

describe('students pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthenticatedPb.mockResolvedValue(hoisted.pb);
    hoisted.listFatherNamesByStudentIds.mockResolvedValue({});
    hoisted.normalizePocketBaseError.mockImplementation((error: unknown) => error);
    hoisted.deleteRecord.mockResolvedValue(undefined);
    hoisted.studentFatherGetFullList.mockResolvedValue([]);
    hoisted.studentFatherCreate.mockResolvedValue({ id: 'sf-restored' });
    hoisted.studentFatherDelete.mockResolvedValue(undefined);
    hoisted.fatherUpdate.mockResolvedValue({});
    hoisted.userDelete.mockResolvedValue(undefined);
  });

  it('lists active students and maps fields', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 's1',
        name: 'Ana',
        grade_id: 'g1',
        date_of_birth: '2015-06-15 13:30:00.000Z',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: 20.5,
        height: 115,
        blood_type: 'O+',
        social_security: 'SSN-1',
        allergies: 'Ninguna',
        active: true,
        expand: {
          grade_id: {
            id: 'g1',
            name: 'Primero A',
          },
        },
      },
      {
        id: 's2',
        name: 'Luis',
        grade_id: 'g2',
        date_of_birth: '2016-01-10 09:00:00.000Z',
        birth_place: 'Medellin',
        department: 'Antioquia',
        document_id: 'DOC-2',
        weight: 21,
        height: 116,
        blood_type: 'A+',
        social_security: '',
        allergies: '',
        active: false,
        expand: {
          grade_id: {
            id: 'g2',
            name: 'Segundo A',
          },
        },
      },
    ]);

    const result = await listActiveStudents();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name', expand: 'grade_id' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 's1',
      name: 'Ana',
      grade_id: 'g1',
      grade_name: 'Primero A',
      document_id: 'DOC-1',
      active: true,
      father_names: [],
    });
  });

  it('lists active students without father-name enrichment when requested', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 's1',
        name: 'Ana',
        grade_id: 'g1',
        date_of_birth: '2015-06-15 13:30:00.000Z',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: 20.5,
        height: 115,
        blood_type: 'O+',
        social_security: 'SSN-1',
        allergies: 'Ninguna',
        active: true,
        expand: {
          grade_id: {
            id: 'g1',
            name: 'Primero A',
          },
        },
      },
    ]);

    const result = await listActiveStudents({ includeFatherNames: false });

    expect(hoisted.listFatherNamesByStudentIds).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 's1',
        name: 'Ana',
        father_names: [],
      }),
    ]);
  });

  it('lists active students page with grade relation sorting', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 's1',
          name: 'Ana',
          grade_id: 'g1',
          date_of_birth: '2015-06-15T13:30:00.000Z',
          birth_place: 'Bogota',
          department: 'Cundinamarca',
          document_id: 'DOC-1',
          weight: 20.5,
          height: 115,
          blood_type: 'O+',
          social_security: 'SSN-1',
          allergies: 'Ninguna',
          active: true,
          expand: {
            grade_id: {
              id: 'g1',
              name: 'Primero A',
            },
          },
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listActiveStudentsPage(2, 10, {
      sortField: 'grade_name',
      sortDirection: 'asc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(2, 10, {
      sort: 'grade_id.name',
      filter: 'active = true',
      expand: 'grade_id',
    });
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toMatchObject({
      id: 's1',
      grade_name: 'Primero A',
      father_names: [],
    });
  });

  it('gets student by id', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 's1',
      name: 'Ana',
      grade_id: 'g1',
      date_of_birth: '2015-06-15 13:30:00.000Z',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: 'DOC-1',
      weight: 20.5,
      height: 115,
      blood_type: 'O+',
      social_security: 'SSN-1',
      allergies: 'Ninguna',
      active: true,
      expand: {
        grade_id: {
          id: 'g1',
          name: 'Primero A',
        },
      },
    });

    const result = await getStudentById('s1');

    expect(hoisted.getOne).toHaveBeenCalledWith('s1', { expand: 'grade_id' });
    expect(result.id).toBe('s1');
    expect(result.name).toBe('Ana');
    expect(result.grade_name).toBe('Primero A');
    expect(result.father_names).toEqual([]);
  });

  it('creates student with active=true', async () => {
    hoisted.create.mockResolvedValue({
      id: 's3',
      name: 'Sofia',
      grade_id: 'g1',
      date_of_birth: '2016-07-01 15:00:00.000Z',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: 'DOC-3',
      weight: null,
      height: null,
      blood_type: 'B+',
      social_security: '',
      allergies: '',
      active: true,
      expand: {
        grade_id: {
          id: 'g1',
          name: 'Primero A',
        },
      },
    });

    await createStudent({
      name: 'Sofia',
      grade_id: 'g1',
      date_of_birth: '2016-07-01T10:00:00-05:00',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: 'DOC-3',
      weight: null,
      height: null,
      blood_type: 'B+',
      social_security: '',
      allergies: '',
    });

    expect(hoisted.create).toHaveBeenCalledWith(
      {
        name: 'Sofia',
        grade_id: 'g1',
        date_of_birth: '2016-07-01T10:00:00-05:00',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-3',
        weight: null,
        height: null,
        blood_type: 'B+',
        social_security: '',
        allergies: '',
        active: true,
      },
      {
        expand: 'grade_id',
      },
    );
  });

  it('updates and deactivates students', async () => {
    hoisted.update.mockResolvedValue({
      id: 's1',
      name: 'Ana Maria',
      grade_id: 'g2',
      date_of_birth: '2015-06-15 13:30:00.000Z',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: 'DOC-1',
      weight: 21,
      height: 116,
      blood_type: 'O+',
      social_security: 'SSN-1',
      allergies: 'Polen',
      active: true,
      expand: {
        grade_id: {
          id: 'g2',
          name: 'Segundo A',
        },
      },
    });

    const updated = await updateStudent('s1', {
      name: 'Ana Maria',
      grade_id: 'g2',
      date_of_birth: '2015-06-15T08:30:00-05:00',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: 'DOC-1',
      weight: 21,
      height: 116,
      blood_type: 'O+',
      social_security: 'SSN-1',
      allergies: 'Polen',
    });

    expect(hoisted.update).toHaveBeenCalledWith(
      's1',
      {
        name: 'Ana Maria',
        grade_id: 'g2',
        date_of_birth: '2015-06-15T08:30:00-05:00',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: 21,
        height: 116,
        blood_type: 'O+',
        social_security: 'SSN-1',
        allergies: 'Polen',
      },
      {
        expand: 'grade_id',
      },
    );
    expect(updated.name).toBe('Ana Maria');
    expect(updated.grade_name).toBe('Segundo A');

    await deactivateStudent('s1');
    expect(hoisted.update).toHaveBeenLastCalledWith('s1', { active: false });
    expect(hoisted.studentFatherGetFullList).toHaveBeenCalledWith({
      filter: 'student_id = "s1"',
      expand: 'father_id',
      fields: 'id,father_id,relationship,expand.father_id.is_active,expand.father_id.user_id',
      sort: 'created_at,id',
    });
    expect(hoisted.studentFatherDelete).not.toHaveBeenCalled();
    expect(hoisted.fatherUpdate).not.toHaveBeenCalled();
    expect(hoisted.userDelete).not.toHaveBeenCalled();
  });

  it('keeps fathers active when they still have other active students', async () => {
    hoisted.studentFatherGetFullList
      .mockResolvedValueOnce([
        {
          id: 'sf1',
          father_id: 'f1',
          relationship: 'father',
          expand: {
            father_id: {
              is_active: true,
              user_id: 'u1',
            },
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'sf2',
          expand: {
            student_id: {
              active: true,
            },
          },
        },
      ]);

    await deactivateStudent('s1');

    expect(hoisted.studentFatherDelete).toHaveBeenCalledWith('sf1');
    expect(hoisted.update).toHaveBeenCalledWith('s1', { active: false });
    expect(hoisted.fatherUpdate).not.toHaveBeenCalled();
    expect(hoisted.userDelete).not.toHaveBeenCalled();
  });

  it('soft-deletes fathers without active students and deletes their linked users', async () => {
    hoisted.studentFatherGetFullList
      .mockResolvedValueOnce([
        {
          id: 'sf1',
          father_id: 'f1',
          relationship: 'father',
          expand: {
            father_id: {
              is_active: true,
              user_id: 'u1',
            },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    await deactivateStudent('s1');

    expect(hoisted.studentFatherDelete).toHaveBeenCalledWith('sf1');
    expect(hoisted.fatherUpdate).toHaveBeenCalledWith('f1', { is_active: false });
    expect(hoisted.userDelete).toHaveBeenCalledWith('u1');
  });

  it('skips father and user changes when the father is already inactive', async () => {
    hoisted.studentFatherGetFullList
      .mockResolvedValueOnce([
        {
          id: 'sf1',
          father_id: 'f1',
          relationship: 'father',
          expand: {
            father_id: {
              is_active: false,
              user_id: 'u1',
            },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    await deactivateStudent('s1');

    expect(hoisted.studentFatherDelete).toHaveBeenCalledWith('sf1');
    expect(hoisted.fatherUpdate).not.toHaveBeenCalled();
    expect(hoisted.userDelete).not.toHaveBeenCalled();
  });

  it('rolls back junction links when student deactivation fails after link deletion', async () => {
    const rawError = new Error('student update failed');
    hoisted.studentFatherGetFullList.mockResolvedValueOnce([
      {
        id: 'sf1',
        father_id: 'f1',
        relationship: 'mother',
        expand: {
          father_id: {
            is_active: true,
            user_id: null,
          },
        },
      },
    ]);
    hoisted.update.mockRejectedValueOnce(rawError);

    await expect(deactivateStudent('s1')).rejects.toBe(rawError);

    expect(hoisted.studentFatherDelete).toHaveBeenCalledWith('sf1');
    expect(hoisted.studentFatherCreate).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f1',
      relationship: 'mother',
    });
    expect(hoisted.update).toHaveBeenCalledTimes(1);
    expect(hoisted.fatherUpdate).not.toHaveBeenCalled();
  });

  it('restores student and links when father deactivation fails', async () => {
    const rawError = new Error('father update failed');
    hoisted.studentFatherGetFullList
      .mockResolvedValueOnce([
        {
          id: 'sf1',
          father_id: 'f1',
          relationship: 'father',
          expand: {
            father_id: {
              is_active: true,
              user_id: null,
            },
          },
        },
      ])
      .mockResolvedValueOnce([]);
    hoisted.fatherUpdate.mockRejectedValueOnce(rawError);

    await expect(deactivateStudent('s1')).rejects.toBe(rawError);

    expect(hoisted.update).toHaveBeenNthCalledWith(1, 's1', { active: false });
    expect(hoisted.update).toHaveBeenNthCalledWith(2, 's1', { active: true });
    expect(hoisted.studentFatherCreate).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f1',
      relationship: 'father',
    });
  });

  it('logs and continues when linked user deletion fails', async () => {
    const rawError = new Error('user delete failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    hoisted.studentFatherGetFullList
      .mockResolvedValueOnce([
        {
          id: 'sf1',
          father_id: 'f1',
          relationship: 'father',
          expand: {
            father_id: {
              is_active: true,
              user_id: 'u1',
            },
          },
        },
      ])
      .mockResolvedValueOnce([]);
    hoisted.userDelete.mockRejectedValueOnce(rawError);

    await expect(deactivateStudent('s1')).resolves.toBeUndefined();

    expect(hoisted.fatherUpdate).toHaveBeenCalledWith('f1', { is_active: false });
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to delete linked father user during student deactivation.',
      expect.objectContaining({
        studentId: 's1',
        fatherId: 'f1',
        userId: 'u1',
        error: rawError,
      }),
    );

    errorSpy.mockRestore();
  });

  it('returns empty array for empty grade ids list', async () => {
    const result = await listActiveStudentsByGradeIds([]);
    expect(hoisted.getFullList).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('lists active students filtered by grade ids', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 's1',
        name: 'Ana',
        grade_id: 'g1',
        date_of_birth: '2015-06-15 13:30:00.000Z',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: 20.5,
        height: 115,
        blood_type: 'O+',
        social_security: 'SSN-1',
        allergies: 'Ninguna',
        active: true,
        expand: {
          grade_id: { id: 'g1', name: 'Primero A' },
        },
      },
    ]);

    const result = await listActiveStudentsByGradeIds(['g1', 'g2']);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'active = true && (grade_id = "g1" || grade_id = "g2")',
      expand: 'grade_id',
      sort: 'name',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 's1', grade_id: 'g1', grade_name: 'Primero A' });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listActiveStudents()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });

  it('logs and ignores auto-cancelled errors', async () => {
    const rawError = new Error('aborted');
    const normalized = { message: 'aborted', status: null, isAbort: true };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await listActiveStudents();

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring PocketBase auto-cancelled request in listActiveStudents.',
      normalized,
    );

    warnSpy.mockRestore();
  });

  it('logs and ignores abort-like messages even when isAbort is false', async () => {
    const rawError = new Error('abort-like');
    const normalized = {
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: false,
    };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await listActiveStudents();

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring PocketBase auto-cancelled request in listActiveStudents.',
      normalized,
    );

    warnSpy.mockRestore();
  });
});
