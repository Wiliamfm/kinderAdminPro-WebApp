import { normalizePocketBaseError } from './errors';
import type { FatherCreateInput, FatherRecord } from './fathers';
import { getPublicPb } from './public-client';

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toActiveValue(value: unknown): boolean {
  return value !== false;
}

function mapFatherRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): FatherRecord {
  return {
    id: record.id,
    full_name: toStringValue(record.get?.('full_name') ?? record.full_name),
    document_id: toStringValue(record.get?.('document_id') ?? record.document_id),
    phone_number: toStringValue(record.get?.('phone_number') ?? record.phone_number),
    occupation: toStringValue(record.get?.('occupation') ?? record.occupation),
    company: toStringValue(record.get?.('company') ?? record.company),
    email: toStringValue(record.get?.('email') ?? record.email),
    address: toStringValue(record.get?.('address') ?? record.address),
    is_active: toActiveValue(record.get?.('is_active') ?? record.is_active),
    student_names: [],
  };
}

export async function publicCreateFather(payload: FatherCreateInput): Promise<FatherRecord> {
  "use server";

  const pb = getPublicPb();

  try {
    const record = await pb.collection('fathers').create({
      full_name: payload.full_name.trim(),
      document_id: payload.document_id.trim(),
      phone_number: payload.phone_number.trim(),
      occupation: payload.occupation.trim(),
      company: payload.company.trim(),
      email: payload.email.trim(),
      address: payload.address.trim(),
      is_active: true,
    });

    return mapFatherRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
