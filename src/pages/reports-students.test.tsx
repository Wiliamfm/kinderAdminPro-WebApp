import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
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
  students: [
    { id: 's1', label: 'Ana Pérez' },
    { id: 's2', label: 'Luis Díaz' },
  ],
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
    expect(screen.getByRole('cell', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Primero A' })).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('requests initial list with created date descending defaults', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    expect(mocks.listBulletinsStudentsPage).toHaveBeenCalledWith(1, 10, {
      sortField: 'created_at',
      sortDirection: 'desc',
      gradeId: '',
      semesterId: '',
      studentIds: [],
    });
  });

  it('submits create modal payload', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByText('Nuevo reporte'));

    await waitFor(() => {
      expect(mocks.listBulletinStudentFormOptions).toHaveBeenCalledTimes(1);
    });

    const createModalHeading = await screen.findByRole('heading', { name: 'Crear reporte de estudiante' });
    const createModal = createModalHeading.closest('div');
    expect(createModal).not.toBeNull();
    const createModalQueries = within(createModal as HTMLElement);

    fireEvent.change(createModalQueries.getByLabelText('Boletín'), { target: { value: 'b1' } });
    fireEvent.change(createModalQueries.getByLabelText('Estudiante'), { target: { value: 's1' } });
    fireEvent.change(createModalQueries.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.change(createModalQueries.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.input(createModalQueries.getByLabelText('Nota'), { target: { value: '99' } });
    fireEvent.input(createModalQueries.getByLabelText('Comentarios'), { target: { value: 'Muy bien.' } });
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
    await screen.findByRole('cell', { name: 'Ana Pérez' });

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
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar reporte rs1' }));
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.softDeleteBulletinStudent).toHaveBeenCalledWith('rs1');
    });
  });

  it('requests sorting when clicking a sortable header', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByRole('button', { name: 'Creado por' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'created_by_name',
        sortDirection: 'asc',
        gradeId: '',
        semesterId: '',
        studentIds: [],
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
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        gradeId: '',
        semesterId: '',
        studentIds: [],
      });
    });
  });

  it('applies grade and semester filters', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        gradeId: 'g1',
        semesterId: 'sem1',
        studentIds: [],
      });
    });
  });

  it('filters exactly by selected specific students', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    const specificStudentInput = screen.getByLabelText('Seleccionar estudiantes específicos');
    fireEvent.input(specificStudentInput, { target: { value: 'Ana Pérez · s1' } });
    fireEvent.input(specificStudentInput, { target: { value: 'Luis Díaz · s2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        gradeId: '',
        semesterId: '',
        studentIds: ['s1', 's2'],
      });
    });
  });

  it('clears filters and restores created date descending sort', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Semestre'), { target: { value: 'sem1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        gradeId: 'g1',
        semesterId: 'sem1',
        studentIds: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Creado por' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_by_name',
        sortDirection: 'asc',
        gradeId: 'g1',
        semesterId: 'sem1',
        studentIds: [],
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    await waitFor(() => {
      expect(mocks.listBulletinsStudentsPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'created_at',
        sortDirection: 'desc',
        gradeId: '',
        semesterId: '',
        studentIds: [],
      });
    });
  });

  it('blocks create submission for invalid note values', async () => {
    render(() => <ReportsStudentsPage />);
    await screen.findByRole('cell', { name: 'Ana Pérez' });

    const assertInvalidNote = async (value: string, expectedMessage: string) => {
      fireEvent.click(screen.getByText('Nuevo reporte'));
      await waitFor(() => {
        expect(mocks.listBulletinStudentFormOptions).toHaveBeenCalled();
      });

      const createModalHeading = await screen.findByRole('heading', { name: 'Crear reporte de estudiante' });
      const createModal = createModalHeading.closest('div');
      expect(createModal).not.toBeNull();
      const createModalQueries = within(createModal as HTMLElement);

      fireEvent.change(createModalQueries.getByLabelText('Boletín'), { target: { value: 'b1' } });
      fireEvent.change(createModalQueries.getByLabelText('Estudiante'), { target: { value: 's1' } });
      fireEvent.change(createModalQueries.getByLabelText('Grado'), { target: { value: 'g1' } });
      fireEvent.change(createModalQueries.getByLabelText('Semestre'), { target: { value: 'sem1' } });
      fireEvent.input(createModalQueries.getByLabelText('Nota'), { target: { value } });
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
