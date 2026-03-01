import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentStudentsPage from './enrollment-students';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listGrades: vi.fn(),
  listActiveFathers: vi.fn(),
  listActiveStudentsPage: vi.fn(),
  createStudent: vi.fn(),
  deleteStudent: vi.fn(),
  deactivateStudent: vi.fn(),
  createLinksForStudent: vi.fn(),
  countLinksByStudentId: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/students', () => ({
  listActiveStudentsPage: mocks.listActiveStudentsPage,
  createStudent: mocks.createStudent,
  deleteStudent: mocks.deleteStudent,
  deactivateStudent: mocks.deactivateStudent,
}));

vi.mock('../lib/pocketbase/grades', () => ({
  listGrades: mocks.listGrades,
}));

vi.mock('../lib/pocketbase/fathers', () => ({
  listActiveFathers: mocks.listActiveFathers,
}));

vi.mock('../lib/pocketbase/students-fathers', () => ({
  STUDENT_FATHER_RELATIONSHIPS: ['father', 'mother', 'other'],
  createLinksForStudent: mocks.createLinksForStudent,
  countLinksByStudentId: mocks.countLinksByStudentId,
}));

const gradesFixture = [
  { id: 'g1', name: 'Primero A', capacity: 30 },
];

const fathersFixture = [
  {
    id: 'f1',
    full_name: 'Carlos Perez',
    document_id: '2001',
    phone_number: '',
    occupation: '',
    company: '',
    email: '',
    address: '',
    is_active: true,
    student_names: [],
  },
];

const studentsFixture = [
  {
    id: 's1',
    name: 'Ana',
    grade_id: 'g1',
    grade_name: 'Primero A',
    date_of_birth: '2015-06-15T13:30:00.000Z',
    birth_place: 'Bogota',
    department: 'Cundinamarca',
    document_id: '1001',
    weight: 20.5,
    height: 115,
    blood_type: 'O+',
    social_security: 'SSN-1',
    allergies: 'Ninguna',
    active: true,
    father_names: ['Carlos Perez'],
  },
];

const studentsPageFixture = {
  items: studentsFixture,
  page: 1,
  perPage: 10,
  totalItems: studentsFixture.length,
  totalPages: 1,
};

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

