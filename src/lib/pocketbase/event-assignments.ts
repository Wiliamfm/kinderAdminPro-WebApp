import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';

export type EventAssignmentRecord = {
  id: string;
  eventId: string;
  employeeId: string;
  employeeName: string;
  employeeActive: boolean;
};

const EVENT_ASSIGNMENTS_SORT = 'created_at,id';

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toActiveValue(value: unknown): boolean {
  return value !== false;
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function getExpandedEmployee(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const expanded = expand?.employee_id;

  if (Array.isArray(expanded)) {
    return (expanded[0] as Record<string, unknown>) ?? null;
  }

  if (expanded && typeof expanded === 'object') {
    return expanded as Record<string, unknown>;
  }

  return null;
}

function mapEventAssignmentRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EventAssignmentRecord {
  const expandedEmployee = getExpandedEmployee(record);

  return {
    id: record.id,
    eventId: toStringValue(record.get?.('event_id') ?? record.event_id),
    employeeId: toStringValue(record.get?.('employee_id') ?? record.employee_id),
    employeeName: toStringValue(expandedEmployee?.name),
    employeeActive: toActiveValue(expandedEmployee?.active),
  };
}

function normalizeIds(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

type ExistingAssignment = {
  id: string;
  employee_id: string;
};

export async function listEventAssignmentsByEventIds(
  eventIds: string[],
): Promise<EventAssignmentRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  const normalizedEventIds = normalizeIds(eventIds);
  if (normalizedEventIds.length === 0) {
    return [];
  }

  const filter = normalizedEventIds
    .map((eventId) => `event_id = "${escapeFilterValue(eventId)}"`)
    .join(' || ');

  try {
    const records = await pb.collection('event_assignments').getFullList({
      filter,
      expand: 'employee_id',
      sort: EVENT_ASSIGNMENTS_SORT,
      requestKey: `event-assignments-${normalizedEventIds.join(',')}`,
    });

    return records.map((record) => mapEventAssignmentRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function syncEventAssignments(eventId: string, employeeIds: string[]): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  const normalizedEventId = eventId.trim();
  if (!normalizedEventId) {
    throw new Error('El evento es obligatorio para sincronizar responsables.');
  }

  const normalizedEmployeeIds = normalizeIds(employeeIds);

  try {
    const existing = await pb.collection('event_assignments').getFullList<ExistingAssignment>({
      filter: `event_id = "${escapeFilterValue(normalizedEventId)}"`,
      fields: 'id,employee_id',
      sort: EVENT_ASSIGNMENTS_SORT,
    });

    const existingByEmployeeId = new Map(
      existing.map((record) => [toStringValue(record.employee_id), record]),
    );

    for (const employeeId of normalizedEmployeeIds) {
      if (!existingByEmployeeId.has(employeeId)) {
        await pb.collection('event_assignments').create({
          event_id: normalizedEventId,
          employee_id: employeeId,
        });
      }
    }

    for (const record of existing) {
      const existingEmployeeId = toStringValue(record.employee_id);
      if (!normalizedEmployeeIds.includes(existingEmployeeId)) {
        await pb.collection('event_assignments').delete(record.id);
      }
    }
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteEventAssignmentsByEventId(eventId: string): Promise<void> {
  "use server";
  const pb = await getAuthenticatedPb();
  const normalizedEventId = eventId.trim();
  if (!normalizedEventId) {
    throw new Error('El evento es obligatorio para eliminar responsables.');
  }

  try {
    const existing = await pb.collection('event_assignments').getFullList<ExistingAssignment>({
      filter: `event_id = "${escapeFilterValue(normalizedEventId)}"`,
      fields: 'id',
      sort: EVENT_ASSIGNMENTS_SORT,
    });

    for (const record of existing) {
      if (toStringValue(record.id)) {
        await pb.collection('event_assignments').delete(record.id);
      }
    }
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
