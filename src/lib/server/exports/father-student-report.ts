"use server";

import { createStudentsExportPdf } from '../../reports/students-export';
import { formatFileTimestamp } from '../../reports/download';
import { listFatherBulletin } from '../../pocketbase/father-portal';

export type FatherStudentExportResult = {
  fileName: string;
  data: string;
  mimeType: string;
};

function toFileNameSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    || 'estudiante';
}

export async function exportFatherStudentReport(studentId: string): Promise<FatherStudentExportResult> {
  const records = await listFatherBulletin(studentId);
  if (records.length === 0) {
    throw new Error('No hay boletines para exportar.');
  }

  const generatedAt = new Date();
  const doc = createStudentsExportPdf(records, generatedAt);
  const base64Data = doc.output('datauristring').split(',')[1];
  const studentName = toFileNameSegment(records[0]?.student_name ?? '');

  return {
    fileName: `boletines_${studentName}_${formatFileTimestamp(generatedAt)}.pdf`,
    data: base64Data,
    mimeType: 'application/pdf',
  };
}
