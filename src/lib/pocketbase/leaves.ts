import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError, PocketBaseError } from './errors';
import type { PaginatedListResult } from '../table/pagination';
import type PocketBase from 'pocketbase';

type PbLeaveRecord = {
  id: string;
  employee_id: string;
  semester_id?: string | string[];
  start_datetime: string;
  end_datetime: string;
  file?: string | string[];
};

type PbLeavePayload = {
  employee_id: string;
  semester_id: string;
  start_datetime: string;
  end_datetime: string;
  file?: Blob;
};

type PbSemesterRecord = {
  id: string;
  name?: string;
  start_date: string;
  end_date: string;
};

export type LeaveAnalyticsRecord = {
  id: string;
  employeeId: string;
  semesterId: string;
  employeeName: string;
  employeeDocumentId: string;
  employeeActive: boolean;
  startDateTime: string;
  endDateTime: string;
};

export type LeaveRecord = {
  id: string;
  employeeId: string;
  semesterId: string;
  start_datetime: string;
  end_datetime: string;
  file: string;
};

export type LeaveCreateInput = {
  employeeId: string;
  semesterId: string;
  start_datetime: string;
  end_datetime: string;
  file?: File | null;
};

type LeaveUploadInput = {
  employeeId: string;
  semesterId: string;
  start_datetime: string;
  end_datetime: string;
  file?: Blob;
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
    semesterId: toRelationIdValue(record.get?.('semester_id') ?? record.semester_id),
    start_datetime: toStringValue(record.get?.('start_datetime') ?? record.start_datetime),
    end_datetime: toStringValue(record.get?.('end_datetime') ?? record.end_datetime),
    file: toFileNameValue(record.get?.('file') ?? record.file),
  };
}

function toRelationIdValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === 'string' ? firstValue.trim() : '';
  }
  return '';
}

function toFileNameValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === 'string' ? firstValue.trim() : '';
  }
  return '';
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
    semesterId: toRelationIdValue(record.get?.('semester_id') ?? record.semester_id),
    employeeName: toStringValue(expandedEmployee?.name),
    employeeDocumentId: toStringValue(expandedEmployee?.document_id),
    employeeActive: toBooleanValue(expandedEmployee?.active),
    startDateTime: toStringValue(record.get?.('start_datetime') ?? record.start_datetime),
    endDateTime: toStringValue(record.get?.('end_datetime') ?? record.end_datetime),
  };
}

function buildLeaveFormDataPayload(payload: PbLeavePayload): FormData {
  const formData = new FormData();

  formData.set('employee_id', payload.employee_id);
  formData.set('semester_id', payload.semester_id);
  formData.set('start_datetime', payload.start_datetime);
  formData.set('end_datetime', payload.end_datetime);
  if (payload.file) {
    formData.set('file', payload.file);
  }

  return formData;
}

function mapLeavePayload(payload: LeaveCreateInput): PbLeavePayload | FormData {
  const mappedPayload: PbLeavePayload = {
    employee_id: payload.employeeId.trim(),
    semester_id: payload.semesterId.trim(),
    start_datetime: payload.start_datetime,
    end_datetime: payload.end_datetime,
  };

  if (payload.file) {
    mappedPayload.file = payload.file;
    return buildLeaveFormDataPayload(mappedPayload);
  }

  return mappedPayload;
}

function toStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function toFileFormValue(formData: FormData, key: string): Blob | undefined {
  const value = formData.get(key);
  return value instanceof Blob ? value : undefined;
}

function parseLeaveUploadFormData(formData: FormData): LeaveUploadInput {
  return {
    employeeId: toStringFormValue(formData, 'employee_id'),
    semesterId: toStringFormValue(formData, 'semester_id'),
    start_datetime: toStringFormValue(formData, 'start_datetime'),
    end_datetime: toStringFormValue(formData, 'end_datetime'),
    file: toFileFormValue(formData, 'file'),
  };
}

function toLeaveCreateInput(payload: LeaveUploadInput): LeaveCreateInput {
  return {
    employeeId: payload.employeeId,
    semesterId: payload.semesterId,
    start_datetime: payload.start_datetime,
    end_datetime: payload.end_datetime,
    file: payload.file instanceof File ? payload.file : undefined,
  };
}

function buildLeaveUploadFormData(payload: LeaveUploadInput): FormData {
  return buildLeaveFormDataPayload({
    employee_id: payload.employeeId,
    semester_id: payload.semesterId,
    start_datetime: payload.start_datetime,
    end_datetime: payload.end_datetime,
    file: payload.file,
  });
}

