import pb, { normalizePocketBaseError } from './client';

export type InvoiceFileCreateInput = {
  file: File;
};

export type InvoiceFileRecord = {
  id: string;
  fileName: string;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapInvoiceFileRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): InvoiceFileRecord {
  return {
    id: record.id,
    fileName: toStringValue(record.get?.('file') ?? record.file),
  };
}

export async function createInvoiceFile(payload: InvoiceFileCreateInput): Promise<InvoiceFileRecord> {
  try {
    const formData = new FormData();
    formData.set('file', payload.file);
    const record = await pb.collection('invoice_files').create(formData);
    return mapInvoiceFileRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
