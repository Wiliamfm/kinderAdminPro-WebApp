import pb, { normalizePocketBaseError } from './client';

export type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
  active: boolean;
  userId: string;
  jobId: string;
  jobName: string;
  jobSalary: number | string;
};

export type EmployeeUpdateInput = {
  name: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
  jobId: string;
};

export type EmployeeCreateInput = EmployeeUpdateInput & {
  userId: string;
};

type PbEmployeeCreatePayload = {
  name: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
  user_id: string;
  job_id: string;
  active: boolean;
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

function getExpandedJob(record: Record<string, unknown> & { get?: (key: string) => unknown }): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const job = expand?.job_id;

  if (Array.isArray(job)) {
    return (job[0] as Record<string, unknown>) ?? null;
  }

  if (job && typeof job === 'object') {
    return job as Record<string, unknown>;
  }

  return null;
}

function mapEmployeeRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): EmployeeRecord {
  const expandedJob = getExpandedJob(record);

  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
    email: toStringValue(record.get?.('email') ?? record.email),
    phone: toStringValue(record.get?.('phone') ?? record.phone),
    address: toStringValue(record.get?.('address') ?? record.address),
    emergency_contact: toStringValue(record.get?.('emergency_contact') ?? record.emergency_contact),
    active: toBooleanValue(record.get?.('active') ?? record.active),
    userId: toStringValue(record.get?.('user_id') ?? record.user_id),
    jobId: toStringValue(record.get?.('job_id') ?? record.job_id),
    jobName: toStringValue(expandedJob?.name),
    jobSalary: toSalaryValue(expandedJob?.salary),
  };
}

function mapEmployeeCreatePayload(payload: EmployeeCreateInput): PbEmployeeCreatePayload {
  return {
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    emergency_contact: payload.emergency_contact,
    user_id: payload.userId,
    job_id: payload.jobId,
    active: true,
  };
}

export async function listActiveEmployees(): Promise<EmployeeRecord[]> {
  try {
    const records = await pb.collection('employees').getFullList({
      sort: 'name',
      expand: 'job_id',
    });
    return records.map((record) => mapEmployeeRecord(record)).filter((record) => record.active);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function getEmployeeById(id: string): Promise<EmployeeRecord> {
  try {
    const record = await pb.collection('employees').getOne(id, {
      expand: 'job_id',
    });
    return mapEmployeeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function createEmployee(payload: EmployeeCreateInput): Promise<EmployeeRecord> {
  try {
    const record = await pb.collection('employees').create(mapEmployeeCreatePayload(payload), {
      expand: 'job_id',
    });
    return mapEmployeeRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function updateEmployee(id: string, payload: EmployeeUpdateInput): Promise<EmployeeRecord> {
  try {
    const record = await pb.collection('employees').update(
      id,
      {
        ...payload,
        job_id: payload.jobId,
      },
      {
        expand: 'job_id',
      },
    );
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
