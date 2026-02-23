import pb, { normalizePocketBaseError } from './client';

type PbInvoiceRecord = {
  id: string;
  employee_id: string;
  file_id: string;
  creation_datetime?: string;
  update_datetime?: string;
  created: string;
  updated: string;
};

type PbInvoicePayload = {
  employee_id: string;
  file_id: string;
};

export type InvoiceRecord = {
  id: string;
  employeeId: string;
  fileId: string;
  created: string;
  updated: string;
};

export type InvoiceCreateInput = {
  employeeId: string;
  fileId: string;
};

export type PaginatedInvoicesResult = {
  items: InvoiceRecord[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toDateTimeValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return '';
}

function mapInvoiceRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): InvoiceRecord {
  return {
    id: record.id,
    employeeId: toStringValue(record.get?.('employee_id') ?? record.employee_id),
    fileId: toStringValue(record.get?.('file_id') ?? record.file_id),
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
  };
}

export async function listEmployeeInvoices(
  employeeId: string,
  page: number,
  perPage: number,
): Promise<PaginatedInvoicesResult> {
  try {
    const result = await pb.collection('invoices').getList(page, perPage, {
      sort: '-update_datetime',
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
    const record = await pb.collection('invoices').create(mapInvoicePayload(payload));
    return mapInvoiceRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
