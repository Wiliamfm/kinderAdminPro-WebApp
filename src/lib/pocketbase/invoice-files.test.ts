import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvoiceFile } from './invoice-files';

const hoisted = vi.hoisted(() => {
  const create = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      create,
    })),
  };

  return {
    create,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('invoice_files pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads invoice file using FormData', async () => {
    hoisted.create.mockResolvedValue({
      id: 'file-1',
      file: 'contract.pdf',
    });
    const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' });

    const result = await createInvoiceFile({ file });

    const payload = hoisted.create.mock.calls[0][0];
    expect(payload).toBeInstanceOf(FormData);
    expect(payload.get('file')).toBe(file);
    expect(result).toMatchObject({
      id: 'file-1',
      fileName: 'contract.pdf',
    });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.create.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' });

    await expect(createInvoiceFile({ file })).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
