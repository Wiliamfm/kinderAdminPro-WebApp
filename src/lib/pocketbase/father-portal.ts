import { getAuthenticatedPbWithUserId } from '../server/get-authenticated-pb';
import { requireModuleAccess } from '../server/require-module-access';
import { type BulletinStudentRecord, listBulletinsStudentsForExport } from './bulletins-students';
import { normalizePocketBaseError, PocketBaseError } from './errors';
export {
  checkFatherStudentDocumentIdAvailable,
  registerFatherStudent as submitFatherStudentRegistration,
} from './father-register-student';

export type FatherStudentStatus = 'Activo' | 'Pendiente' | 'Rechazado' | 'Desactivado';

export type FatherStudentRecord = {
  id: string;
  name: string;
  documentId: string;
  gradeId: string;
  gradeName: string;
  status: FatherStudentStatus;
  active: boolean;
  accepted: boolean;
  rejectedAt: string;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toBooleanValue(value: unknown): boolean {
  return value === true;
}

function getExpandedChild(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  key: string,
): Record<string, unknown> | null {
  const directExpand = (record as { expand?: Record<string, unknown> }).expand;
  const fromGet = record.get?.('expand');
  const expand = (directExpand ?? fromGet) as Record<string, unknown> | undefined;
  const expanded = expand?.[key] ?? record[key];

  if (Array.isArray(expanded)) {
    const first = expanded[0];
    return first && typeof first === 'object' ? first as Record<string, unknown> : null;
  }

  return expanded && typeof expanded === 'object' ? expanded as Record<string, unknown> : null;
}

function getExpandedRecord(
  record: Record<string, unknown> & { get?: (key: string) => unknown },
  path: string,
): Record<string, unknown> | null {
  let current: Record<string, unknown> | null = record;

  for (const segment of path.split('.')) {
    if (!current) {
      return null;
    }

    current = getExpandedChild(current as Record<string, unknown> & { get?: (key: string) => unknown }, segment);
  }

  return current;
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function computeStudentStatus(student: Record<string, unknown> | null): FatherStudentStatus {
  const rejectedAt = toStringValue(student?.rejected);
  if (rejectedAt.length > 0) {
    return 'Rechazado';
  }

  const active = toBooleanValue(student?.active);
  const accepted = toBooleanValue(student?.accepted);

  if (active && accepted) {
    return 'Activo';
  }

  if (active && !accepted) {
    return 'Pendiente';
  }

  return 'Desactivado';
}

async function assertFatherStudentAccess(
  pb: { collection: (name: string) => { getList: (page: number, perPage: number, options: Record<string, unknown>) => Promise<{ totalItems: number }> } },
  fatherId: string,
  studentId: string,
): Promise<void> {
  const normalizedStudentId = toStringValue(studentId);

  if (normalizedStudentId.length === 0) {
    throw new PocketBaseError('Estudiante inválido.', 400, false);
  }

  const result = await pb.collection('students_fathers').getList(1, 1, {
    filter: [
      `father_id = "${escapeFilterValue(fatherId)}"`,
      `student_id = "${escapeFilterValue(normalizedStudentId)}"`,
    ].join(' && '),
    fields: 'id',
    requestKey: `father-portal-student-access-${fatherId}-${normalizedStudentId}`,
  });

  if (result.totalItems === 0) {
    throw new PocketBaseError('No tienes permisos para ver este estudiante.', 403, false);
  }
}

export async function listFatherStudents(): Promise<FatherStudentRecord[]> {
  "use server";
  await requireModuleAccess('father-portal');
  const { pb, userId } = await getAuthenticatedPbWithUserId();

  try {
    if (!userId) {
      return [];
    }

    const fathers = await pb.collection('fathers').getList(1, 1, {
      filter: `user_id = "${escapeFilterValue(userId)}"`,
      fields: 'id',
      requestKey: `father-portal-father-by-user-${userId}`,
    });

    const fatherId = fathers.items[0]?.id ?? '';
    if (!fatherId) {
      return [];
    }

    const records = await pb.collection('students_fathers').getFullList({
      filter: `father_id = "${escapeFilterValue(fatherId)}"`,
      expand: 'student_id,student_id.grade_id',
      sort: 'created_at,id',
      requestKey: `father-portal-students-${fatherId}`,
    });

    const students = new Map<string, FatherStudentRecord>();

    for (const record of records) {
      const expandedStudent = getExpandedRecord(record, 'student_id');
      const studentId = toStringValue(expandedStudent?.id ?? record.get?.('student_id') ?? record.student_id);

      if (studentId.length === 0 || students.has(studentId)) {
        continue;
      }

      const expandedGrade = getExpandedRecord(record, 'student_id.grade_id');
      students.set(studentId, {
        id: studentId,
        name: toStringValue(expandedStudent?.name),
        documentId: toStringValue(expandedStudent?.document_id),
        gradeId: toStringValue(expandedStudent?.grade_id),
        gradeName: toStringValue(expandedGrade?.name),
        status: computeStudentStatus(expandedStudent),
        active: toBooleanValue(expandedStudent?.active),
        accepted: toBooleanValue(expandedStudent?.accepted),
        rejectedAt: toStringValue(expandedStudent?.rejected),
      });
    }

    return [...students.values()].sort((left, right) => (
      left.name.localeCompare(right.name, 'es-CO', { sensitivity: 'base' })
      || left.documentId.localeCompare(right.documentId, 'es-CO', { sensitivity: 'base' })
      || left.id.localeCompare(right.id, 'es-CO', { sensitivity: 'base' })
    ));
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function listFatherBulletin(studentId: string): Promise<BulletinStudentRecord[]> {
  "use server";
  await requireModuleAccess('father-portal');
  const { pb, userId } = await getAuthenticatedPbWithUserId();

  try {
    if (!userId) {
      return [];
    }

    const fathers = await pb.collection('fathers').getList(1, 1, {
      filter: `user_id = "${escapeFilterValue(userId)}"`,
      fields: 'id',
      requestKey: `father-portal-father-by-user-${userId}`,
    });

    const fatherId = fathers.items[0]?.id ?? '';
    if (!fatherId) {
      return [];
    }

    await assertFatherStudentAccess(pb, fatherId, studentId);

    return await listBulletinsStudentsForExport({
      studentIds: [toStringValue(studentId)],
      sortField: 'created_at',
      sortDirection: 'desc',
    });
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
