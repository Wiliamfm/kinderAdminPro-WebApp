import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  countLinksByFatherId,
  countLinksByStudentId,
  createLinksForFather,
  createLinksForStudent,
  listFatherNamesByStudentIds,
  listLinksByFatherId,
  listLinksByStudentId,
  listStudentNamesByFatherIds,
  replaceLinksForFather,
  replaceLinksForStudent,
} from './students-fathers';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const getList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const deleteRecord = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      getList,
      create,
      update,
      delete: deleteRecord,
    })),
  };

  return {
    getFullList,
    getList,
    create,
    update,
    deleteRecord,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('students_fathers pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.normalizePocketBaseError.mockImplementation((error: unknown) => error);
    hoisted.create.mockImplementation(async (payload: Record<string, unknown>) => ({
      id: `${String(payload.student_id)}-${String(payload.father_id)}`,
    }));
    hoisted.update.mockResolvedValue({});
    hoisted.deleteRecord.mockResolvedValue(undefined);
  });

  it('lists student links with expanded names', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'l1',
        student_id: 's1',
        father_id: 'f1',
        relationship: 'father',
        expand: {
          student_id: { id: 's1', name: 'Ana', active: true },
          father_id: { id: 'f1', full_name: 'Carlos', is_active: true },
        },
      },
    ]);

    const result = await listLinksByStudentId('s1');

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'student_id = "s1"',
      expand: 'student_id,father_id',
      sort: 'created_at,id',
      requestKey: 'students-fathers-links-student-s1',
    });
    expect(result[0]).toMatchObject({
      id: 'l1',
      studentId: 's1',
      fatherId: 'f1',
      relationship: 'father',
      studentName: 'Ana',
      fatherName: 'Carlos',
    });
  });

  it('collects active father names by student ids', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'l1',
        student_id: 's1',
        father_id: 'f1',
        expand: {
          father_id: { full_name: 'Carlos', is_active: true },
        },
      },
      {
        id: 'l2',
        student_id: 's1',
        father_id: 'f2',
        expand: {
          father_id: { full_name: 'Inactivo', is_active: false },
        },
      },
    ]);

    const map = await listFatherNamesByStudentIds(['s1']);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'student_id = "s1"',
      expand: 'father_id',
      sort: 'created_at,id',
      fields: 'id,student_id,father_id,expand.father_id.full_name,expand.father_id.is_active',
    });
    expect(map).toEqual({ s1: ['Carlos'] });
  });

  it('collects active student names by father ids', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'l1',
        father_id: 'f1',
        student_id: 's1',
        expand: {
          student_id: { name: 'Ana', active: true },
        },
      },
      {
        id: 'l2',
        father_id: 'f1',
        student_id: 's2',
        expand: {
          student_id: { name: 'Inactivo', active: false },
        },
      },
    ]);

    const map = await listStudentNamesByFatherIds(['f1']);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'father_id = "f1"',
      expand: 'student_id',
      sort: 'created_at,id',
      fields: 'id,father_id,student_id,expand.student_id.name,expand.student_id.active',
    });
    expect(map).toEqual({ f1: ['Ana'] });
  });

  it('creates student links sequentially', async () => {
    await createLinksForStudent('s1', [{ fatherId: 'f1', relationship: 'father' }]);

    expect(hoisted.create).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f1',
      relationship: 'father',
    });
  });

  it('rolls back created links when student link creation fails', async () => {
    hoisted.create
      .mockResolvedValueOnce({ id: 'l1' })
      .mockRejectedValueOnce(new Error('fail second'));

    await expect(createLinksForStudent('s1', [
      { fatherId: 'f1', relationship: 'father' },
      { fatherId: 'f2', relationship: 'mother' },
    ])).rejects.toMatchObject({ message: 'fail second' });

    expect(hoisted.deleteRecord).toHaveBeenCalledWith('l1');
  });

  it('creates father links sequentially', async () => {
    await createLinksForFather('f1', [{ studentId: 's1', relationship: 'father' }]);

    expect(hoisted.create).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f1',
      relationship: 'father',
    });
  });

  it('replaces student links with create/update/delete operations', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'l1', father_id: 'f1', relationship: 'father' },
      { id: 'l2', father_id: 'f2', relationship: 'mother' },
    ]);

    await replaceLinksForStudent('s1', [
      { fatherId: 'f1', relationship: 'mother' },
      { fatherId: 'f3', relationship: 'father' },
    ]);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'student_id = "s1"',
      sort: 'created_at,id',
      fields: 'id,father_id,relationship',
    });
    expect(hoisted.update).toHaveBeenCalledWith('l1', { relationship: 'mother' });
    expect(hoisted.create).toHaveBeenCalledWith({
      student_id: 's1',
      father_id: 'f3',
      relationship: 'father',
    });
    expect(hoisted.deleteRecord).toHaveBeenCalledWith('l2');
  });

  it('replaces father links with create/update/delete operations', async () => {
    hoisted.getFullList.mockResolvedValue([
      { id: 'l1', student_id: 's1', relationship: 'father' },
      { id: 'l2', student_id: 's2', relationship: 'mother' },
    ]);

    await replaceLinksForFather('f1', [
      { studentId: 's1', relationship: 'mother' },
      { studentId: 's3', relationship: 'father' },
    ]);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'father_id = "f1"',
      sort: 'created_at,id',
      fields: 'id,student_id,relationship',
    });
    expect(hoisted.update).toHaveBeenCalledWith('l1', { relationship: 'mother' });
    expect(hoisted.create).toHaveBeenCalledWith({
      student_id: 's3',
      father_id: 'f1',
      relationship: 'father',
    });
    expect(hoisted.deleteRecord).toHaveBeenCalledWith('l2');
  });

  it('counts links by father id', async () => {
    hoisted.getList.mockResolvedValue({ totalItems: 3 });

    const total = await countLinksByFatherId('f1');

    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'father_id = "f1"',
      sort: 'created_at,id',
    });
    expect(total).toBe(3);
  });

  it('counts links by student id', async () => {
    hoisted.getList.mockResolvedValue({ totalItems: 2 });

    const total = await countLinksByStudentId('s1');

    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'student_id = "s1"',
      sort: 'created_at,id',
    });
    expect(total).toBe(2);
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listLinksByStudentId('s1')).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });

  it('returns empty links when list-by-student request is auto-cancelled', async () => {
    const rawError = new Error('aborted');
    const normalized = {
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: false,
    };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await listLinksByStudentId('s1');

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring PocketBase auto-cancelled request in listLinksByStudentId.',
      normalized,
    );
    warnSpy.mockRestore();
  });

  it('returns empty links when list-by-father request is auto-cancelled', async () => {
    const rawError = new Error('aborted');
    const normalized = {
      message: 'request was aborted',
      status: null,
      isAbort: true,
    };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await listLinksByFatherId('f1');

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring PocketBase auto-cancelled request in listLinksByFatherId.',
      normalized,
    );
    warnSpy.mockRestore();
  });

  it('normalizes and rethrows non-abort errors for list-by-father', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listLinksByFatherId('f1')).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });

  it('normalizes and rethrows errors for count-by-student', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(countLinksByStudentId('s1')).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
