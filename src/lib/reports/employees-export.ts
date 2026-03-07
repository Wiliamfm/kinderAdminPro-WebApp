import Papa from 'papaparse';
import type { EmployeeReportRecord } from '../pocketbase/employee-reports';

export type EmployeeReportsCsvRow = {
  Empleado: string;
  Documento: string;
  Cargo: string;
  Semestre: string;
  Comentarios: string;
  Creado: string;
};

function normalizeText(value: string): string {
  return value.trim();
}

function formatCreatedAt(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return '';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function mapEmployeeReportsToCsvRows(records: EmployeeReportRecord[]): EmployeeReportsCsvRow[] {
  return records.map((record) => ({
    Empleado: normalizeText(record.employee_name),
    Documento: normalizeText(record.employee_document_id),
    Cargo: normalizeText(record.job_name),
    Semestre: normalizeText(record.semester_name),
    Comentarios: normalizeText(record.comments),
    Creado: formatCreatedAt(record.created_at),
  }));
}

export function buildEmployeeReportsCsv(records: EmployeeReportRecord[]): string {
  const rows = mapEmployeeReportsToCsvRows(records);
  const csv = Papa.unparse(rows, {
    header: true,
    newline: '\r\n',
    escapeFormulae: true,
  });

  return `\uFEFF${csv}`;
}
