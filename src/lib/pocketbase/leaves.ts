import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';

type PbLeaveRecord = {
  id: string;
  employee_id: string;
  start_datetime: string;
  end_datetime: string;
};

type PbLeavePayload = {
  employee_id: string;
  start_datetime: string;
  end_datetime: string;
};

export type LeaveAnalyticsRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocumentId: string;
  employeeActive: boolean;
  startDateTime: string;
  endDateTime: string;
};

export type LeaveRecord = {
  id: string;
  employeeId: string;
  start_datetime: string;
  end_datetime: string;
};

export type LeaveCreateInput = {
  employeeId: string;
  start_datetime: string;
  end_datetime: string;
};

export type LeaveSortField = 'start_datetime' | 'end_datetime';
export type LeaveSortDirection = 'asc' | 'desc';
export type LeaveListOptions = {
  sortField?: LeaveSortField;
  sortDirection?: LeaveSortDirection;
};

export type PaginatedLeavesResult = PaginatedListResult<LeaveRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapLeaveRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): LeaveRecord {
  return {
    id: record.id,
    employeeId: toStringValue(record.get?.('employee_id') ?? record.employee_id),
    start_datetime: toStringValue(record.get?.('start_datetime') ?? record.start_datetime),
    end_datetime: toStringValue(record.get?.('end_datetime') ?? record.end_datetime),
  };
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function getExpandedChild(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: string,
): Record<string, unknown> | null {
  const expand = ((record as { expand?: Record<string, unknown> }).expand
    ?? record.get?.('expand')) as Record<string, unknown> | undefined;
  const value = expand?.[key] ?? record[key];

  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' ? first as Record<string, unknown> : null;
  }

  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function mapLeaveAnalyticsRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): LeaveAnalyticsRecord {
  const expandedEmployee = getExpandedChild(record, 'employee_id');

  return {
    id: record.id,
    employeeId: toStringValue(record.get?.('employee_id') ?? record.employee_id),
    employeeName: toStringValue(expandedEmployee?.name),
    employeeDocumentId: toStringValue(expandedEmployee?.document_id),
    employeeActive: toBooleanValue(expandedEmployee?.active),
    startDateTime: toStringValue(record.get?.('start_datetime') ?? record.start_datetime),
    endDateTime: toStringValue(record.get?.('end_datetime') ?? record.end_datetime),
  };
}

function mapLeavePayload(payload: LeaveCreateInput): PbLeavePayload {
  return {
    employee_id: payload.employeeId,
    start_datetime: payload.start_datetime,
    end_datetime: payload.end_datetime,
  };
}

function buildSortExpression(
  sortField: LeaveSortField,
  sortDirection: LeaveSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

export async function listEmployeeLeaves(
  employeeId: string,
  page: number,
  perPage: number,
  options: LeaveListOptions = {},
): Promise<PaginatedLeavesResult> {
  try {
    const sortField = options.sortField ?? 'start_datetime';
    const sortDirection = options.sortDirection ?? 'desc';

    const result = await pb.collection('leaves').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: pb.filter('employee_id = {:employeeId}', { employeeId }),
    });

    return {
      items: result.items.map((record) => mapLeaveRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createEmployeeLeave(payload: LeaveCreateInput): Promise<LeaveRecord> {
  try {
    const record = await pb.collection('leaves').create(mapLeavePayload(payload));
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployeeLeave(
  id: string,
  payload: LeaveCreateInput,
): Promise<LeaveRecord> {
  try {
    const record = await pb.collection('leaves').update(id, mapLeavePayload(payload));
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listLeaveAnalyticsRecords(): Promise<LeaveAnalyticsRecord[]> {
  try {
    const records = await pb.collection('leaves').getFullList({
      sort: '-start_datetime',
      expand: 'employee_id',
      fields: 'id,employee_id,start_datetime,end_datetime,expand.employee_id.name,expand.employee_id.document_id,expand.employee_id.active',
      requestKey: 'reports-employees-leaves-analytics-list',
    });

    return records
      .map((record) => mapLeaveAnalyticsRecord(record))
      .filter((record) => (
        record.id.length > 0
        && record.employeeId.length > 0
        && record.startDateTime.length > 0
        && record.endDateTime.length > 0
      ));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function hasLeaveOverlap(
  employeeId: string,
  startIso: string,
  endIso: string,
  excludeLeaveId?: string,
): Promise<boolean> {
  try {
    const baseFilter =
      'employee_id = {:employeeId} && start_datetime < {:endIso} && end_datetime > {:startIso}';
    const filter = excludeLeaveId
      ? `${baseFilter} && id != {:excludeLeaveId}`
      : baseFilter;

    const result = await pb.collection('leaves').getList(1, 1, {
      filter: pb.filter(filter, {
        employeeId,
        startIso,
        endIso,
        excludeLeaveId,
      }),
    });

    return result.totalItems > 0;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
