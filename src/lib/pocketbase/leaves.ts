import pb, { normalizePocketBaseError } from './client';

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

export type PaginatedLeavesResult = {
  items: LeaveRecord[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
};

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

function mapLeavePayload(payload: LeaveCreateInput): PbLeavePayload {
  return {
    employee_id: payload.employeeId,
    start_datetime: payload.start_datetime,
    end_datetime: payload.end_datetime,
  };
}

export async function listEmployeeLeaves(
  employeeId: string,
  page: number,
  perPage: number,
): Promise<PaginatedLeavesResult> {
  try {
    const result = await pb.collection('leaves').getList(page, perPage, {
      sort: '-start_datetime',
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
