import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInvoice, listEmployeeInvoices } from './invoices';

const hoisted = vi.hoisted(() => {
  const getList = vi.fn();
  const create = vi.fn();
  const filter = vi.fn();
  const normalizePocketBaseError = vi.fn();

  const pb = {
    collection: vi.fn(() => ({
      getList,
      create,
    })),
    filter,
  };

  return {
    getList,
    create,
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
    });
  });

  it('creates invoice by mapping camelCase input to snake_case payload', async () => {
    hoisted.create.mockResolvedValue({
      id: 'inv-2',
      employee_id: 'e1',
      file_id: 'f2',
      created: '2026-02-23T12:00:00.000Z',
      updated: '2026-02-23T12:00:00.000Z',
    });

    const result = await createInvoice({
      employeeId: 'e1',
      fileId: 'f2',
    });

    expect(hoisted.create).toHaveBeenCalledWith({
      employee_id: 'e1',
      file_id: 'f2',
    });
    expect(result).toMatchObject({
      id: 'inv-2',
      employeeId: 'e1',
      fileId: 'f2',
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

});
