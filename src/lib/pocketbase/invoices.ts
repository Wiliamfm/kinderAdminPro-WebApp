import pb, { normalizePocketBaseError } from './client';
import type { PaginatedListResult } from '../table/pagination';

type PbInvoiceRecord = {
  id: string;
  employee_id: string;
  file_id: string;
  name?: string;
  creation_datetime?: string;
  update_datetime?: string;
  created: string;
  updated: string;
};

type PbInvoicePayload = {
  employee_id: string;
  file_id: string;
  name: string;
};

type PbInvoiceUpdatePayload = {
  file_id: string;
  name: string;
};

export type InvoiceRecord = {
  id: string;
  employeeId: string;
  fileId: string;
  name: string;
  created: string;
  updated: string;
};

export type InvoiceCreateInput = {
  employeeId: string;
  fileId: string;
  originalFileName: string;
};

export type InvoiceUpdateInput = {
  fileId: string;
  originalFileName: string;
};

export type InvoiceSortField = 'name' | 'update_datetime';
export type InvoiceSortDirection = 'asc' | 'desc';
export type InvoiceListOptions = {
  sortField?: InvoiceSortField;
  sortDirection?: InvoiceSortDirection;
};

export type PaginatedInvoicesResult = PaginatedListResult<InvoiceRecord>;

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toDateTimeValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return '';
}

function sanitizeInvoiceFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return 'factura.pdf';
  return trimmed.replace(/\s+/g, '_');
}

function splitBaseAndExtension(fileName: string): { baseName: string; extension: string } {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return { baseName: fileName, extension: '' };
  }

  return {
    baseName: fileName.slice(0, lastDotIndex),
    extension: fileName.slice(lastDotIndex),
  };
}

function formatTimestampSuffix(value: unknown): string {
  const parsed = new Date(toDateTimeValue(value));
  if (Number.isNaN(parsed.getTime())) return '';

  const year = String(parsed.getUTCFullYear());
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const hour = String(parsed.getUTCHours()).padStart(2, '0');
  const minute = String(parsed.getUTCMinutes()).padStart(2, '0');

  return `${year}${month}${day}_${hour}${minute}`;
}

function buildInvoiceName(originalFileName: string, dateTime: unknown): string {
  const sanitized = sanitizeInvoiceFileName(originalFileName);
  const suffix = formatTimestampSuffix(dateTime);
  if (!suffix) return sanitized;

  const { baseName, extension } = splitBaseAndExtension(sanitized);
  return `${baseName}_${suffix}${extension}`;
}

function mapInvoiceRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): InvoiceRecord {
  return {
    id: record.id,
    employeeId: toStringValue(record.get?.('employee_id') ?? record.employee_id),
    fileId: toStringValue(record.get?.('file_id') ?? record.file_id),
    name: toStringValue(record.get?.('name') ?? record.name),
    created: toDateTimeValue(
      record.get?.('creation_datetime')
      ?? record.creation_datetime
      ?? record.created
      ?? record.get?.('created'),
    ),
    updated: toDateTimeValue(
      record.get?.('update_datetime')
      ?? record.update_datetime
      ?? record.updated
      ?? record.get?.('updated')
      ?? record.get?.('creation_datetime')
      ?? record.creation_datetime
      ?? record.created
      ?? record.get?.('created'),
    ),
  };
}

function mapInvoicePayload(input: InvoiceCreateInput): PbInvoicePayload {
  return {
    employee_id: input.employeeId,
    file_id: input.fileId,
    name: buildInvoiceName(input.originalFileName, new Date()),
  };
}

function mapInvoiceUpdatePayload(input: InvoiceUpdateInput): PbInvoiceUpdatePayload {
  return {
    file_id: input.fileId,
    name: buildInvoiceName(input.originalFileName, new Date()),
  };
}

function buildSortExpression(
  sortField: InvoiceSortField,
  sortDirection: InvoiceSortDirection,
): string {
  return sortDirection === 'desc' ? `-${sortField}` : sortField;
}

export async function listEmployeeInvoices(
  employeeId: string,
  page: number,
  perPage: number,
  options: InvoiceListOptions = {},
): Promise<PaginatedInvoicesResult> {
  try {
    const sortField = options.sortField ?? 'update_datetime';
    const sortDirection = options.sortDirection ?? 'desc';

    const result = await pb.collection('invoices').getList(page, perPage, {
      sort: buildSortExpression(sortField, sortDirection),
      filter: pb.filter('employee_id = {:employeeId}', { employeeId }),
    });

    return {
      items: result.items.map((record) => mapInvoiceRecord(record)),
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createInvoice(payload: InvoiceCreateInput): Promise<InvoiceRecord> {
  try {
    const collection = pb.collection('invoices');
    const created = await collection.create(mapInvoicePayload(payload));
    const createdDateTime =
      created.get?.('update_datetime')
      ?? created.update_datetime
      ?? created.get?.('creation_datetime')
      ?? created.creation_datetime
      ?? created.get?.('updated')
      ?? created.updated
      ?? created.get?.('created')
      ?? created.created;

    const expectedName = buildInvoiceName(payload.originalFileName, createdDateTime);
    const currentName = toStringValue(created.get?.('name') ?? created.name);
    if (!expectedName || expectedName === currentName) {
      return mapInvoiceRecord(created);
    }

    const updated = await collection.update(created.id, { name: expectedName });
    return mapInvoiceRecord(updated);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateInvoice(id: string, payload: InvoiceUpdateInput): Promise<InvoiceRecord> {
  try {
    const collection = pb.collection('invoices');
    const updated = await collection.update(id, mapInvoiceUpdatePayload(payload));
    const updatedDateTime =
      updated.get?.('update_datetime')
      ?? updated.update_datetime
      ?? updated.get?.('updated')
      ?? updated.updated
      ?? updated.get?.('creation_datetime')
      ?? updated.creation_datetime
      ?? updated.get?.('created')
      ?? updated.created;

    const expectedName = buildInvoiceName(payload.originalFileName, updatedDateTime);
    const currentName = toStringValue(updated.get?.('name') ?? updated.name);
    if (!expectedName || expectedName === currentName) {
      return mapInvoiceRecord(updated);
    }

    const normalized = await collection.update(id, { name: expectedName });
    return mapInvoiceRecord(normalized);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
