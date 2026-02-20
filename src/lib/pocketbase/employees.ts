import pb, { normalizePocketBaseError } from './client';

export type EmployeeRecord = {
  id: string;
  name: string;
  salary: number | string;
  job: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
};

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

export async function listEmployees(): Promise<EmployeeRecord[]> {
  try {
    const records = await pb.collection('employees').getFullList();

    return records.map((record) => ({
      id: record.id,
      name: toStringValue(record.get?.('name') ?? (record as Record<string, unknown>).name),
      salary: toSalaryValue(record.get?.('salary') ?? (record as Record<string, unknown>).salary),
      job: toStringValue(record.get?.('job') ?? (record as Record<string, unknown>).job),
      email: toStringValue(record.get?.('email') ?? (record as Record<string, unknown>).email),
      phone: toStringValue(record.get?.('phone') ?? (record as Record<string, unknown>).phone),
      address: toStringValue(record.get?.('address') ?? (record as Record<string, unknown>).address),
      emergency_contact: toStringValue(
        record.get?.('emergency_contact') ??
          (record as Record<string, unknown>).emergency_contact,
      ),
    }));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
