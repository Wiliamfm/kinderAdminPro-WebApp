import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEmployeeLeave,
  hasLeaveOverlap,
  listEmployeeLeaves,
  updateEmployeeLeave,
} from './leaves';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const filter = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      create,
      update,
    })),
    filter,
  };

  return {
    getList,
    create,
    update,
    filter,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('leaves pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists employee leaves with descending sort and filter binding', async () => {
    hoisted.filter.mockReturnValue('employee = "e1"');
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'l1',
          employee: 'e1',
          start_datetime: '2026-02-01T10:00:00.000Z',
          end_datetime: '2026-02-01T12:00:00.000Z',
        },
      ],
      page: 2,
      perPage: 10,
      totalItems: 11,
      totalPages: 2,
    });

    const result = await listEmployeeLeaves('e1', 2, 10);

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.items[0]).toMatchObject({
      id: 'l1',
      employee: 'e1',
    });
    expect(hoisted.filter).toHaveBeenCalledWith('employee = {:employeeId}', {
      employeeId: 'e1',
    });
    expect(hoisted.getList).toHaveBeenCalledWith(2, 10, {
      sort: '-start_datetime',
      filter: 'employee = "e1"',
    });
  });

  it('creates a leave record', async () => {
    hoisted.create.mockResolvedValue({
      id: 'l2',
      employee: 'e1',
      start_datetime: '2026-02-02T10:00:00.000Z',
      end_datetime: '2026-02-02T12:00:00.000Z',
    });

    const payload = {
      employee: 'e1',
      start_datetime: '2026-02-02T10:00:00.000Z',
      end_datetime: '2026-02-02T12:00:00.000Z',
    };
    const result = await createEmployeeLeave(payload);

    expect(hoisted.create).toHaveBeenCalledWith(payload);
    expect(result.id).toBe('l2');
  });

  it('updates a leave record', async () => {
    hoisted.update.mockResolvedValue({
      id: 'l2',
      employee: 'e1',
      start_datetime: '2026-02-02T10:00:00.000Z',
      end_datetime: '2026-02-02T14:00:00.000Z',
    });

    const payload = {
      employee: 'e1',
      start_datetime: '2026-02-02T10:00:00.000Z',
      end_datetime: '2026-02-02T14:00:00.000Z',
    };
    const result = await updateEmployeeLeave('l2', payload);

    expect(hoisted.update).toHaveBeenCalledWith('l2', payload);
    expect(result.id).toBe('l2');
  });

  it('returns true when overlap exists', async () => {
    hoisted.filter.mockReturnValue('overlap-filter');
    hoisted.getList.mockResolvedValue({
      items: [{ id: 'x' }],
      page: 1,
      perPage: 1,
      totalItems: 1,
      totalPages: 1,
    });

    const result = await hasLeaveOverlap(
      'e1',
      '2026-02-10T08:00:00.000Z',
      '2026-02-10T10:00:00.000Z',
    );

    expect(result).toBe(true);
    expect(hoisted.getList).toHaveBeenCalledWith(1, 1, {
      filter: 'overlap-filter',
    });
  });

  it('adds exclude id to overlap filter when provided', async () => {
    hoisted.filter.mockReturnValue('overlap-filter-excluding-self');
    hoisted.getList.mockResolvedValue({
      items: [],
      page: 1,
      perPage: 1,
      totalItems: 0,
      totalPages: 1,
    });

    const result = await hasLeaveOverlap(
      'e1',
      '2026-02-10T08:00:00.000Z',
      '2026-02-10T10:00:00.000Z',
      'leave-1',
    );

    expect(result).toBe(false);
    expect(hoisted.filter).toHaveBeenCalledWith(
      'employee = {:employeeId} && start_datetime < {:endIso} && end_datetime > {:startIso} && id != {:excludeLeaveId}',
      {
        employeeId: 'e1',
        startIso: '2026-02-10T08:00:00.000Z',
        endIso: '2026-02-10T10:00:00.000Z',
        excludeLeaveId: 'leave-1',
      },
    );
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listEmployeeLeaves('e1', 1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
