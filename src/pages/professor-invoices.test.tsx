import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorInvoicesPage from './professor-invoices';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  getAuthUserId: vi.fn(),
  getEmployeeByUserId: vi.fn(),
  listEmployeeInvoices: vi.fn(),
  getInvoiceFileUrl: vi.fn(),
  downloadBlobFile: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
  getAuthUserId: mocks.getAuthUserId,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  getEmployeeByUserId: mocks.getEmployeeByUserId,
}));

vi.mock('../lib/pocketbase/invoices', () => ({
  listEmployeeInvoices: mocks.listEmployeeInvoices,
}));

vi.mock('../lib/pocketbase/invoice-files', () => ({
  getInvoiceFileUrl: mocks.getInvoiceFileUrl,
}));

vi.mock('../lib/reports/download', () => ({
  downloadBlobFile: mocks.downloadBlobFile,
}));

const employee = {
  id: 'e1',
  name: 'Ana',
  documentId: '123',
  email: 'ana@test.com',
  phone: '300',
  address: 'Calle 1',
  emergency_contact: 'Luis',
  active: true,
  userId: 'u1',
  jobId: 'j1',
  jobName: 'Docente',
  jobSalary: 1000,
  cvFileName: '',
  cvUrl: null,
};

describe('ProfessorInvoicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessModule.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u1');
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listEmployeeInvoices.mockResolvedValue({ items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows error state when no employee is linked to the logged-in user', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontró/i)).toBeInTheDocument();
    });
  });

  it('redirects to home when module access is denied', async () => {
    mocks.canAccessModule.mockReturnValue(false);
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows invoices table when employee is found', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv1',
          employeeId: 'e1',
          fileId: 'file-1',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago marzo.pdf',
          created: '2024-03-01T08:00:00Z',
          updated: '2024-03-05T08:00:00Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Pago marzo.pdf')).toBeInTheDocument();
    });
  });

  it('shows empty state message when no invoices exist', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listEmployeeInvoices.mockResolvedValue({ items: [], page: 1, perPage: 10, totalItems: 0, totalPages: 0 });

    render(() => <ProfessorInvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no hay facturas/i)).toBeInTheDocument();
    });
  });

  it('opens the preview modal when an invoice row is clicked and downloads the current invoice', async () => {
    const blob = new Blob(['invoice'], { type: 'application/pdf' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(blob),
    });

    vi.stubGlobal('fetch', fetchMock);
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv1',
          employeeId: 'e1',
          fileId: 'file-1',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago marzo.pdf',
          created: '2024-03-01T08:00:00Z',
          updated: '2024-03-05T08:00:00Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });
    mocks.getInvoiceFileUrl.mockResolvedValue('https://files.test/invoice-1.pdf');

    render(() => <ProfessorInvoicesPage />);

    fireEvent.click(await screen.findByText('Pago marzo.pdf'));

    await waitFor(() => {
      expect(mocks.getInvoiceFileUrl).toHaveBeenCalledWith('file-1');
    });
    expect(await screen.findByRole('heading', { name: 'Pago marzo.pdf' })).toBeInTheDocument();
    expect(screen.getByTitle('Vista previa de Pago marzo.pdf')).toHaveAttribute('src', 'https://files.test/invoice-1.pdf');

    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('https://files.test/invoice-1.pdf');
      expect(mocks.downloadBlobFile).toHaveBeenCalledWith('Pago marzo.pdf', blob);
    });
  });

  it('selects an invoice from the checkbox without opening the preview modal', async () => {
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv1',
          employeeId: 'e1',
          fileId: 'file-1',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago marzo.pdf',
          created: '2024-03-01T08:00:00Z',
          updated: '2024-03-05T08:00:00Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });

    render(() => <ProfessorInvoicesPage />);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar factura Pago marzo.pdf' }));

    expect(screen.getByRole('button', { name: 'Descargar seleccionadas (1)' })).toBeInTheDocument();
    expect(mocks.getInvoiceFileUrl).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Pago marzo.pdf' })).not.toBeInTheDocument();
  });

  it('bulk downloads the selected invoices and disables the action while it is running', async () => {
    let resolveFetch: ((value: { ok: boolean; blob: () => Promise<Blob> }) => void) | undefined;
    const firstBlob = new Blob(['invoice-1'], { type: 'application/pdf' });
    const secondBlob = new Blob(['invoice-2'], { type: 'application/pdf' });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        blob: vi.fn().mockResolvedValue(secondBlob),
      });

    vi.stubGlobal('fetch', fetchMock);
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv1',
          employeeId: 'e1',
          fileId: 'file-1',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago marzo.pdf',
          created: '2024-03-01T08:00:00Z',
          updated: '2024-03-05T08:00:00Z',
        },
        {
          id: 'inv2',
          employeeId: 'e1',
          fileId: 'file-2',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago abril.pdf',
          created: '2024-04-01T08:00:00Z',
          updated: '2024-04-05T08:00:00Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 2,
      totalPages: 1,
    });
    mocks.getInvoiceFileUrl
      .mockResolvedValueOnce('https://files.test/invoice-1.pdf')
      .mockResolvedValueOnce('https://files.test/invoice-2.pdf');

    render(() => <ProfessorInvoicesPage />);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar todas las facturas visibles' }));

    const bulkButton = screen.getByRole('button', { name: 'Descargar seleccionadas (2)' });
    fireEvent.click(bulkButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Descargando...' })).toBeDisabled();
    });

    resolveFetch?.({
      ok: true,
      blob: vi.fn().mockResolvedValue(firstBlob),
    });

    await waitFor(() => {
      expect(mocks.downloadBlobFile).toHaveBeenCalledWith('Pago marzo.pdf', firstBlob);
    });

    await waitFor(() => {
      expect(mocks.downloadBlobFile).toHaveBeenCalledWith('Pago abril.pdf', secondBlob);
    });
  });

  it('shows an error inside the preview modal when the file URL cannot be loaded', async () => {
    mocks.listEmployeeInvoices.mockResolvedValue({
      items: [
        {
          id: 'inv1',
          employeeId: 'e1',
          fileId: 'file-1',
          semesterId: 's1',
          semesterName: '2024-1',
          name: 'Pago marzo.pdf',
          created: '2024-03-01T08:00:00Z',
          updated: '2024-03-05T08:00:00Z',
        },
      ],
      page: 1,
      perPage: 10,
      totalItems: 1,
      totalPages: 1,
    });
    mocks.getInvoiceFileUrl.mockRejectedValue(new Error('Archivo no disponible'));

    render(() => <ProfessorInvoicesPage />);

    fireEvent.click(await screen.findByText('Pago marzo.pdf'));

    await waitFor(() => {
      expect(screen.getByText('Archivo no disponible')).toBeInTheDocument();
    });
  });
});
