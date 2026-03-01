import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFather,
  deactivateFather,
  getFatherById,
  listActiveFathers,
  listActiveFathersPage,
  updateFather,
} from './fathers';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getList = vi.fn();
  const getOne = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const deleteRecord = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const listStudentNamesByFatherIds = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      getList,
      getOne,
      create,
      update,
      delete: deleteRecord,
    })),
  };

  return {
    getFullList,
    getList,
    getOne,
    create,
    update,
    deleteRecord,
    normalizePocketBaseError,
    listStudentNamesByFatherIds,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

vi.mock('./students-fathers', () => ({
  listStudentNamesByFatherIds: hoisted.listStudentNamesByFatherIds,
}));

describe('fathers pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.listStudentNamesByFatherIds.mockResolvedValue({});
  });

  it('lists active fathers with associated student names', async () => {
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'f1',
          full_name: 'Carlos Perez',
          document_id: '12345',
          phone_number: '3001234567',
          occupation: 'Ingeniero',
          company: 'ACME',
          email: 'carlos@example.com',
          address: 'Calle 1',
          is_active: true,
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });
    hoisted.listStudentNamesByFatherIds.mockResolvedValue({ f1: ['Ana', 'Luis'] });

    const result = await listActiveFathersPage(1, 10, {
      sortField: 'document_id',
      sortDirection: 'asc',
    });

    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: 'document_id',
      filter: 'is_active != false',
    });
    expect(result.items[0]).toMatchObject({
      id: 'f1',
      full_name: 'Carlos Perez',
      student_names: ['Ana', 'Luis'],
      is_active: true,
    });
  });

  it('lists active fathers full list', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'f1',
        full_name: 'Carlos Perez',
        document_id: '12345',
        phone_number: '',
        occupation: '',
        company: '',
        email: '',
        address: '',
        is_active: true,
      },
      {
        id: 'f2',
        full_name: 'Inactivo',
        document_id: '54321',
        is_active: false,
      },
    ]);
    hoisted.listStudentNamesByFatherIds.mockResolvedValue({ f1: ['Ana'] });

    const result = await listActiveFathers();

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      sort: 'full_name',
      filter: 'is_active != false',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'f1', student_names: ['Ana'] });
  });

  it('gets one father', async () => {
    hoisted.getOne.mockResolvedValue({
      id: 'f1',
      full_name: 'Carlos Perez',
      document_id: '12345',
      phone_number: '300',
      occupation: 'Ing',
      company: 'ACME',
      email: 'carlos@example.com',
      address: 'Calle 1',
      is_active: true,
    });
    hoisted.listStudentNamesByFatherIds.mockResolvedValue({ f1: ['Ana'] });

    const result = await getFatherById('f1');

    expect(hoisted.getOne).toHaveBeenCalledWith('f1');
    expect(result.student_names).toEqual(['Ana']);
  });

  it('creates, updates and deactivates father', async () => {
    hoisted.create.mockResolvedValue({
      id: 'f1',
      full_name: 'Carlos Perez',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
      is_active: true,
    });

    await createFather({
      full_name: 'Carlos Perez',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      full_name: 'Carlos Perez',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
      is_active: true,
    });

    hoisted.update.mockResolvedValue({
      id: 'f1',
      full_name: 'Carlos P',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
      is_active: true,
    });

    await updateFather('f1', {
      full_name: 'Carlos P',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
    });

    expect(hoisted.update).toHaveBeenCalledWith('f1', {
      full_name: 'Carlos P',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
    });

    await deactivateFather('f1');
    expect(hoisted.update).toHaveBeenLastCalledWith('f1', { is_active: false });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listActiveFathersPage(1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
