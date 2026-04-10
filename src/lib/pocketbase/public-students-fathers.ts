import { normalizePocketBaseError } from './errors';
import type {
  StudentFatherLinkRecord,
  StudentFatherRelationship,
} from './students-fathers';
import { getPublicPb } from './public-client';

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toRelationship(value: unknown): StudentFatherRelationship {
  const normalized = toStringValue(value);

  if (normalized === 'father' || normalized === 'mother' || normalized === 'other') {
    return normalized;
  }

  return 'other';
}

function mapStudentFatherLinkRecord(
  record: Record<string, unknown> & { id: string; get?: (key: string) => unknown },
): StudentFatherLinkRecord {
  return {
    id: record.id,
    studentId: toStringValue(record.get?.('student_id') ?? record.student_id),
    fatherId: toStringValue(record.get?.('father_id') ?? record.father_id),
    relationship: toRelationship(record.get?.('relationship') ?? record.relationship),
    studentName: '',
    studentActive: true,
    fatherName: '',
    fatherActive: true,
  };
}

export async function publicCreateStudentFatherLink(
  studentId: string,
  fatherId: string,
  relationship: StudentFatherRelationship,
): Promise<StudentFatherLinkRecord> {
  "use server";

  const pb = getPublicPb();

  try {
    const record = await pb.collection('students_fathers').create({
      student_id: studentId.trim(),
      father_id: fatherId.trim(),
      relationship,
    });

    return mapStudentFatherLinkRecord(record);
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
