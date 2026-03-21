import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteEventAssignmentsByEventId,
  listEventAssignmentsByEventIds,
  syncEventAssignments,
} from './event-assignments';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const create = vi.fn();
  const del = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      create,
      delete: del,
    })),
  };

  return {
    getFullList,
    create,
    del,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('event-assignments pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists assignments for multiple events with employee expansion', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'a1',
        event_id: 'evt1',
        employee_id: 'emp1',
        expand: {
          employee_id: {
            name: 'Ana Gomez',
            active: true,
          },
        },
      },
    ]);

    const result = await listEventAssignmentsByEventIds(['evt1', 'evt2']);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'event_id = "evt1" || event_id = "evt2"',
      expand: 'employee_id',
      sort: 'created_at,id',
      requestKey: 'event-assignments-evt1,evt2',
    });
    expect(result).toEqual([
      {
        id: 'a1',
        eventId: 'evt1',
        employeeId: 'emp1',
        employeeName: 'Ana Gomez',
        employeeActive: true,
      },
    ]);
  });

  it('returns an empty list when no event ids are provided', async () => {
    expect(await listEventAssignmentsByEventIds([])).toEqual([]);
    expect(hoisted.getFullList).not.toHaveBeenCalled();
  });

  it('syncs assignment links by creating missing and deleting stale records', async () => {
    hoisted.getFullList.mockResolvedValueOnce([
      { id: 'a1', employee_id: 'emp1' },
      { id: 'a2', employee_id: 'emp2' },
    ]);

    await syncEventAssignments('evt1', ['emp2', 'emp3', 'emp3']);

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'event_id = "evt1"',
      fields: 'id,employee_id',
      sort: 'created_at,id',
    });
    expect(hoisted.create).toHaveBeenCalledWith({
      event_id: 'evt1',
      employee_id: 'emp3',
    });
    expect(hoisted.del).toHaveBeenCalledWith('a1');
  });

  it('allows removing all assignees by deleting existing links', async () => {
    hoisted.getFullList.mockResolvedValueOnce([
      { id: 'a1', employee_id: 'emp1' },
    ]);

    await syncEventAssignments('evt1', []);

    expect(hoisted.del).toHaveBeenCalledWith('a1');
    expect(hoisted.create).not.toHaveBeenCalled();
  });

  it('throws when the event id is missing', async () => {
    await expect(syncEventAssignments('  ', ['emp1'])).rejects.toThrow('El evento es obligatorio');
  });

  it('deletes all assignments for an event id', async () => {
    hoisted.getFullList.mockResolvedValueOnce([
      { id: 'a1' },
      { id: 'a2' },
    ]);

    await deleteEventAssignmentsByEventId(' evt1 ');

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      filter: 'event_id = "evt1"',
      fields: 'id',
      sort: 'created_at,id',
    });
    expect(hoisted.del).toHaveBeenCalledWith('a1');
    expect(hoisted.del).toHaveBeenCalledWith('a2');
  });

  it('allows deleting assignments when there are no rows', async () => {
    hoisted.getFullList.mockResolvedValueOnce([]);

    await deleteEventAssignmentsByEventId('evt1');

    expect(hoisted.del).not.toHaveBeenCalled();
  });

  it('throws when delete assignments event id is missing', async () => {
    await expect(deleteEventAssignmentsByEventId('  ')).rejects.toThrow('El evento es obligatorio');
  });

  it('normalizes errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(syncEventAssignments('evt1', ['emp1'])).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
