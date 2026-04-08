import { getAuthenticatedPb } from '../server/get-authenticated-pb';
import { normalizePocketBaseError } from './errors';
import { getCurrentSemester, type SemesterRecord } from './semesters';
import { listGrades, type GradeRecord, countActiveStudentsByGradeId } from './grades';

export type DashboardGrade = {
  id: string;
  name: string;
  professorName: string | null;
  studentCount: number;
};

export type DashboardData = {
  semester: SemesterRecord | null;
  grades: DashboardGrade[];
  totalStudents: number;
};

export async function getDashboardData(): Promise<DashboardData> {
  "use server";

  const [semester, grades] = await Promise.all([
    getCurrentSemester(),
    listGrades(),
  ]);

  const gradesWithCounts = await Promise.all(
    grades.map(async (grade) => {
      const studentCount = await countActiveStudentsByGradeId(grade.id);
      return {
        id: grade.id,
        name: grade.name,
        professorName: grade.employeeName || null,
        studentCount,
      };
    })
  );

  const totalStudents = gradesWithCounts.reduce((sum, g) => sum + g.studentCount, 0);

  return {
    semester,
    grades: gradesWithCounts,
    totalStudents,
  };
}