import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';

export type EmployeeJobRecord = {
  id: string;
  name: string;
  salary: number | string;
};

export type EmployeeJobCreateInput = {
  name: string;
  salary: number;
};

export type EmployeeJobUpdateInput = EmployeeJobCreateInput;

export type EmployeeJobListSortField = 'name' | 'salary';
export type EmployeeJobListSortDirection = 'asc' | 'desc';
export type EmployeeJobListOptions = {
  sortField?: EmployeeJobListSortField;
  sortDirection?: EmployeeJobListSortDirection;
};
export type PaginatedEmployeeJobsResult = PaginatedListResult<EmployeeJobRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toSalaryValue(value: unknown): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) return numeric;
      return trimmed;
    }
  }

  return '';
}

function mapEmployeeJobRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EmployeeJobRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    salary: toSalaryValue(record.get?.('salary') ?? record.salary),
  };
}

function buildSortExpression(
  sortField: EmployeeJobListSortField,
  sortDirection: EmployeeJobListSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

export async function listEmployeeJobs(): Promise<EmployeeJobRecord[]> {
  try {
    const records = await pb.collection('employee_jobs').getFullList({
      sort: 'name',
    });

    return records.map((record) => mapEmployeeJobRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listEmployeeJobsPage(
  page: number,
  perPage: number,
  options: EmployeeJobListOptions = {},
): Promise<PaginatedEmployeeJobsResult> {
  try {
    const sortField = options.sortField ?? 'name';
    const sortDirection = options.sortDirection ?? 'asc';
    const result = await pb.collection('employee_jobs').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
    });

    return {
      items: result.items.map((record) => mapEmployeeJobRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createEmployeeJob(payload: EmployeeJobCreateInput): Promise<EmployeeJobRecord> {
  try {
    const record = await pb.collection('employee_jobs').create({
      name: payload.name.trim(),
      salary: payload.salary,
    });

    return mapEmployeeJobRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployeeJob(
  id: string,
  payload: EmployeeJobUpdateInput,
): Promise<EmployeeJobRecord> {
  try {
    const record = await pb.collection('employee_jobs').update(id, {
      name: payload.name.trim(),
      salary: payload.salary,
    });

    return mapEmployeeJobRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deleteEmployeeJob(id: string): Promise<void> {
  try {
    await pb.collection('employee_jobs').delete(id);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function countEmployeesByJobId(jobId: string): Promise<number> {
  try {
    const result = await pb.collection('employees').getList(1, 1, {
      filter: `job_id = "${escapeFilterValue(jobId)}" && active = true`,
    });

    return result.totalItems;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
