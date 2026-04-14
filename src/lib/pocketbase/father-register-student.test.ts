import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkFatherStudentDocumentIdAvailable,
  registerFatherStudent,
} from './father-register-student';

const hoisted = vi.hoisted(() => {
  const getFatherList = vi.fn();
  const getStudentList = vi.fn();
  const createStudent = vi.fn();
  const createStudentFatherLink = vi.fn();
  const deleteStudent = vi.fn();
  const requireModuleAccess = vi.fn();
  const getAuthenticatedPbWithUserId = vi.fn();

  const pb = {
    collection: vi.fn((name: string) => {
      if (name === 'fathers') {
        return { getList: getFatherList };
      }

      if (name === 'students') {
        return {
          getList: getStudentList,
          create: createStudent,
          delete: deleteStudent,
        };
      }

      if (name === 'students_fathers') {
        return {
          create: createStudentFatherLink,
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    }),
  };

  return {
    createStudent,
    createStudentFatherLink,
    deleteStudent,
    getAuthenticatedPbWithUserId,
    getFatherList,
    getStudentList,
    pb,
    requireModuleAccess,
  };
});

vi.mock('../server/get-authenticated-pb', () => ({
  getAuthenticatedPbWithUserId: hoisted.getAuthenticatedPbWithUserId,
}));

vi.mock('../server/require-module-access', () => ({
  requireModuleAccess: hoisted.requireModuleAccess,
}));

describe('father-register-student', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireModuleAccess.mockResolvedValue(undefined);
    hoisted.getAuthenticatedPbWithUserId.mockResolvedValue({ pb: hoisted.pb, userId: 'u1' });
    hoisted.getFatherList.mockResolvedValue({ totalItems: 1, items: [{ id: 'f1' }] });
    hoisted.getStudentList.mockResolvedValue({ totalItems: 0, items: [] });
    hoisted.deleteStudent.mockResolvedValue(undefined);
    hoisted.createStudent.mockResolvedValue({
      id: 's1',
      name: 'Ana Pérez',
      grade_id: 'g1',
      date_of_birth: '2016-01-10T13:30:00.000Z',
      birth_place: 'Bogotá',
      department: 'Cundinamarca',
      document_id: '1001',
      weight: 20.5,
      height: 115,
      blood_type: 'O+',
      social_security: 'EPS',
      allergies: 'Ninguna',
      active: true,
      accepted: false,
    });
    hoisted.createStudentFatherLink.mockResolvedValue({ id: 'l1' });
  });

  it('creates a pending student linked to the authenticated father', async () => {
    const result = await registerFatherStudent({
      student: {
        name: 'Ana Pérez',
        grade_id: 'g1',
        date_of_birth: '2016-01-10T13:30:00.000Z',
        birth_place: 'Bogotá',
        department: 'Cundinamarca',
        document_id: '1001',
        weight: 20.5,
        height: 115,
        blood_type: 'O+',
        social_security: 'EPS',
        allergies: 'Ninguna',
      },
      relationship: 'mother',
    });

    expect(hoisted.requireModuleAccess).toHaveBeenCalledWith('father-portal');
    expect(hoisted.getFatherList).toHaveBeenCalledWith(1, 1, {
      filter: 'user_id = "u1"',
      fields: 'id',
      requestKey: 'father-register-student-father-u1',
    });
    expect(hoisted.getStudentList).toHaveBeenCalledWith(1, 1, {
      filter: 'document_id = "1001"',
      fields: 'id',
      requestKey: 'father-register-student-document-1001',
    });
    expect(hoisted.createStudent).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      grade_id: 'g1',
      date_of_birth: '2016-01-10T13:30:00.000Z',
      birth_place: 'Bogotá',
      department: 'Cundinamarca',
      document_id: '1001',
      weight: 20.5,
      height: 115,
      blood_type: 'O+',
      social_security: 'EPS',
      allergies: 'Ninguna',
      active: true,
      accepted: false,
    });
    expect(hoisted.createStudentFatherLink).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f1',
      relationship: 'mother',
    });
    expect(result).toEqual(expect.objectContaining({
      id: 's1',
      name: 'Ana Pérez',
      document_id: '1001',
      active: true,
    }));
  });

  it('rejects duplicated document ids before creating the student', async () => {
    hoisted.getStudentList.mockResolvedValue({ totalItems: 1, items: [{ id: 's-existing' }] });

    await expect(registerFatherStudent({
      student: {
        name: 'Ana Pérez',
        grade_id: 'g1',
        date_of_birth: '2016-01-10T13:30:00.000Z',
        birth_place: 'Bogotá',
        department: 'Cundinamarca',
        document_id: '1001',
        weight: null,
        height: null,
        blood_type: 'O+',
        social_security: '',
        allergies: '',
      },
      relationship: 'father',
    })).rejects.toMatchObject({
      message: 'Ya existe un estudiante con este documento',
      status: 400,
    });

    expect(hoisted.createStudent).not.toHaveBeenCalled();
    expect(hoisted.createStudentFatherLink).not.toHaveBeenCalled();
  });

  it('rolls back the student when creating the link fails', async () => {
    hoisted.createStudentFatherLink.mockRejectedValue(new Error('link failed'));

    await expect(registerFatherStudent({
      student: {
        name: 'Ana Pérez',
        grade_id: 'g1',
        date_of_birth: '2016-01-10T13:30:00.000Z',
        birth_place: 'Bogotá',
        department: 'Cundinamarca',
        document_id: '1001',
        weight: null,
        height: null,
        blood_type: 'O+',
        social_security: '',
        allergies: '',
      },
      relationship: 'father',
    })).rejects.toMatchObject({
      message: 'link failed',
    });

    expect(hoisted.deleteStudent).toHaveBeenCalledWith('s1');
  });

  it('reports duplicate-document availability for blur validation', async () => {
    hoisted.getStudentList.mockResolvedValue({ totalItems: 1, items: [{ id: 's-existing' }] });

    const available = await checkFatherStudentDocumentIdAvailable('1001');

    expect(available).toBe(false);
  });
});