describe('EnrollmentStudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listGrades.mockResolvedValue(gradesFixture);
    mocks.listActiveFathers.mockResolvedValue(fathersFixture);
    mocks.listActiveStudentsPage.mockResolvedValue(studentsPageFixture);
    mocks.createStudent.mockResolvedValue(studentsFixture[0]);
    mocks.createLinksForStudent.mockResolvedValue(undefined);
    mocks.deleteStudent.mockResolvedValue(undefined);
    mocks.deactivateStudent.mockResolvedValue(undefined);
    mocks.countLinksByStudentId.mockResolvedValue(0);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentStudentsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
    expect(mocks.listActiveStudentsPage).not.toHaveBeenCalled();
  });

  it('renders students table with associated fathers and actions', async () => {
    render(() => <EnrollmentStudentsPage />);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Primero A')).toBeInTheDocument();
    expect(screen.getByText('Tutores asociados')).toBeInTheDocument();
    expect(screen.getByText('Carlos Perez')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar estudiante Ana')).toBeInTheDocument();
    expect(screen.getByLabelText('Eliminar estudiante Ana')).toBeInTheDocument();
  });

  it('keeps page stable when active fathers request is auto-cancelled', async () => {
    mocks.listActiveFathers.mockRejectedValue({
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: false,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(() => <EnrollmentStudentsPage />);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring auto-cancelled active fathers request in students page.',
      expect.anything(),
    );

    warnSpy.mockRestore();
  });

  it('requests students sorted by document column when header is clicked', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByRole('button', { name: 'Documento' }));
    await waitFor(() => {
      expect(mocks.listActiveStudentsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'document_id',
        sortDirection: 'asc',
      });
    });
  });

  it('creates a student and links at least one tutor from modal', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo estudiante'));
    await screen.findByRole('heading', { name: 'Crear estudiante' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Luis' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2016-01-10T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '1002' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'A+' } });

    const fatherSelect = screen
      .getAllByRole('combobox')
      .find((element) => within(element).queryByRole('option', { name: 'Carlos Perez' }));
    if (!fatherSelect) {
      throw new Error('Father select was not found');
    }
    fireEvent.change(fatherSelect, { target: { value: 'f1' } });

    fireEvent.click(screen.getAllByText('Crear estudiante')[1]);

    await waitFor(() => {
      expect(mocks.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Luis',
          birth_place: 'Bogota',
          department: 'Cundinamarca',
          document_id: '1002',
          grade_id: 'g1',
          blood_type: 'A+',
          date_of_birth: expect.stringMatching(/Z$/),
        }),
      );
    });

    await waitFor(() => {
      expect(mocks.createLinksForStudent).toHaveBeenCalledWith('s1', [
        {
          fatherId: 'f1',
          relationship: 'father',
        },
      ]);
    });
  });

  it('blocks create when student is younger than 2 years', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 1);

    fireEvent.click(screen.getByText('Nuevo estudiante'));
    await screen.findByRole('heading', { name: 'Crear estudiante' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Bebe' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), {
      target: { value: toDateTimeLocalValue(tooYoung) },
    });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '9003' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'A+' } });

    fireEvent.click(screen.getAllByText('Crear estudiante')[1]);

    expect(await screen.findByText('El estudiante debe tener al menos 2 años.')).toBeInTheDocument();
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it('blocks create when there are no active tutors', async () => {
    mocks.listActiveFathers.mockResolvedValue([]);
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo estudiante'));
    await screen.findByRole('heading', { name: 'Crear estudiante' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Luis' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2016-01-10T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '1002' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'A+' } });

    fireEvent.click(screen.getAllByText('Crear estudiante')[1]);

    expect(await screen.findByText(/No hay tutores activos disponibles/)).toBeInTheDocument();
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it('shows realtime age validation after touching birth date', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 1);

    fireEvent.click(screen.getByText('Nuevo estudiante'));
    await screen.findByRole('heading', { name: 'Crear estudiante' });

    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), {
      target: { value: toDateTimeLocalValue(tooYoung) },
    });

    expect(await screen.findByText('El estudiante debe tener al menos 2 años.')).toBeInTheDocument();
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it('accepts only numeric input in documento field', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo estudiante'));
    await screen.findByRole('heading', { name: 'Crear estudiante' });

    const documentInput = screen.getByLabelText('Documento') as HTMLInputElement;
    fireEvent.input(documentInput, { target: { value: 'DOC-123A' } });

    expect(documentInput.value).toBe('123');
  });

  it('soft deletes a student from confirmation modal', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Eliminar estudiante Ana'));
    await screen.findByRole('heading', { name: 'Eliminar estudiante' });
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.countLinksByStudentId).toHaveBeenCalledWith('s1');
      expect(mocks.deactivateStudent).toHaveBeenCalledWith('s1');
    });
  });

  it('blocks delete when student has associated tutors', async () => {
    mocks.countLinksByStudentId.mockResolvedValue(2);
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Eliminar estudiante Ana'));
    await screen.findByRole('heading', { name: 'Eliminar estudiante' });
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.countLinksByStudentId).toHaveBeenCalledWith('s1');
    });
    expect(mocks.deactivateStudent).not.toHaveBeenCalled();
  });

  it('navigates to edit page when clicking edit action', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Editar estudiante Ana'));

    expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/students/s1');
  });

  it('supports students pagination next and previous', async () => {
    mocks.listActiveStudentsPage.mockImplementation(async (page: number) => {
      if (page === 1) {
        return {
          items: [studentsFixture[0]],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }

      return {
        items: [
          {
            ...studentsFixture[0],
            id: 's2',
            name: 'Bruno',
            document_id: '1002',
            father_names: ['Laura'],
          },
        ],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Siguiente'));
    await waitFor(() => {
      expect(mocks.listActiveStudentsPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'name',
        sortDirection: 'asc',
      });
    });

    fireEvent.click(screen.getByText('Anterior'));
    await waitFor(() => {
      expect(mocks.listActiveStudentsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'name',
        sortDirection: 'asc',
      });
    });
  });
});
