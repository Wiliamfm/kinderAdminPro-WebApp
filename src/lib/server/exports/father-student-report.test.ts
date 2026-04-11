import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportFatherStudentReport } from './father-student-report';

const hoisted = vi.hoisted(() => ({
  listFatherBulletin: vi.fn(),
  createStudentsExportPdf: vi.fn(),
  formatFileTimestamp: vi.fn(),
}));

vi.mock('../../pocketbase/father-portal', () => ({
  listFatherBulletin: hoisted.listFatherBulletin,
}));

vi.mock('../../reports/students-export', () => ({
  createStudentsExportPdf: hoisted.createStudentsExportPdf,
}));

vi.mock('../../reports/download', () => ({
  formatFileTimestamp: hoisted.formatFileTimestamp,
}));

describe('exportFatherStudentReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.formatFileTimestamp.mockReturnValue('20260410_1200');
    hoisted.createStudentsExportPdf.mockReturnValue({
      output: vi.fn().mockReturnValue('data:application/pdf;base64,ZmFrZQ=='),
    });
  });

  it('builds a PDF export result using the father student bulletins', async () => {
    hoisted.listFatherBulletin.mockResolvedValue([
      {
        id: 'r1',
        student_name: 'Ana Pérez',
      },
    ]);

    const result = await exportFatherStudentReport('s1');

    expect(hoisted.listFatherBulletin).toHaveBeenCalledWith('s1');
    expect(hoisted.createStudentsExportPdf).toHaveBeenCalled();
    expect(result).toEqual({
      fileName: 'boletines_ana_perez_20260410_1200.pdf',
      data: 'ZmFrZQ==',
      mimeType: 'application/pdf',
    });
  });

  it('throws the father-specific empty export error when no bulletins exist', async () => {
    hoisted.listFatherBulletin.mockResolvedValue([]);

    await expect(exportFatherStudentReport('s1')).rejects.toThrow('No hay boletines para exportar.');
  });
});
