import { normalizePocketBaseError } from './errors';
import { getPublicPb } from './public-client';

export type PublicGradeRecord = {
  id: string;
  name: string;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapGradeRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): PublicGradeRecord {
  return {
    id: record.id,
    name: toStringValue(record.get?.('name') ?? record.name),
  };
}

export async function listPublicGrades(): Promise<PublicGradeRecord[]> {
  "use server";

  const pb = getPublicPb();

  try {
    const records = await pb.collection('grades').getFullList({
      sort: 'name',
    });

    return records.map((record) => mapGradeRecord(record));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
