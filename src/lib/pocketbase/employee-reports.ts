import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';
import { getAuthUserId } from './users';

export type EmployeeReportRecord = {
  id: string;
  employee_id: string;
  employee_name: string;
  job_id: string;
  job_name: string;
  semester_id: string;
  semester_name: string;
  comments: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_name: string;
  updated_by: string;
  updated_by_name: string;
  is_deleted: boolean;
};

export type EmployeeReportCreateInput = {
  employee_id: string;
  job_id: string;
  semester_id: string;
  comments?: string;
};

export type EmployeeReportUpdateInput = EmployeeReportCreateInput;

export type EmployeeReportListSortField =
  | 'employee_name'
  | 'job_name'
  | 'semester_name'
  | 'comments'
  | 'created_at'
  | 'updated_at'
  | 'created_by_name'
  | 'updated_by_name';

export type EmployeeReportListSortDirection = 'asc' | 'desc';

export type EmployeeReportListOptions = {
  sortField?: EmployeeReportListSortField;
  sortDirection?: EmployeeReportListSortDirection;
  jobId?: string;
  semesterId?: string;
  employeeQuery?: string;
  employeeIds?: string[];
};

export type PaginatedEmployeeReportsResult = PaginatedListResult<EmployeeReportRecord>;

export type EmployeeReportOption = {
  id: string;
  label: string;
};

export type EmployeeReportFormOptions = {
  employees: EmployeeReportOption[];
  jobs: EmployeeReportOption[];
  semesters: EmployeeReportOption[];
};

