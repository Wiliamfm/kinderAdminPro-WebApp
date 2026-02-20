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
  active: boolean;
};

export type EmployeeUpdateInput = {
  name: string;
  salary: number;
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

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function mapEmployeeRecord(record: Record<string, unknown> & { id: string; get?: (key: string) => unknown }): EmployeeRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    salary: toSalaryValue(record.get?.('salary') ?? record.salary),
    job: toStringValue(record.get?.('job') ?? record.job),
    email: toStringValue(record.get?.('email') ?? record.email),
    phone: toStringValue(record.get?.('phone') ?? record.phone),
    address: toStringValue(record.get?.('address') ?? record.address),
    emergency_contact: toStringValue(record.get?.('emergency_contact') ?? record.emergency_contact),
    active: toBooleanValue(record.get?.('active') ?? record.active),
  };
}

export async function listActiveEmployees(): Promise<EmployeeRecord[]> {
  try {
    const records = await pb.collection('employees').getFullList();
    return records.map((record) => mapEmployeeRecord(record)).filter((record) => record.active);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord> {
  try {
    const record = await pb.collection('employees').getOne(id);
    return mapEmployeeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployee(id: string, payload: EmployeeUpdateInput): Promise<EmployeeRecord> {
  try {
    const record = await pb.collection('employees').update(id, payload);
    return mapEmployeeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function deactivateEmployee(id: string): Promise<void> {
  try {
    await pb.collection('employees').update(id, { active: false });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
