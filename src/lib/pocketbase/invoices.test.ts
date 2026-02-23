import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvoice, listEmployeeInvoices, updateInvoice } from './invoices';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const filter = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      create,
      update,
    })),
    filter,
  };

  return {
    getList,
    create,
    update,
    filter,
    normalizePocketBaseError,
    pb,
  };
});

vi.mock('./client', () => ({
  default: hoisted.pb,
  normalizePocketBaseError: hoisted.normalizePocketBaseError,
}));

describe('invoices pocketbase client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists invoices using employee_id filter and maps to camelCase', async () => {
    hoisted.filter.mockReturnValue('employee_id = "e1"');
    hoisted.getList.mockResolvedValue({
      items: [
        {
          id: 'inv-1',
          employee_id: 'e1',
          file_id: 'f1',
          name: 'factura_demo_20260223_1000.pdf',
          creation_datetime: '2026-02-23T10:00:00.000Z',
          created: '',
          updated: '2026-02-23T10:00:00.000Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const result = await listEmployeeInvoices('e1', 1, 10);

    expect(hoisted.filter).toHaveBeenCalledWith('employee_id = {:employeeId}', {
      employeeId: 'e1',
    });
    expect(hoisted.getList).toHaveBeenCalledWith(1, 10, {
      sort: '-update_datetime',
      filter: 'employee_id = "e1"',
    });
    expect(result.items[0]).toMatchObject({
      id: 'inv-1',
      employeeId: 'e1',
      fileId: 'f1',
      name: 'factura_demo_20260223_1000.pdf',
    });
  });

  it('creates invoice with generated name and normalizes it using db timestamp', async () => {
    hoisted.create.mockResolvedValue({
      id: 'inv-2',
      employee_id: 'e1',
      file_id: 'f2',
      name: 'factura_demo_20260223_1159.pdf',
      creation_datetime: '2026-02-23T12:00:00.000Z',
      update_datetime: '2026-02-23T12:00:00.000Z',
      created: '2026-02-23T12:00:00.000Z',
      updated: '2026-02-23T12:00:00.000Z',
    });
    hoisted.update.mockResolvedValue({
      id: 'inv-2',
      employee_id: 'e1',
      file_id: 'f2',
      name: 'factura_demo_20260223_1200.pdf',
      creation_datetime: '2026-02-23T12:00:00.000Z',
      update_datetime: '2026-02-23T12:00:00.000Z',
      created: '2026-02-23T12:00:00.000Z',
      updated: '2026-02-23T12:00:00.000Z',
    });

    const result = await createInvoice({
      employeeId: 'e1',
      fileId: 'f2',
      originalFileName: 'factura demo.pdf',
    });

    expect(hoisted.create).toHaveBeenCalledWith(expect.objectContaining({
      employee_id: 'e1',
      file_id: 'f2',
      name: expect.stringMatching(/^factura_demo_\d{8}_\d{4}\.pdf$/),
    }));
    expect(hoisted.update).toHaveBeenCalledWith('inv-2', {
      name: 'factura_demo_20260223_1200.pdf',
    });
    expect(result).toMatchObject({
      id: 'inv-2',
      employeeId: 'e1',
      fileId: 'f2',
      name: 'factura_demo_20260223_1200.pdf',
    });
  });

  it('normalizes and rethrows errors', async () => {
    const rawError = new Error('network');
    const normalized = { message: 'normalized', status: 500, isAbort: false };
    hoisted.getList.mockRejectedValue(rawError);
    hoisted.normalizePocketBaseError.mockReturnValue(normalized);

    await expect(listEmployeeInvoices('e1', 1, 10)).rejects.toEqual(normalized);
    expect(hoisted.normalizePocketBaseError).toHaveBeenCalledWith(rawError);
  });

  it('updates invoice by mapping camelCase payload to snake_case and returns mapped record', async () => {
    hoisted.update.mockResolvedValue({
      id: 'inv-3',
      employee_id: 'e1',
      file_id: 'f3',
      name: 'factura_reemplazo_20260223_1400.pdf',
      creation_datetime: '2026-02-23T12:00:00.000Z',
      update_datetime: '2026-02-23T14:00:00.000Z',
      created: '2026-02-23T12:00:00.000Z',
      updated: '2026-02-23T14:00:00.000Z',
    });

    const result = await updateInvoice('inv-3', {
      fileId: 'f3',
      originalFileName: 'factura reemplazo.pdf',
    });

    expect(hoisted.update).toHaveBeenCalledWith('inv-3', expect.objectContaining({
      file_id: 'f3',
      name: expect.stringMatching(/^factura_reemplazo_\d{8}_\d{4}\.pdf$/),
    }));
    expect(result).toMatchObject({
      id: 'inv-3',
      employeeId: 'e1',
      fileId: 'f3',
      name: 'factura_reemplazo_20260223_1400.pdf',
    });
  });

});
