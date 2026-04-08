import { getAuthenticatedPb, getAuthenticatedPbWithUserId } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';

export const CALENDAR_EVENT_KINDS = ['event', 'task'] as const;
export type CalendarEventKind = (typeof CALENDAR_EVENT_KINDS)[number];

export const CALENDAR_EVENT_STATUSES = ['planned', 'done', 'cancelled'] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];

export type CalendarEventRecord = {
  id: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  kind: CalendarEventKind;
  status: CalendarEventStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
};

export type CalendarEventCreateInput = {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  isAllDay: boolean;
  kind: CalendarEventKind;
  status: CalendarEventStatus;
};

export type CalendarEventUpdateInput = CalendarEventCreateInput;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function normalizeDateTimeInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(trimmed)) {
    return trimmed.replace(' ', 'T');
  }

  return trimmed;
}

function toEventKind(value: unknown): CalendarEventKind {
  const normalized = toStringValue(value);
  return normalized === 'task' ? 'task' : 'event';
}

function toEventStatus(value: unknown): CalendarEventStatus {
  const normalized = toStringValue(value);
  if (normalized === 'done' || normalized === 'cancelled') {
    return normalized;
  }

  return 'planned';
}

function mapCalendarEventRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): CalendarEventRecord {
  return {
    id: record.id,
    title: toStringValue(record.get?.('title') ?? record.title),
    description: toStringValue(record.get?.('description') ?? record.description),
    startDateTime: normalizeDateTimeInput(
      toStringValue(record.get?.('start_datetime') ?? record.start_datetime),
    ),
    endDateTime: normalizeDateTimeInput(
      toStringValue(record.get?.('end_datetime') ?? record.end_datetime),
    ),
    isAllDay: toBooleanValue(record.get?.('is_all_day') ?? record.is_all_day),
    kind: toEventKind(record.get?.('kind') ?? record.kind),
    status: toEventStatus(record.get?.('status') ?? record.status),
    createdBy: toStringValue(record.get?.('created_by') ?? record.created_by),
    updatedBy: toStringValue(record.get?.('updated_by') ?? record.updated_by),
    createdAt: normalizeDateTimeInput(toStringValue(record.get?.('created_at') ?? record.created_at)),
    updatedAt: normalizeDateTimeInput(toStringValue(record.get?.('updated_at') ?? record.updated_at)),
    isDeleted: toBooleanValue(record.get?.('is_deleted') ?? record.is_deleted),
  };
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildPayload(payload: CalendarEventCreateInput | CalendarEventUpdateInput) {
  return {
    title: payload.title.trim(),
    description: payload.description?.trim() ?? '',
    start_datetime: normalizeDateTimeInput(payload.startDateTime),
    end_datetime: normalizeDateTimeInput(payload.endDateTime),
    is_all_day: payload.isAllDay,
    kind: payload.kind,
    status: payload.status,
  };
}

export async function listCalendarEventsInRange(
  startDateTime: string,
  endDateTime: string,
): Promise<CalendarEventRecord[]> {
  "use server";
  const normalizedStart = normalizeDateTimeInput(startDateTime);
  const normalizedEnd = normalizeDateTimeInput(endDateTime);

  if (!normalizedStart || !normalizedEnd) {
    return [];
  }

  const pb = await getAuthenticatedPb();

  try {
    const records = await pb.collection('events').getFullList({
      sort: 'start_datetime',
      filter:
        `is_deleted != true && start_datetime < "${escapeFilterValue(normalizedEnd)}"` +
        ` && end_datetime > "${escapeFilterValue(normalizedStart)}"`,
      requestKey: `events-range-${normalizedStart}-${normalizedEnd}`,
    });

    return records.map((record) => mapCalendarEventRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createCalendarEvent(
  payload: CalendarEventCreateInput,
): Promise<CalendarEventRecord> {
  "use server";
  const { pb, userId: authUserId } = await getAuthenticatedPbWithUserId();

  try {
    const record = await pb.collection('events').create({
      ...buildPayload(payload),
      created_by: authUserId,
      updated_by: authUserId,
      is_deleted: false,
    });

    return mapCalendarEventRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateCalendarEvent(
  id: string,
  payload: CalendarEventUpdateInput,
): Promise<CalendarEventRecord> {
  "use server";
  const { pb, userId: authUserId } = await getAuthenticatedPbWithUserId();

  try {
    const record = await pb.collection('events').update(id, {
      ...buildPayload(payload),
      updated_by: authUserId,
    });

    return mapCalendarEventRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function softDeleteCalendarEvent(id: string): Promise<void> {
  "use server";
  const { pb, userId: authUserId } = await getAuthenticatedPbWithUserId();

  try {
    await pb.collection('events').update(id, {
      is_deleted: true,
      updated_by: authUserId,
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  "use server";
  const normalizedId = id.trim();
  if (!normalizedId) {
    throw new Error('El evento es obligatorio para eliminarlo.');
  }

  const pb = await getAuthenticatedPb();

  try {
    await pb.collection('events').delete(normalizedId);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
