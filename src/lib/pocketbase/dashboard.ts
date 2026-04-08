import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';

export type DashboardGrade = {
  id: string;
  name: string;
  professorName: string | null;
  studentCount: number;
};

export type DashboardData = {
  semester: { id: string; name: string; start_date: string; end_date: string } | null;
  grades: DashboardGrade[];
  totalStudents: number;
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function getDashboardData(): Promise<DashboardData> {
  "use server";
  const pb = await getAuthenticatedPb();

  try {
    const [semesterResult, gradeRecords] = await Promise.all([
      pb.collection('semesters').getList(1, 1, {
        filter: 'is_current = true',
        sort: '-updated_at',
        requestKey: 'dashboard-semester',
      }),
      pb.collection('grades').getFullList({
        sort: 'name',
        expand: 'employee_id',
        requestKey: 'dashboard-grades',
      }),
    ]);

    const semesterItem = semesterResult.items[0];
    const semester = semesterItem
      ? {
          id: semesterItem.id,
          name: toStringValue(semesterItem.get?.('name') ?? semesterItem.name),
          start_date: toStringValue(semesterItem.get?.('start_date') ?? semesterItem.start_date),
          end_date: toStringValue(semesterItem.get?.('end_date') ?? semesterItem.end_date),
        }
      : null;

    const gradesWithCounts = await Promise.all(
      gradeRecords.map(async (record) => {
        const expand = (record as { expand?: Record<string, unknown> }).expand;
        const employee = expand?.employee_id as Record<string, unknown> | undefined;

        const countResult = await pb.collection('students').getList(1, 1, {
          filter: `grade_id = "${escapeFilterValue(record.id)}" && active = true`,
          requestKey: `dashboard-grade-count-${record.id}`,
        });

        return {
          id: record.id,
          name: toStringValue(record.get?.('name') ?? record.name),
          professorName: toStringValue(employee?.name) || null,
          studentCount: countResult.totalItems,
        };
      }),
    );

    const totalStudents = gradesWithCounts.reduce((sum, g) => sum + g.studentCount, 0);

    return { semester, grades: gradesWithCounts, totalStudents };
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}