function buildSortExpression(
  sortField: LeaveSortField,
  sortDirection: LeaveSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

function extractSemesterDatePart(value: string): string | null {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function extractSemesterOffset(value: string): string {
  const match = value.trim().match(/(Z|[+-]\d{2}:\d{2})$/);
  return match?.[1] ?? 'Z';
}

function toSemesterBoundaryDate(value: string, boundary: 'start' | 'end'): Date | null {
  const datePart = extractSemesterDatePart(value);
  if (datePart) {
    const timePart = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
    const boundaryDate = new Date(`${datePart}${timePart}${extractSemesterOffset(value)}`);
    if (!Number.isNaN(boundaryDate.getTime())) return boundaryDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const normalized = new Date(parsed);
  if (boundary === 'start') {
    normalized.setHours(0, 0, 0, 0);
  } else {
    normalized.setHours(23, 59, 59, 999);
  }

  return normalized;
}

function formatSemesterDate(value: string): string {
  const datePart = extractSemesterDatePart(value);
  if (datePart) {
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function createLeaveBoundaryError(startDate: string, endDate: string) {
  return {
    message: `Las fechas de la ausencia deben estar dentro del trimestre (${formatSemesterDate(startDate)} - ${formatSemesterDate(endDate)}).`,
    status: 400,
    isAbort: false,
  } as const;
}

function createMissingSemesterError() {
  return {
    message: 'Trimestre es obligatorio.',
    status: 400,
    isAbort: false,
  } as const;
}

async function assertLeaveWithinSemester(
  pb: PocketBase,
  payload: LeaveCreateInput,
): Promise<void> {
  const semesterId = typeof payload.semesterId === 'string' ? payload.semesterId.trim() : '';
  if (!semesterId) {
    throw createMissingSemesterError();
  }

  const semesterResult = await pb.collection('semesters').getList(1, 1, {
    filter: pb.filter('id = {:semesterId}', { semesterId }),
    fields: 'id,name,start_date,end_date',
    requestKey: null,
  });
  const semester = semesterResult.items[0] as PbSemesterRecord | undefined;
  if (!semester) {
    throw new PocketBaseError('No se encontró el trimestre asociado.', 404, false);
  }
  const semesterStart = toSemesterBoundaryDate(semester.start_date, 'start');
  const semesterEnd = toSemesterBoundaryDate(semester.end_date, 'end');
  const leaveStart = new Date(payload.start_datetime);
  const leaveEnd = new Date(payload.end_datetime);

  if (
    !semesterStart
    || !semesterEnd
    || Number.isNaN(leaveStart.getTime())
    || Number.isNaN(leaveEnd.getTime())
  ) {
    throw new PocketBaseError('No se pudo validar el rango de fechas del trimestre asociado.', 400, false);
  }

  if (
    leaveStart.getTime() < semesterStart.getTime()
    || leaveStart.getTime() > semesterEnd.getTime()
    || leaveEnd.getTime() < semesterStart.getTime()
    || leaveEnd.getTime() > semesterEnd.getTime()
  ) {
    throw createLeaveBoundaryError(semester.start_date, semester.end_date);
  }
}

export async function listEmployeeLeaves(
  employeeId: string,
  page: number,
  perPage: number,
  options: LeaveListOptions = {},
): Promise<PaginatedLeavesResult> {
  "use server";
  const pb = await getAuthenticatedPb();
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
    console.error(error);
    throw normalizePocketBaseError(error);
  }
}

export async function createEmployeeLeave(payload: LeaveCreateInput): Promise<LeaveRecord> {
  "use server";
  try {
    const pb = await getAuthenticatedPb();
    await assertLeaveWithinSemester(pb, payload);
    const record = await pb.collection('leaves').create(mapLeavePayload(payload));
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createEmployeeLeaveWithUpload(formData: FormData): Promise<LeaveRecord> {
  "use server";
  try {
    const pb = await getAuthenticatedPb();
    const payload = parseLeaveUploadFormData(formData);
    await assertLeaveWithinSemester(pb, toLeaveCreateInput(payload));
    const record = await pb.collection('leaves').create(buildLeaveUploadFormData(payload));
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployeeLeave(
  id: string,
  payload: LeaveCreateInput,
): Promise<LeaveRecord> {
  "use server";
  try {
    const pb = await getAuthenticatedPb();
    await assertLeaveWithinSemester(pb, payload);
    const record = await pb.collection('leaves').update(id, mapLeavePayload(payload));
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployeeLeaveWithUpload(
  id: string,
  formData: FormData,
): Promise<LeaveRecord> {
  "use server";
  try {
    const pb = await getAuthenticatedPb();
    const payload = parseLeaveUploadFormData(formData);
    await assertLeaveWithinSemester(pb, toLeaveCreateInput(payload));
    const record = await pb.collection('leaves').update(id, buildLeaveUploadFormData(payload));
    return mapLeaveRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getLeaveFileUrl(leaveId: string): Promise<string> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('leaves').getOne(leaveId);
    const fileName = toFileNameValue(record.get?.('file') ?? record.file);

    if (fileName.length === 0) {
      throw new Error('No se encontró el archivo de la ausencia.');
    }

    return pb.files.getURL(record, fileName);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listLeaveAnalyticsRecords(): Promise<LeaveAnalyticsRecord[]> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const records = await pb.collection('leaves').getFullList({
      sort: '-start_datetime',
      expand: 'employee_id',
      fields: 'id,employee_id,semester_id,start_datetime,end_datetime,expand.employee_id.name,expand.employee_id.document_id,expand.employee_id.active',
      requestKey: 'reports-employees-leaves-analytics-list',
    });

    return records
      .map((record) => mapLeaveAnalyticsRecord(record))
      .filter((record) => (
        record.id.length > 0
        && record.employeeId.length > 0
        && record.semesterId.length > 0
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
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const baseFilter =
      'employee_id = {:employeeId} && start_datetime < {:endIso} && end_datetime > {:startIso}';
    const normalizedExcludeLeaveId = typeof excludeLeaveId === 'string'
      ? excludeLeaveId.trim()
      : '';
    const filter = normalizedExcludeLeaveId
      ? `${baseFilter} && id != {:excludeLeaveId}`
      : baseFilter;
    const filterParams = normalizedExcludeLeaveId
      ? {
        employeeId,
        startIso,
        endIso,
        excludeLeaveId: normalizedExcludeLeaveId,
      }
      : {
        employeeId,
        startIso,
        endIso,
      };

    const result = await pb.collection('leaves').getList(1, 1, {
      filter: pb.filter(filter, filterParams),
    });

    return result.totalItems > 0;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
