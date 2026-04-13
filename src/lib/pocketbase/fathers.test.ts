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
  const getAuthenticatedPb = vi.fn();

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
  listStudentNamesByFatherIds: hoisted.listStudentNamesByFatherIds,
}));

describe('fathers pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthenticatedPb.mockResolvedValue(hoisted.pb);
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
          user_id: 'u1',
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
      userId: 'u1',
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
        user_id: '',
      },
      {
        id: 'f2',
        full_name: 'Inactivo',
        document_id: '54321',
        is_active: false,
        user_id: null,
      },
    ]);
    hoisted.listStudentNamesByFatherIds.mockResolvedValue({ f1: ['Ana'] });

    const result = await listActiveFathers();

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      sort: 'full_name',
      filter: 'is_active != false',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'f1', student_names: ['Ana'], userId: null });
  });

  it('lists active fathers without student-name enrichment when requested', async () => {
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
        user_id: 'u2',
      },
    ]);

    const result = await listActiveFathers({ includeStudentNames: false });

    expect(hoisted.listStudentNamesByFatherIds).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        id: 'f1',
        full_name: 'Carlos Perez',
        student_names: [],
        userId: 'u2',
      }),
    ]);
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
      user_id: 'u3',
    });
    hoisted.listStudentNamesByFatherIds.mockResolvedValue({ f1: ['Ana'] });

    const result = await getFatherById('f1');

    expect(hoisted.getOne).toHaveBeenCalledWith('f1');
    expect(result.student_names).toEqual(['Ana']);
    expect(result.userId).toBe('u3');
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
      user_id: 'u4',
    });

    await createFather({
      full_name: 'Carlos Perez',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
      userId: 'u4',
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
      user_id: 'u4',
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
      user_id: 'u4',
    });

    await updateFather('f1', {
      full_name: 'Carlos P',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
      userId: 'u4',
    });

    expect(hoisted.update).toHaveBeenCalledWith('f1', {
      full_name: 'Carlos P',
      document_id: '12345',
      phone_number: '300',
      occupation: '',
      company: '',
      email: '',
      address: '',
      user_id: 'u4',
    });

    await deactivateFather('f1');
    expect(hoisted.update).toHaveBeenLastCalledWith('f1', { is_active: false });
  });

  it('does not clear user_id when update input omits userId', async () => {
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
      user_id: 'u4',
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
