import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';

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
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const formData = new FormData();
    formData.set('file', payload.file);
    const record = await pb.collection('invoice_files').create(formData);
    return mapInvoiceFileRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getInvoiceFileUrl(fileId: string): Promise<string> {
  "use server";
  const pb = await getAuthenticatedPb();
  try {
    const record = await pb.collection('invoice_files').getOne(fileId);
    const fileName = toStringValue(record.get?.('file') ?? record.file);
    return pb.files.getURL(record, fileName);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
