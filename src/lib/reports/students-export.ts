import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BulletinStudentRecord } from '../pocketbase/bulletins-students';

export type BulletinStudentExportGroup = {
  gradeName: string;
  semesterName: string;
  rows: BulletinStudentRecord[];
};

function normalizeText(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'Sin dato';
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'es-CO', { sensitivity: 'base' });
}

export function sortBulletinStudentsForExport(records: BulletinStudentRecord[]): BulletinStudentRecord[] {
  return [...records].sort((left, right) => (
    compareText(normalizeText(left.grade_name), normalizeText(right.grade_name))
    || compareText(normalizeText(left.semester_name), normalizeText(right.semester_name))
    || compareText(normalizeText(left.bulletin_category_name), normalizeText(right.bulletin_category_name))
    || compareText(normalizeText(left.bulletin_description), normalizeText(right.bulletin_description))
    || compareText(normalizeText(left.student_name), normalizeText(right.student_name))
    || compareText(normalizeText(left.student_document_id), normalizeText(right.student_document_id))
  ));
}

export function groupBulletinStudentsForExport(
  records: BulletinStudentRecord[],
): BulletinStudentExportGroup[] {
  const groups: BulletinStudentExportGroup[] = [];
  const sorted = sortBulletinStudentsForExport(records);

  for (const record of sorted) {
    const gradeName = normalizeText(record.grade_name);
    const semesterName = normalizeText(record.semester_name);
    const existing = groups.find((group) => (
      group.gradeName === gradeName && group.semesterName === semesterName
    ));

    if (existing) {
      existing.rows.push(record);
      continue;
    }

    groups.push({
      gradeName,
      semesterName,
      rows: [record],
    });
  }

  return groups;
}

function formatGeneratedAt(value: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatNote(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : 'Sin dato';
}

export function createStudentsExportPdf(records: BulletinStudentRecord[], generatedAt: Date = new Date()): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  doc.setFontSize(16);
  doc.text('Reporte de boletines por estudiante', 40, 40);
  doc.setFontSize(10);
  doc.text(`Generado: ${formatGeneratedAt(generatedAt)}`, 40, 58);

  const groups = groupBulletinStudentsForExport(records);
  if (groups.length === 0) {
    doc.setFontSize(11);
    doc.text('No hay datos para exportar con los filtros aplicados.', 40, 86);
    return doc;
  }

  let cursorY = 82;

  for (const group of groups) {
    if (cursorY > 500) {
      doc.addPage();
      cursorY = 42;
    }

    doc.setFontSize(11);
    doc.text(`Grado: ${group.gradeName} | Semestre: ${group.semesterName}`, 40, cursorY);

    autoTable(doc, {
      startY: cursorY + 8,
      theme: 'grid',
      head: [[
        'Estudiante',
        'Documento',
        'Categoria',
        'Descripcion',
        'Nota',
        'Comentarios',
      ]],
      body: group.rows.map((record) => [
        normalizeText(record.student_name),
        normalizeText(record.student_document_id),
        normalizeText(record.bulletin_category_name),
        normalizeText(record.bulletin_description),
        formatNote(record.note),
        record.comments.trim(),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [202, 138, 4],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 80 },
        2: { cellWidth: 100 },
        3: { cellWidth: 185 },
        4: { cellWidth: 55, halign: 'right' },
        5: { cellWidth: 250 },
      },
      margin: { left: 40, right: 40 },
    });

    const lastAutoTable = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    cursorY = (lastAutoTable?.finalY ?? cursorY + 20) + 16;
  }

  return doc;
}

export function buildStudentsExportPdfBlob(
  records: BulletinStudentRecord[],
  generatedAt: Date = new Date(),
): Blob {
  const doc = createStudentsExportPdf(records, generatedAt);
  return doc.output('blob');
}
