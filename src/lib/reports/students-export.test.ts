import { describe, expect, it } from 'vitest';
import type { BulletinStudentRecord } from '../pocketbase/bulletins-students';
import {
  groupBulletinStudentsForExport,
  sortBulletinStudentsForExport,
} from './students-export';

const baseRecord: Omit<BulletinStudentRecord, 'id' | 'grade_name' | 'semester_name' | 'bulletin_category_name' | 'bulletin_description' | 'student_name' | 'student_document_id'> = {
  bulletin_id: 'b1',
  bulletin_label: 'Etiqueta',
  student_id: 's1',
  grade_id: 'g1',
  semester_id: 'sem1',
  note: 95,
  comments: '',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  created_by: 'u1',
  created_by_name: 'Admin',
  updated_by: 'u1',
  updated_by_name: 'Admin',
  is_deleted: false,
};

describe('students export utilities', () => {
  it('sorts records by grade, semester, category and description', () => {
    const records: BulletinStudentRecord[] = [
      {
        id: 'r3',
        ...baseRecord,
        grade_name: 'Segundo',
        semester_name: '2026-2',
        bulletin_category_name: 'Convivencia',
        bulletin_description: 'Respeto',
        student_name: 'Luis',
        student_document_id: '1003',
      },
      {
        id: 'r2',
        ...baseRecord,
        grade_name: 'Primero',
        semester_name: '2026-2',
        bulletin_category_name: 'Academico',
        bulletin_description: 'Matematicas',
        student_name: 'Ana',
        student_document_id: '1001',
      },
      {
        id: 'r1',
        ...baseRecord,
        grade_name: 'Primero',
        semester_name: '2026-1',
        bulletin_category_name: 'Academico',
        bulletin_description: 'Ciencias',
        student_name: 'Zoe',
        student_document_id: '1002',
      },
    ];

    const sorted = sortBulletinStudentsForExport(records);
    expect(sorted.map((record) => record.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('groups sorted records by grade and semester', () => {
    const records: BulletinStudentRecord[] = [
      {
        id: 'r2',
        ...baseRecord,
        grade_name: 'Primero',
        semester_name: '2026-2',
        bulletin_category_name: 'Academico',
        bulletin_description: 'Matematicas',
        student_name: 'Ana',
        student_document_id: '1001',
      },
      {
        id: 'r1',
        ...baseRecord,
        grade_name: 'Primero',
        semester_name: '2026-2',
        bulletin_category_name: 'Academico',
        bulletin_description: 'Ciencias',
        student_name: 'Zoe',
        student_document_id: '1002',
      },
      {
        id: 'r3',
        ...baseRecord,
        grade_name: 'Segundo',
        semester_name: '2026-1',
        bulletin_category_name: 'Convivencia',
        bulletin_description: 'Respeto',
        student_name: 'Luis',
        student_document_id: '1003',
      },
    ];

    const groups = groupBulletinStudentsForExport(records);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      gradeName: 'Primero',
      semesterName: '2026-2',
    });
    expect(groups[0]?.rows.map((record) => record.bulletin_description)).toEqual(['Ciencias', 'Matematicas']);
    expect(groups[1]).toMatchObject({
      gradeName: 'Segundo',
      semesterName: '2026-1',
    });
  });
});
