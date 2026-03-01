import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportsStudentsPage from './reports-students';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listBulletinsStudentsPage: vi.fn(),
  listBulletinStudentFormOptions: vi.fn(),
  createBulletinStudent: vi.fn(),
  updateBulletinStudent: vi.fn(),
  softDeleteBulletinStudent: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/bulletins-students', () => ({
  listBulletinsStudentsPage: mocks.listBulletinsStudentsPage,
  listBulletinStudentFormOptions: mocks.listBulletinStudentFormOptions,
  createBulletinStudent: mocks.createBulletinStudent,
  updateBulletinStudent: mocks.updateBulletinStudent,
  softDeleteBulletinStudent: mocks.softDeleteBulletinStudent,
}));

const rowsFixture = [
  {
    id: 'rs1',
    bulletin_id: 'b1',
    bulletin_label: 'Académico: Notas de periodo',
    student_id: 's1',
    student_name: 'Ana Pérez',
    grade_id: 'g1',
    grade_name: 'Primero A',
    semester_id: 'sem1',
    semester_name: '2026-1',
    note: 95,
    comments: 'Excelente rendimiento',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-02T00:00:00.000Z',
    created_by: 'u1',
    created_by_name: 'Admin Uno',
    updated_by: 'u1',
    updated_by_name: 'Admin Uno',
    is_deleted: false,
  },
];

const pageFixture = {
  items: rowsFixture,
  page: 1,
  perPage: 10,
  totalItems: 1,
  totalPages: 1,
};

const formOptionsFixture = {
  bulletins: [{ id: 'b1', label: 'Académico: Notas de periodo' }],
  students: [{ id: 's1', label: 'Ana Pérez' }],
  grades: [{ id: 'g1', label: 'Primero A' }],
  semesters: [{ id: 'sem1', label: '2026-1' }],
};

describe('ReportsStudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listBulletinsStudentsPage.mockResolvedValue(pageFixture);
    mocks.listBulletinStudentFormOptions.mockResolvedValue(formOptionsFixture);
    mocks.createBulletinStudent.mockResolvedValue(rowsFixture[0]);
    mocks.updateBulletinStudent.mockResolvedValue(rowsFixture[0]);
    mocks.softDeleteBulletinStudent.mockResolvedValue(undefined);
  });

  it('redirects non-admin users to reports index', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <ReportsStudentsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/reports', { replace: true });
    });
  });

  it('renders normalized row values', async () => {
    render(() => <ReportsStudentsPage />);

    expect(await screen.findByText('Académico: Notas de periodo')).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Primero A')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('submits create modal payload', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByText('Ana Pérez');

    fireEvent.click(screen.getByText('Nuevo reporte'));

    await waitFor(() => {
      expect(mocks.listBulletinStudentFormOptions).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('Boletín'), { target: { value: 'b1' } });
    fireEvent.change(screen.getByLabelText('Estudiante'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.input(screen.getByLabelText('Nota'), { target: { value: '99' } });
    fireEvent.input(screen.getByLabelText('Comentarios'), { target: { value: 'Muy bien.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear reporte' }));

    await waitFor(() => {
      expect(mocks.createBulletinStudent).toHaveBeenCalledWith({
        bulletin_id: 'b1',
        student_id: 's1',
        grade_id: 'g1',
        semester_id: 'sem1',
        note: 99,
        comments: 'Muy bien.',
      });
    });
  });

  it('submits edit modal payload', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: 'Editar reporte rs1' }));

    await waitFor(() => {
      expect(mocks.listBulletinStudentFormOptions).toHaveBeenCalledTimes(1);
    });

    fireEvent.input(screen.getByLabelText('Nota'), { target: { value: '87' } });
    fireEvent.input(screen.getByLabelText('Comentarios'), { target: { value: 'Actualizado' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateBulletinStudent).toHaveBeenCalledWith('rs1', {
        bulletin_id: 'b1',
        student_id: 's1',
        grade_id: 'g1',
        semester_id: 'sem1',
        note: 87,
        comments: 'Actualizado',
      });
    });
  });

  it('soft deletes selected row', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar reporte rs1' }));
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.softDeleteBulletinStudent).toHaveBeenCalledWith('rs1');
    });
  });

  it('requests sorting when clicking a sortable header', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: 'Creado por' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'created_by_name',
        sortDirection: 'asc',
      });
    });
  });

  it('requests next page via pagination controls', async () => {
    mocks.listBulletinsStudentsPage.mockImplementation(async (page: number) => {
      if (page === 1) {
        return {
          items: [rowsFixture[0]],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }

      return {
        items: [{ ...rowsFixture[0], id: 'rs2', student_name: 'Luis Díaz' }],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    render(() => <ReportsStudentsPage />);
    await screen.findByText('Ana Pérez');

    fireEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'updated_at',
        sortDirection: 'desc',
      });
    });
  });

  it('blocks create submission for invalid note values', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByText('Ana Pérez');

    const assertInvalidNote = async (value: string, expectedMessage: string) => {
      fireEvent.click(screen.getByText('Nuevo reporte'));
      await waitFor(() => {
        expect(mocks.listBulletinStudentFormOptions).toHaveBeenCalled();
      });

      fireEvent.change(screen.getByLabelText('Boletín'), { target: { value: 'b1' } });
      fireEvent.change(screen.getByLabelText('Estudiante'), { target: { value: 's1' } });
      fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
      fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: 'sem1' } });
      fireEvent.input(screen.getByLabelText('Nota'), { target: { value } });
      fireEvent.click(screen.getByRole('button', { name: 'Crear reporte' }));

      expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
      expect(mocks.createBulletinStudent).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Crear reporte de estudiante' })).not.toBeInTheDocument();
      });
    };

    await assertInvalidNote('', 'Nota es obligatoria.');
    await assertInvalidNote('0', 'Nota debe ser mayor que 0.');
    await assertInvalidNote('-5', 'Nota debe ser mayor que 0.');
    await assertInvalidNote('2.5', 'Nota debe ser un número entero válido.');
  });
});
