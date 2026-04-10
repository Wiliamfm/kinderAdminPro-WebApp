import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitPublicRegistration } from './public-registration';

const hoisted = vi.hoisted(() => {
  const publicCreateFather = vi.fn();
  const publicCreateStudent = vi.fn();
  const publicCreateStudentFatherLink = vi.fn();
  const authWithPassword = vi.fn();
  const deleteStudent = vi.fn();
  const deleteFather = vi.fn();
  const normalizePocketBaseError = vi.fn((error: unknown) => error);
  const createServerPocketBase = vi.fn(() => ({
    collection: vi.fn((name: string) => {
      if (name === '_superusers') {
        return { authWithPassword };
      }
      if (name === 'students') {
        return { delete: deleteStudent };
      }
      if (name === 'fathers') {
        return { delete: deleteFather };
      }
      throw new Error(`Unexpected collection ${name}`);
    }),
  }));

  return {
    publicCreateFather,
    publicCreateStudent,
    publicCreateStudentFatherLink,
    authWithPassword,
    deleteStudent,
    deleteFather,
    normalizePocketBaseError,
    createServerPocketBase,
  };
});

vi.mock('./public-fathers', () => ({
  publicCreateFather: hoisted.publicCreateFather,
}));

vi.mock('./public-students', () => ({
  publicCreateStudent: hoisted.publicCreateStudent,
}));

vi.mock('./public-students-fathers', () => ({
  publicCreateStudentFatherLink: hoisted.publicCreateStudentFatherLink,
}));

vi.mock('../server/auth-session', () => ({
  createServerPocketBase: hoisted.createServerPocketBase,
}));

vi.mock('./errors', () => ({
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('submitPublicRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BASE_ADMIN_EMAIL = 'admin@example.com';
    process.env.BASE_ADMIN_PASSWORD = 'secret';
    hoisted.publicCreateFather.mockResolvedValue({ id: 'f1' });
    hoisted.publicCreateStudent.mockResolvedValue({ id: 's1' });
    hoisted.publicCreateStudentFatherLink.mockResolvedValue({ id: 'l1' });
    hoisted.authWithPassword.mockResolvedValue({});
    hoisted.deleteStudent.mockResolvedValue(undefined);
    hoisted.deleteFather.mockResolvedValue(undefined);
  });

  it('creates father, student, and link in order', async () => {
    await submitPublicRegistration({
      father: {
        full_name: 'Laura Perez',
        document_id: '9001',
        phone_number: '3001234567',
        occupation: 'Ingeniera',
        company: 'ACME',
        email: 'laura@example.com',
        address: 'Calle 1',
      },
      student: {
        name: 'Ana Perez',
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
      },
      relationship: 'mother',
    });

    expect(hoisted.publicCreateFather.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.publicCreateStudent.mock.invocationCallOrder[0],
    );
    expect(hoisted.publicCreateStudent.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.publicCreateStudentFatherLink.mock.invocationCallOrder[0],
    );
    expect(hoisted.publicCreateStudentFatherLink).toHaveBeenCalledWith('s1', 'f1', 'mother');
    expect(hoisted.authWithPassword).not.toHaveBeenCalled();
  });

  it('rolls back created records with superuser auth when link creation fails', async () => {
    hoisted.publicCreateStudentFatherLink.mockRejectedValue(new Error('link failed'));

    await expect(
      submitPublicRegistration({
        father: {
          full_name: 'Laura Perez',
          document_id: '9001',
          phone_number: '3001234567',
          occupation: 'Ingeniera',
          company: 'ACME',
          email: 'laura@example.com',
          address: 'Calle 1',
        },
        student: {
          name: 'Ana Perez',
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
        },
        relationship: 'mother',
      }),
    ).rejects.toMatchObject({ message: 'link failed' });

    expect(hoisted.authWithPassword).toHaveBeenCalledWith('admin@example.com', 'secret');
    expect(hoisted.deleteStudent).toHaveBeenCalledWith('s1');
    expect(hoisted.deleteFather).toHaveBeenCalledWith('f1');
  });
});
