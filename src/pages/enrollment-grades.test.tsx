import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentGradesPage from './enrollment-grades';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listGrades: vi.fn(),
  createGrade: vi.fn(),
  updateGrade: vi.fn(),
  deleteGrade: vi.fn(),
  countActiveStudentsByGradeId: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/grades', () => ({
  listGrades: mocks.listGrades,
  createGrade: mocks.createGrade,
  updateGrade: mocks.updateGrade,
  deleteGrade: mocks.deleteGrade,
  countActiveStudentsByGradeId: mocks.countActiveStudentsByGradeId,
}));

const gradesFixture = [
  { id: 'g1', name: 'Primero A', capacity: 30 },
  { id: 'g2', name: 'Segundo A', capacity: 35 },
];

describe('EnrollmentGradesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listGrades.mockResolvedValue(gradesFixture);
    mocks.createGrade.mockResolvedValue(gradesFixture[0]);
    mocks.updateGrade.mockResolvedValue(gradesFixture[0]);
    mocks.deleteGrade.mockResolvedValue(undefined);
    mocks.countActiveStudentsByGradeId.mockResolvedValue(0);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentGradesPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('lists grades and opens create modal', async () => {
    render(() => <EnrollmentGradesPage />);
    expect(await screen.findByText('Primero A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Nuevo grado'));
    expect(await screen.findByRole('heading', { name: 'Crear grado' })).toBeInTheDocument();
  });

  it('sorts grades by capacity when header is clicked', async () => {
    render(() => <EnrollmentGradesPage />);
    await screen.findByText('Primero A');

    fireEvent.click(screen.getByRole('button', { name: 'Capacidad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Capacidad' }));

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Segundo A');
    expect(rows[1]).toHaveTextContent('Primero A');
  });

  it('creates a grade', async () => {
    render(() => <EnrollmentGradesPage />);
    await screen.findByText('Primero A');

    fireEvent.click(screen.getByText('Nuevo grado'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Tercero A' } });
    fireEvent.input(screen.getByLabelText('Capacidad'), { target: { value: '32' } });
    fireEvent.click(screen.getAllByText('Crear grado')[1]);

    await waitFor(() => {
      expect(mocks.createGrade).toHaveBeenCalledWith({ name: 'Tercero A', capacity: 32 });
    });
  });

  it('shows realtime validation in create modal after touching capacity', async () => {
    render(() => <EnrollmentGradesPage />);
    await screen.findByText('Primero A');

    fireEvent.click(screen.getByText('Nuevo grado'));
    fireEvent.input(screen.getByLabelText('Capacidad'), { target: { value: '0' } });

    expect(
      await screen.findByText('La capacidad debe ser un número entero mayor o igual a 1.'),
    ).toBeInTheDocument();
    expect(mocks.createGrade).not.toHaveBeenCalled();
  });

  it('edits a grade', async () => {
    render(() => <EnrollmentGradesPage />);
    await screen.findByText('Primero A');

    fireEvent.click(screen.getByLabelText('Editar grado Primero A'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Primero A - Actualizado' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateGrade).toHaveBeenCalledWith('g1', {
        name: 'Primero A - Actualizado',
        capacity: 30,
      });
    });
  });

  it('blocks delete when grade has linked students', async () => {
    mocks.countActiveStudentsByGradeId.mockResolvedValue(2);
    render(() => <EnrollmentGradesPage />);
    await screen.findByText('Primero A');

    fireEvent.click(screen.getByLabelText('Eliminar grado Primero A'));
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.countActiveStudentsByGradeId).toHaveBeenCalledWith('g1');
    });
    expect(mocks.deleteGrade).not.toHaveBeenCalled();
    expect(await screen.findByText(/No se puede eliminar el grado Primero A/)).toBeInTheDocument();
  });
});
