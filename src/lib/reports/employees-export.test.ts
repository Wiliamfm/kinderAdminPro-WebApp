import { describe, expect, it } from 'vitest';
import type { EmployeeReportRecord } from '../pocketbase/employee-reports';
import { buildEmployeeReportsCsv, mapEmployeeReportsToCsvRows } from './employees-export';

const recordsFixture: EmployeeReportRecord[] = [
  {
    id: 'er1',
    employee_id: 'e1',
    employee_name: '=Ana',
    employee_document_id: '9001',
    job_id: 'j1',
    job_name: 'Docente',
    semester_id: 'sem1',
    semester_name: '2026-1',
    comments: ' Observacion ',
    created_at: '2026-03-01T12:00:00.000Z',
    updated_at: '2026-03-02T12:00:00.000Z',
    created_by: 'u1',
    created_by_name: 'Admin Uno',
    updated_by: 'u2',
    updated_by_name: 'Admin Dos',
    is_deleted: false,
  },
];

describe('employees export utilities', () => {
  it('maps rows with expected exported columns', () => {
    const rows = mapEmployeeReportsToCsvRows(recordsFixture);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      Empleado: '=Ana',
      Documento: '9001',
      Cargo: 'Docente',
      Semestre: '2026-1',
      Comentarios: 'Observacion',
    });
    expect(rows[0]?.Creado.length).toBeGreaterThan(0);
  });

  it('builds csv with utf8 bom and formula escaping', () => {
    const csv = buildEmployeeReportsCsv(recordsFixture);

    expect(csv.startsWith('\uFEFFEmpleado,Documento,Cargo,Semestre,Comentarios,Creado')).toBe(true);
    expect(csv).toContain("'=Ana");
    expect(csv).not.toContain('Actualizado');
    expect(csv).not.toContain('Creado por');
  });
});
