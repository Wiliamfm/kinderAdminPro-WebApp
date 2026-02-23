import pb, { normalizePocketBaseError } from './client';

export type LeaveRecord = {
  id: string;
  employee: string;
  start_datetime: string;
  end_datetime: string;
};

export type LeaveCreateInput = {
  employee: string;
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
    employee: toStringValue(record.get?.('employee') ?? record.employee),
    start_datetime: toStringValue(record.get?.('start_datetime') ?? record.start_datetime),
    end_datetime: toStringValue(record.get?.('end_datetime') ?? record.end_datetime),
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
      filter: pb.filter('employee = {:employeeId}', { employeeId }),
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
    const record = await pb.collection('leaves').create(payload);
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function hasLeaveOverlap(
  employeeId: string,
  startIso: string,
  endIso: string,
): Promise<boolean> {
  try {
    const result = await pb.collection('leaves').getList(1, 1, {
      filter: pb.filter(
        'employee = {:employeeId} && start_datetime < {:endIso} && end_datetime > {:startIso}',
        {
          employeeId,
          startIso,
          endIso,
        },
      ),
    });

    return result.totalItems > 0;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
