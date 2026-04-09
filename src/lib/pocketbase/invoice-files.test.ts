import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvoiceFile, getInvoiceFileUrl } from './invoice-files';

const hoisted = vi.hoisted(() => {
  const create = vi.fn();
  const getOne = vi.fn();
  const getURL = vi.fn();
  const normalizePocketBaseError = vi.fn();
  const getAuthenticatedPb = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      create,
      getOne,
    })),
    files: {
      getURL,
    },
  };

  return {
    create,
    getOne,
    getURL,
    normalizePocketBaseError,
    getAuthenticatedPb,
    pb,
  };
});

vi.mock('../server/get-authenticated-pb', () => ({
  getAuthenticatedPb: hoisted.getAuthenticatedPb,
}));

vi.mock('./errors', () => ({
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('invoice_files pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthenticatedPb.mockResolvedValue(hoisted.pb);
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

  it('returns the PocketBase file URL for an invoice file', async () => {
    const record = {
      id: 'file-1',
      file: 'invoice.pdf',
    };
    hoisted.getOne.mockResolvedValue(record);
    hoisted.getURL.mockReturnValue('https://files.test/api/files/invoice_files/file-1/invoice.pdf');

    const result = await getInvoiceFileUrl('file-1');

    expect(hoisted.getOne).toHaveBeenCalledWith('file-1');
    expect(hoisted.getURL).toHaveBeenCalledWith(record, 'invoice.pdf');
    expect(result).toBe('https://files.test/api/files/invoice_files/file-1/invoice.pdf');
  });

  it('normalizes and rethrows errors when fetching a file URL', async () => {
    const rawError = new Error('missing');
    const normalized = { message: 'not found', status: 404, isAbort: false };
    hoisted.getOne.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(getInvoiceFileUrl('missing-file')).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });
});
