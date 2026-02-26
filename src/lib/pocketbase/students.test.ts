import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStudent,
  deactivateStudent,
  getStudentById,
  listActiveStudents,
  updateStudent,
} from './students';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      getOne,
      create,
      update,
    })),
  };

  return {
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

describe('students pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists active students and maps fields', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 's1',
        name: 'Ana',
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
      },
      {
        id: 's2',
        name: 'Luis',
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
      },
    ]);

    const result = await listActiveStudents();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 's1',
      name: 'Ana',
      document_id: 'DOC-1',
      active: true,
    });
  });

  it('gets student by id', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 's1',
      name: 'Ana',
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
    });

    const result = await getStudentById('s1');

    expect(hoisted.getOne).toHaveBeenCalledWith('s1');
    expect(result.id).toBe('s1');
    expect(result.name).toBe('Ana');
  });

  it('creates student with active=true', async () => {
    hoisted.create.mockResolvedValue({
      id: 's3',
      name: 'Sofia',
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
    });

    await createStudent({
      name: 'Sofia',
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

    expect(hoisted.create).toHaveBeenCalledWith({
      name: 'Sofia',
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
    });
  });

  it('updates and deactivates students', async () => {
    hoisted.update.mockResolvedValue({
      id: 's1',
      name: 'Ana Maria',
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
    });

    const updated = await updateStudent('s1', {
      name: 'Ana Maria',
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

    expect(hoisted.update).toHaveBeenCalledWith('s1', {
      name: 'Ana Maria',
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
    expect(updated.name).toBe('Ana Maria');

    await deactivateStudent('s1');
    expect(hoisted.update).toHaveBeenLastCalledWith('s1', { active: false });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listActiveStudents()).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
