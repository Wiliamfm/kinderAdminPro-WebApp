import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportEmployeesReport } from './employees-export';

const hoisted = vi.hoisted(() => ({
  listEmployeeReportsForExport: vi.fn(),
}));

vi.mock('../../pocketbase/employee-reports', () => ({
  listEmployeeReportsForExport: hoisted.listEmployeeReportsForExport,
}));

function decodeBase64Bytes(base64Data: string): Uint8Array {
  const binary = atob(base64Data);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeBase64Utf8(base64Data: string): string {
  return new TextDecoder().decode(decodeBase64Bytes(base64Data));
}

describe('exportEmployeesReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes csv exports with utf-8 characters safely', async () => {
    hoisted.listEmployeeReportsForExport.mockResolvedValue([
      {
        id: 'er1',
        employee_id: 'e1',
        employee_name: 'Ana Pérez',
        employee_document_id: '9001',
        job_name: 'Coordinación',
        job_salary: 1500,
        semester_id: 'sem1',
        semester_name: '2026-1',
        comments: 'Niñez y gestión académica',
        created_at: '2026-03-01T12:00:00.000Z',
        updated_at: '2026-03-02T12:00:00.000Z',
        created_by: 'u1',
        created_by_name: 'Admin Uno',
        updated_by: 'u1',
        updated_by_name: 'Admin Uno',
        is_deleted: false,
      },
    ]);

    const result = await exportEmployeesReport();
    const csvBytes = decodeBase64Bytes(result.data);
    const csv = decodeBase64Utf8(result.data);

    expect(hoisted.listEmployeeReportsForExport).toHaveBeenCalledWith({
      sortField: 'created_at',
      sortDirection: 'desc',
      jobName: undefined,
      semesterId: undefined,
      employeeIds: undefined,
    });
    expect(result.fileName).toMatch(/^reportes_empleados_\d{8}_\d{4}\.csv$/);
    expect(result.mimeType).toBe('text/csv;charset=utf-8');
    expect(Array.from(csvBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(csv.startsWith('Empleado,Documento,Cargo,Salario cargo,Semestre,Comentarios,Creado')).toBe(true);
    expect(csv).toContain('Ana Pérez');
    expect(csv).toContain('Coordinación');
    expect(csv).toContain('$ 1.500');
    expect(csv).toContain('Niñez y gestión académica');
  });

  it('throws when there are no records to export', async () => {
    hoisted.listEmployeeReportsForExport.mockResolvedValue([]);

    await expect(exportEmployeesReport()).rejects.toThrow('No hay datos para exportar con los filtros aplicados.');
  });
});