export type EmployeeReportAnalyticsRecord = {
  employee_id: string;
  job_id: string;
  semester_id: string;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function getExpandContainer(record: Record<string, unknown> & { get?: (key: string) => unknown }) {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  return (directExpand ?? fromGet) as Record<string, unknown> | undefined;
}

function getExpandedChild(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: string,
): Record<string, unknown> | null {
  const expand = getExpandContainer(record);
  const fromExpand = expand?.[key];
  const fromRecord = record[key];
  const value = fromExpand ?? fromRecord;

  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === 'object' ? first as Record<string, unknown> : null;
  }

  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function getExpandedRecord(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  path: string,
): Record<string, unknown> | null {
  let current: Record<string, unknown> | null = record;

  for (const segment of path.split('.')) {
    if (!current) return null;
    current = getExpandedChild(current as Record<string, unknown> & { get?: (key: string) => unknown }, segment);
  }

  return current;
}

function getUserDisplayName(record: Record<string, unknown> | null, fallbackId: string): string {
  if (!record) return fallbackId;

  const name = toStringValue(record.name);
  if (name.length > 0) return name;

  const email = toStringValue(record.email);
  if (email.length > 0) return email;

  return fallbackId;
}

function mapEmployeeReportRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EmployeeReportRecord {
  const expandedEmployee = getExpandedRecord(record, 'employee_id');
  const expandedJob = getExpandedRecord(record, 'job_id');
  const expandedSemester = getExpandedRecord(record, 'semester_id');
  const expandedCreatedBy = getExpandedRecord(record, 'created_by');
  const expandedUpdatedBy = getExpandedRecord(record, 'updated_by');

  const employeeId = toStringValue(record.get?.('employee_id') ?? record.employee_id);
  const jobId = toStringValue(record.get?.('job_id') ?? record.job_id);
  const semesterId = toStringValue(record.get?.('semester_id') ?? record.semester_id);
  const createdBy = toStringValue(record.get?.('created_by') ?? record.created_by);
  const updatedBy = toStringValue(record.get?.('updated_by') ?? record.updated_by);

  return {
    id: record.id,
    employee_id: employeeId,
    employee_name: toStringValue(expandedEmployee?.name),
    job_id: jobId,
    job_name: toStringValue(expandedJob?.name),
    semester_id: semesterId,
    semester_name: toStringValue(expandedSemester?.name),
    comments: toStringValue(record.get?.('comments') ?? record.comments),
    created_at: toStringValue(record.get?.('created_at') ?? record.created_at),
    updated_at: toStringValue(record.get?.('updated_at') ?? record.updated_at),
    created_by: createdBy,
    created_by_name: getUserDisplayName(expandedCreatedBy, createdBy),
    updated_by: updatedBy,
    updated_by_name: getUserDisplayName(expandedUpdatedBy, updatedBy),
    is_deleted: toBooleanValue(record.get?.('is_deleted') ?? record.is_deleted),
  };
}

const EMPLOYEE_REPORT_SORT_FIELD_MAP: Record<EmployeeReportListSortField, string> = {
  employee_name: 'employee_id.name',
  job_name: 'job_id.name',
  semester_name: 'semester_id.name',
  comments: 'comments',
  created_at: 'created_at',
  updated_at: 'updated_at',
  created_by_name: 'created_by.name',
  updated_by_name: 'updated_by.name',
};

function buildSortExpression(
  sortField: EmployeeReportListSortField,
  sortDirection: EmployeeReportListSortDirection,
): string {
  const mappedField = EMPLOYEE_REPORT_SORT_FIELD_MAP[sortField];
  return sortDirection === 'desc' ? `-${mappedField}` : mappedField;
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeFilterIds(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) return [];

  const normalized = values
    .map((value) => toStringValue(value))
    .filter((value) => value.length > 0);

  return [...new Set(normalized)];
}

function buildFilterExpression(options: EmployeeReportListOptions): string {
  const clauses = ['is_deleted != true'];
  const jobId = toStringValue(options.jobId);
  const semesterId = toStringValue(options.semesterId);
  const employeeQuery = toStringValue(options.employeeQuery);
  const employeeIds = normalizeFilterIds(options.employeeIds);

  if (jobId.length > 0) {
    clauses.push(`job_id = "${escapeFilterValue(jobId)}"`);
  }

  if (semesterId.length > 0) {
    clauses.push(`semester_id = "${escapeFilterValue(semesterId)}"`);
  }

  if (employeeIds.length > 0) {
    const employeeIdClause = employeeIds
      .map((employeeId) => `employee_id = "${escapeFilterValue(employeeId)}"`)
      .join(' || ');
    clauses.push(`(${employeeIdClause})`);
  } else if (employeeQuery.length > 0) {
    const escapedQuery = escapeFilterValue(employeeQuery);
    clauses.push(`(employee_id.name ~ "${escapedQuery}" || employee_id.email ~ "${escapedQuery}")`);
  }

  return clauses.join(' && ');
}

function requireAuthUserId(): string {
  const userId = getAuthUserId();
  if (!userId) {
    throw new Error('No hay usuario autenticado para completar la operación.');
  }

  return userId;
}

function mapEmployeeReportPayload(payload: EmployeeReportCreateInput | EmployeeReportUpdateInput) {
  return {
    employee_id: payload.employee_id.trim(),
    job_id: payload.job_id.trim(),
    semester_id: payload.semester_id.trim(),
    comments: (payload.comments ?? '').trim(),
  };
}

export async function listEmployeeReportsPage(
  page: number,
  perPage: number,
  options: EmployeeReportListOptions = {},
): Promise<PaginatedEmployeeReportsResult> {
  try {
    const sortField = options.sortField ?? 'created_at';
    const sortDirection = options.sortDirection ?? 'desc';
    const filterExpression = buildFilterExpression(options);

    const result = await pb.collection('employee_reports').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: filterExpression,
      expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      requestKey: 'reports-employees-table-list',
    });

    return {
      items: result.items.map((record) => mapEmployeeReportRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createEmployeeReport(
  payload: EmployeeReportCreateInput,
): Promise<EmployeeReportRecord> {
  const authUserId = requireAuthUserId();

  try {
    const record = await pb.collection('employee_reports').create(
      {
        ...mapEmployeeReportPayload(payload),
        created_by: authUserId,
        updated_by: authUserId,
        is_deleted: false,
      },
      {
        expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      },
    );

    return mapEmployeeReportRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployeeReport(
  id: string,
  payload: EmployeeReportUpdateInput,
): Promise<EmployeeReportRecord> {
  const authUserId = requireAuthUserId();

  try {
    const record = await pb.collection('employee_reports').update(
      id,
      {
        ...mapEmployeeReportPayload(payload),
        updated_by: authUserId,
      },
      {
        expand: 'employee_id,job_id,semester_id,created_by,updated_by',
      },
    );

    return mapEmployeeReportRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function softDeleteEmployeeReport(id: string): Promise<void> {
  const authUserId = requireAuthUserId();

  try {
    await pb.collection('employee_reports').update(id, {
      is_deleted: true,
      updated_by: authUserId,
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listEmployeeReportFormOptions(): Promise<EmployeeReportFormOptions> {
  try {
    const [employees, jobs, semesters] = await Promise.all([
      pb.collection('employees').getFullList({
        sort: 'name',
        filter: 'active = true',
      }),
      pb.collection('employee_jobs').getFullList({
        sort: 'name',
      }),
      pb.collection('semesters').getFullList({
        sort: 'name',
      }),
    ]);

    return {
      employees: employees.map((record) => ({
        id: toStringValue(record.id),
        label: toStringValue(record.get?.('name') ?? record.name) || toStringValue(record.id),
      })),
      jobs: jobs.map((record) => ({
        id: toStringValue(record.id),
        label: toStringValue(record.get?.('name') ?? record.name) || toStringValue(record.id),
      })),
      semesters: semesters.map((record) => ({
        id: toStringValue(record.id),
        label: toStringValue(record.get?.('name') ?? record.name) || toStringValue(record.id),
      })),
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listEmployeeReportsAnalyticsRecords(): Promise<EmployeeReportAnalyticsRecord[]> {
  try {
    const records = await pb.collection('employee_reports').getFullList({
      sort: '-created_at',
      filter: 'is_deleted != true',
      fields: 'employee_id,job_id,semester_id',
      requestKey: 'reports-employees-analytics-list',
    });

    return records
      .map((record) => ({
        employee_id: toStringValue(record.get?.('employee_id') ?? record.employee_id),
        job_id: toStringValue(record.get?.('job_id') ?? record.job_id),
        semester_id: toStringValue(record.get?.('semester_id') ?? record.semester_id),
      }))
      .filter((record) => (
        record.employee_id.length > 0
        && record.job_id.length > 0
        && record.semester_id.length > 0
      ));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
