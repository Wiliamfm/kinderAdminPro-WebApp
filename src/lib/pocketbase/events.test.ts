import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEventsInRange,
  softDeleteCalendarEvent,
  updateCalendarEvent,
} from './events';

const hoisted = vi.hoisted(() => {
  const getFullList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getAuthUserId = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getFullList,
      create,
      update,
      delete: del,
    })),
  };

  return {
    getFullList,
    create,
    update,
    del,
    normalizePocketBaseError,
    getAuthUserId,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

vi.mock('./users', () => ({
  getAuthUserId: hoisted.getAuthUserId,
}));

describe('events pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockReturnValue('u-admin');
  });

  it('lists non-deleted events that overlap the requested range', async () => {
    hoisted.getFullList.mockResolvedValue([
      {
        id: 'evt1',
        title: 'Reunión general',
        description: 'Seguimiento semanal',
        start_datetime: '2026-04-10 14:00:00.000Z',
        end_datetime: '2026-04-10 15:00:00.000Z',
        is_all_day: false,
        kind: 'event',
        status: 'planned',
        created_by: 'u1',
        updated_by: 'u2',
        created_at: '2026-04-01T12:00:00.000Z',
        updated_at: '2026-04-02T12:00:00.000Z',
        is_deleted: false,
      },
    ]);

    const result = await listCalendarEventsInRange(
      '2026-04-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
    );

    expect(hoisted.getFullList).toHaveBeenCalledWith({
      sort: 'start_datetime',
      filter: 'is_deleted != true && start_datetime < "2026-05-01T00:00:00.000Z" && end_datetime > "2026-04-01T00:00:00.000Z"',
      requestKey: 'events-range-2026-04-01T00:00:00.000Z-2026-05-01T00:00:00.000Z',
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 'evt1',
        title: 'Reunión general',
        startDateTime: '2026-04-10T14:00:00.000Z',
        endDateTime: '2026-04-10T15:00:00.000Z',
        kind: 'event',
        status: 'planned',
      }),
    ]);
  });

  it('returns an empty list when the requested range is incomplete', async () => {
    expect(await listCalendarEventsInRange('', '2026-05-01T00:00:00.000Z')).toEqual([]);
    expect(hoisted.getFullList).not.toHaveBeenCalled();
  });

  it('creates calendar events with audit metadata', async () => {
    hoisted.create.mockResolvedValue({
      id: 'evt1',
      title: 'Tarea',
      description: 'Preparar salón',
      start_datetime: '2026-04-10T14:00:00.000Z',
      end_datetime: '2026-04-10T15:00:00.000Z',
      is_all_day: false,
      kind: 'task',
      status: 'planned',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      created_at: '2026-04-01T12:00:00.000Z',
      updated_at: '2026-04-01T12:00:00.000Z',
      is_deleted: false,
    });

    await createCalendarEvent({
      title: ' Tarea ',
      description: ' Preparar salón ',
      startDateTime: '2026-04-10T14:00:00.000Z',
      endDateTime: '2026-04-10T15:00:00.000Z',
      isAllDay: false,
      kind: 'task',
      status: 'planned',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      title: 'Tarea',
      description: 'Preparar salón',
      start_datetime: '2026-04-10T14:00:00.000Z',
      end_datetime: '2026-04-10T15:00:00.000Z',
      is_all_day: false,
      kind: 'task',
      status: 'planned',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      is_deleted: false,
    });
  });

  it('updates events and refreshes updated_by', async () => {
    hoisted.update.mockResolvedValue({
      id: 'evt1',
      title: 'Evento actualizado',
      description: '',
      start_datetime: '2026-04-11T14:00:00.000Z',
      end_datetime: '2026-04-11T16:00:00.000Z',
      is_all_day: true,
      kind: 'event',
      status: 'done',
      created_by: 'u-admin',
      updated_by: 'u-admin',
      created_at: '2026-04-01T12:00:00.000Z',
      updated_at: '2026-04-02T12:00:00.000Z',
      is_deleted: false,
    });

    await updateCalendarEvent('evt1', {
      title: ' Evento actualizado ',
      description: ' ',
      startDateTime: '2026-04-11T14:00:00.000Z',
      endDateTime: '2026-04-11T16:00:00.000Z',
      isAllDay: true,
      kind: 'event',
      status: 'done',
    });

    expect(hoisted.update).toHaveBeenCalledWith('evt1', {
      title: 'Evento actualizado',
      description: '',
      start_datetime: '2026-04-11T14:00:00.000Z',
      end_datetime: '2026-04-11T16:00:00.000Z',
      is_all_day: true,
      kind: 'event',
      status: 'done',
      updated_by: 'u-admin',
    });
  });

  it('soft deletes calendar events', async () => {
    await softDeleteCalendarEvent('evt1');

    expect(hoisted.update).toHaveBeenCalledWith('evt1', {
      is_deleted: true,
      updated_by: 'u-admin',
    });
  });

  it('hard deletes calendar events', async () => {
    await deleteCalendarEvent(' evt1 ');

    expect(hoisted.del).toHaveBeenCalledWith('evt1');
  });

  it('throws when hard delete event id is missing', async () => {
    await expect(deleteCalendarEvent('   ')).rejects.toThrow('El evento es obligatorio');
  });

  it('throws when there is no authenticated user', async () => {
    hoisted.getAuthUserId.mockReturnValue(null);

    await expect(createCalendarEvent({
      title: 'Evento',
      startDateTime: '2026-04-10T14:00:00.000Z',
      endDateTime: '2026-04-10T15:00:00.000Z',
      isAllDay: false,
      kind: 'event',
      status: 'planned',
    })).rejects.toThrow('No hay usuario autenticado');
  });

  it('normalizes errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getFullList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(
      listCalendarEventsInRange('2026-04-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
    ).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
