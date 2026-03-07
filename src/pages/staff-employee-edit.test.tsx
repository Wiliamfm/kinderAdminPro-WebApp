import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffEmployeeEditPage from './staff-employee-edit';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: 'e1' },
  getEmployeeById: vi.fn(),
  updateEmployee: vi.fn(),
  listEmployeeJobs: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  getEmployeeById: mocks.getEmployeeById,
  updateEmployee: mocks.updateEmployee,
}));

vi.mock('../lib/pocketbase/employee-jobs', () => ({
  listEmployeeJobs: mocks.listEmployeeJobs,
}));

const employeeFixture = {
  id: 'e1',
  name: 'Ana',
  documentId: '9001',
  jobId: 'j1',
  jobName: 'Docente',
  jobSalary: 1500,
  email: 'ana@test.com',
  phone: '3001234567',
  address: 'Calle 1',
  emergency_contact: 'Luis',
  userId: 'u1',
  active: true,
  cvFileName: 'ana_cv.pdf',
  cvUrl: 'https://files/ana_cv.pdf',
};

describe('StaffEmployeeEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.id = 'e1';
    mocks.getEmployeeById.mockResolvedValue(employeeFixture);
    mocks.updateEmployee.mockResolvedValue(employeeFixture);
    mocks.listEmployeeJobs.mockResolvedValue([
      { id: 'j1', name: 'Docente', salary: 1500 },
      { id: 'j2', name: 'Coordinador', salary: 1800 },
    ]);
  });

  it('loads employee data in the form', async () => {
    render(() => <StaffEmployeeEditPage />);

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ana@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3001234567')).toBeInTheDocument();
  });

  it('shows realtime required validation when clearing name', async () => {
    render(() => <StaffEmployeeEditPage />);
    await screen.findByDisplayValue('Ana');

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: '' } });

    expect(await screen.findByText('Nombre es obligatorio.')).toBeInTheDocument();
    expect(mocks.updateEmployee).not.toHaveBeenCalled();
  });

  it('updates employee and navigates back when form is valid', async () => {
    render(() => <StaffEmployeeEditPage />);
    await screen.findByDisplayValue('Ana');

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Ana Maria' } });
    fireEvent.input(screen.getByLabelText('Correo'), { target: { value: 'ana.new@test.com' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateEmployee).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({
          name: 'Ana Maria',
          email: 'ana.new@test.com',
        }),
      );
    });
    expect(mocks.navigate).toHaveBeenCalledWith('/staff-management/employees', { replace: true });
  });

  it('renders current cv link when available', async () => {
    render(() => <StaffEmployeeEditPage />);

    const cvLink = await screen.findByRole('link', { name: 'Ver CV' });
    expect(cvLink).toHaveAttribute('href', 'https://files/ana_cv.pdf');
    const cvDownload = screen.getByLabelText('Descargar CV actual');
    expect(cvDownload).toHaveAttribute('href', 'https://files/ana_cv.pdf');
  });

  it('updates employee with optional cv replacement file', async () => {
    render(() => <StaffEmployeeEditPage />);
    await screen.findByDisplayValue('Ana');

    const cvInput = screen.getByLabelText('Reemplazar hoja de vida (PDF, opcional)') as HTMLInputElement;
    const cvFile = new File(['pdf-content'], 'new_cv.pdf', { type: 'application/pdf' });
    fireEvent.change(cvInput, { target: { files: [cvFile] } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateEmployee).toHaveBeenCalledWith(
        'e1',
        expect.objectContaining({
          cv: cvFile,
        }),
      );
    });
  });

  it('blocks save when cv replacement is not a pdf', async () => {
    render(() => <StaffEmployeeEditPage />);
    await screen.findByDisplayValue('Ana');

    const cvInput = screen.getByLabelText('Reemplazar hoja de vida (PDF, opcional)') as HTMLInputElement;
    const invalidFile = new File(['text'], 'cv.txt', { type: 'text/plain' });
    fireEvent.change(cvInput, { target: { files: [invalidFile] } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    expect(await screen.findByText('Solo se permiten archivos PDF.')).toBeInTheDocument();
    expect(mocks.updateEmployee).not.toHaveBeenCalled();
  });

  it('blocks save when cv replacement exceeds max size', async () => {
    render(() => <StaffEmployeeEditPage />);
    await screen.findByDisplayValue('Ana');

    const cvInput = screen.getByLabelText('Reemplazar hoja de vida (PDF, opcional)') as HTMLInputElement;
    const largePdf = new File(['a'.repeat(10 * 1024 * 1024 + 1)], 'cv.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(cvInput, { target: { files: [largePdf] } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    expect(await screen.findByText('El archivo PDF debe pesar máximo 10 MB.')).toBeInTheDocument();
    expect(mocks.updateEmployee).not.toHaveBeenCalled();
  });
});
