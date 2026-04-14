"use server";

import Papa from 'papaparse';
import { listEmployeeReportsForExport } from '../../pocketbase/employee-reports';
import type { EmployeeReportRecord } from '../../pocketbase/employee-reports';

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

function mapEmployeeReportsToCsvRows(records: EmployeeReportRecord[]): EmployeeReportsCsvRow[] {
  return records.map((record) => ({
    Empleado: normalizeText(record.employee_name),
    Documento: normalizeText(record.employee_document_id),
    Cargo: normalizeText(record.job_name),
    Semestre: normalizeText(record.semester_name),
    Comentarios: normalizeText(record.comments),
    Creado: formatCreatedAt(record.created_at),
  }));
}

function buildEmployeeReportsCsv(records: EmployeeReportRecord[]): string {
  const rows = mapEmployeeReportsToCsvRows(records);
  const csv = Papa.unparse(rows, {
    header: true,
    newline: '\r\n',
    escapeFormulae: true,
  });

  return `\uFEFF${csv}`;
}

export type EmployeeReportExportOptions = {
  sortField?: 'employee_name' | 'job_name' | 'semester_name' | 'comments' | 'created_at' | 'updated_at' | 'created_by_name' | 'updated_by_name';
  sortDirection?: 'asc' | 'desc';
  jobId?: string;
  semesterId?: string;
  employeeIds?: string[];
};

export type EmployeesExportResult = {
  fileName: string;
  data: string;
  mimeType: string;
};

export async function exportEmployeesReport(options: EmployeeReportExportOptions = {}): Promise<EmployeesExportResult> {
  const records = await listEmployeeReportsForExport({
    sortField: options.sortField ?? 'created_at',
    sortDirection: options.sortDirection ?? 'desc',
    jobId: options.jobId,
    semesterId: options.semesterId,
    employeeIds: options.employeeIds,
  });

  if (records.length === 0) {
    throw new Error('No hay datos para exportar con los filtros aplicados.');
  }

  const csvContent = buildEmployeeReportsCsv(records);
  const base64Data = btoa(unescape(encodeURIComponent(csvContent)));

  const generatedAt = new Date();
  const year = generatedAt.getFullYear();
  const month = String(generatedAt.getMonth() + 1).padStart(2, '0');
  const day = String(generatedAt.getDate()).padStart(2, '0');
  const hour = String(generatedAt.getHours()).padStart(2, '0');
  const minute = String(generatedAt.getMinutes()).padStart(2, '0');
  const fileName = `reportes_empleados_${year}${month}${day}_${hour}${minute}.csv`;

  return {
    fileName,
    data: base64Data,
    mimeType: 'text/csv;charset=utf-8',
  };
}
