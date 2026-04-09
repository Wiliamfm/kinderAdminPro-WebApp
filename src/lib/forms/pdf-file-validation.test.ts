import { describe, expect, it } from 'vitest';
import { isPdfFile, validatePdfFile } from './pdf-file-validation';

describe('pdf file validation', () => {
  it('accepts application/pdf files', () => {
    const file = new File(['pdf'], 'support.pdf', { type: 'application/pdf' });

    expect(isPdfFile(file)).toBe(true);
  });

  it('accepts pdf extension fallback when mime type is missing', () => {
    const file = new File(['pdf'], 'support.pdf', { type: '' });

    expect(isPdfFile(file)).toBe(true);
  });

  it('rejects non-pdf files', () => {
    const file = new File(['text'], 'support.txt', { type: 'text/plain' });

    expect(validatePdfFile(file, {
      maxSizeBytes: 7 * 1024 * 1024,
      maxSizeMessage: 'El archivo debe ser menor a 7MB',
    })).toBe('Solo se permiten archivos PDF');
  });

  it('rejects files above the configured size limit', () => {
    const file = new File(['pdf'], 'support.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 7 * 1024 * 1024 + 1 });

    expect(validatePdfFile(file, {
      maxSizeBytes: 7 * 1024 * 1024,
      maxSizeMessage: 'El archivo debe ser menor a 7MB',
    })).toBe('El archivo debe ser menor a 7MB');
  });

  it('allows optional empty values', () => {
    expect(validatePdfFile(null, {
      maxSizeBytes: 7 * 1024 * 1024,
      maxSizeMessage: 'El archivo debe ser menor a 7MB',
    })).toBeUndefined();
  });
});
