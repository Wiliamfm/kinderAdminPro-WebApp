import { ClientResponseError } from 'pocketbase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publicCreateFather, publicCreateFatherUser } from './public-fathers';
import { listPublicGrades } from './public-grades';
import { publicCreateStudent } from './public-students';
import { publicCreateStudentFatherLink } from './public-students-fathers';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const create = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getPublicPb = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      create,
    })),
  };

  return {
    getFullList,
    create,
    normalizePocketBaseError,
    getPublicPb,
    pb,
  };
});

vi.mock('./public-client', () => ({
  getPublicPb: hoisted.getPublicPb,
}));

vi.mock('./errors', async () => {
  const actual = await vi.importActual<typeof import('./errors')>('./errors');
  return {
    ...actual,
    normalizePocketBaseError: hoisted.normalizePocketBaseError,
  };
});

describe('public registration pocketbase helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getPublicPb.mockReturnValue(hoisted.pb);
  });

  it('lists public grades sorted by name', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'g1', name: 'Primero A' },
      { id: 'g2', name: 'Segundo A' },
    ]);

    const result = await listPublicGrades();

    expect(hoisted.getFullList).toHaveBeenCalledWith({ sort: 'name' });
    expect(result).toEqual([
      { id: 'g1', name: 'Primero A' },
      { id: 'g2', name: 'Segundo A' },
    ]);
  });

  it('creates a public father with active flag enabled', async () => {
    hoisted.create.mockResolvedValue({
      id: 'f1',
      full_name: 'Laura Perez',
      document_id: '9001',
      phone_number: '3001234567',
      occupation: 'Ingeniera',
      company: 'ACME',
      email: 'laura@example.com',
      address: 'Calle 1',
      is_active: true,
    });

    await publicCreateFather({
      full_name: 'Laura Perez',
      document_id: '9001',
      phone_number: '3001234567',
      occupation: 'Ingeniera',
      company: 'ACME',
      email: 'laura@example.com',
      address: 'Calle 1',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      full_name: 'Laura Perez',
      document_id: '9001',
      phone_number: '3001234567',
      occupation: 'Ingeniera',
      company: 'ACME',
      email: 'laura@example.com',
      address: 'Calle 1',
      is_active: true,
    });
  });

  it('throws a contextual error when the public father email is already in use', async () => {
    const rawError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          email: {
            code: 'validation_not_unique',
            message: 'The email is already in use.',
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

    await expect(publicCreateFatherUser({
      email: 'laura@example.com',
      name: 'Laura Perez',
      password: 'Password123',
      passwordConfirm: 'Password123',
    })).rejects.toMatchObject({
      message: 'El correo electrónico ya está en uso',
      status: 400,
      isAbort: false,
    });
  });

  it('throws a contextual error when the public father document is duplicated', async () => {
    const rawError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          document_id: {
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

    await expect(publicCreateFather({
      full_name: 'Laura Perez',
      document_id: '9001',
      phone_number: '3001234567',
      occupation: 'Ingeniera',
      company: 'ACME',
      email: 'laura@example.com',
      address: 'Calle 1',
    })).rejects.toMatchObject({
      message: 'El documento ya está registrado',
      status: 400,
      isAbort: false,
    });
  });

  it('creates a public student with pending-approval flags', async () => {
    hoisted.create.mockResolvedValue({
      id: 's1',
      name: 'Ana',
      grade_id: 'g1',
      date_of_birth: '2016-01-10T13:30:00.000Z',
      birth_place: 'Bogota',
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

    await publicCreateStudent({
      name: 'Ana',
      grade_id: 'g1',
      date_of_birth: '2016-01-10T13:30:00.000Z',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: '1001',
      weight: 20.5,
      height: 115,
      blood_type: 'O+',
      social_security: 'EPS',
      allergies: 'Ninguna',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      name: 'Ana',
      grade_id: 'g1',
      date_of_birth: '2016-01-10T13:30:00.000Z',
      birth_place: 'Bogota',
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
  });

  it('throws a contextual error when the public student document is duplicated', async () => {
    const rawError = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          document_id: {
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

    await expect(publicCreateStudent({
      name: 'Ana',
      grade_id: 'g1',
      date_of_birth: '2016-01-10T13:30:00.000Z',
      birth_place: 'Bogota',
      department: 'Cundinamarca',
      document_id: '1001',
      weight: 20.5,
      height: 115,
      blood_type: 'O+',
      social_security: 'EPS',
      allergies: 'Ninguna',
    })).rejects.toMatchObject({
      message: 'El documento ya está registrado',
      status: 400,
      isAbort: false,
    });
  });

  it('creates a public student-father link', async () => {
    hoisted.create.mockResolvedValue({
      id: 'l1',
      student_id: 's1',
      father_id: 'f1',
      relationship: 'mother',
    });

    const result = await publicCreateStudentFatherLink('s1', 'f1', 'mother');

    expect(hoisted.create).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f1',
      relationship: 'mother',
    });
    expect(result).toMatchObject({
      id: 'l1',
      studentId: 's1',
      fatherId: 'f1',
      relationship: 'mother',
    });
  });
});
