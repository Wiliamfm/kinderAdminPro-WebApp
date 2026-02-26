import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentStudentsPage from './enrollment-students';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listActiveStudents: vi.fn(),
  createStudent: vi.fn(),
  deactivateStudent: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/students', () => ({
  listActiveStudents: mocks.listActiveStudents,
  createStudent: mocks.createStudent,
  deactivateStudent: mocks.deactivateStudent,
}));

const studentsFixture = [
  {
    id: 's1',
    name: 'Ana',
    date_of_birth: '2015-06-15T13:30:00.000Z',
    birth_place: 'Bogota',
    department: 'Cundinamarca',
    document_id: 'DOC-1',
    weight: 20.5,
    height: 115,
    blood_type: 'O+',
    social_security: 'SSN-1',
    allergies: 'Ninguna',
    active: true,
  },
];

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
    mocks.listActiveStudents.mockResolvedValue(studentsFixture);
    mocks.createStudent.mockResolvedValue(studentsFixture[0]);
    mocks.deactivateStudent.mockResolvedValue(undefined);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentStudentsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
    expect(mocks.listActiveStudents).not.toHaveBeenCalled();
  });

  it('renders students table with actions', async () => {
    render(() => <EnrollmentStudentsPage />);

    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Documento')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar estudiante Ana')).toBeInTheDocument();
    expect(screen.getByLabelText('Eliminar estudiante Ana')).toBeInTheDocument();
  });

  it('creates a student from modal', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByText('Nuevo estudiante'));
    await screen.findByRole('heading', { name: 'Crear estudiante' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Luis' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2016-01-10T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: 'DOC-2' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'A+' } });

    fireEvent.click(screen.getAllByText('Crear estudiante')[1]);

    await waitFor(() => {
      expect(mocks.createStudent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Luis',
          birth_place: 'Bogota',
          department: 'Cundinamarca',
          document_id: 'DOC-2',
          blood_type: 'A+',
          date_of_birth: expect.stringMatching(/Z$/),
        }),
      );
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
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: 'DOC-NEW' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'A+' } });

    fireEvent.click(screen.getAllByText('Crear estudiante')[1]);

    expect(await screen.findByText('El estudiante debe tener al menos 2 años.')).toBeInTheDocument();
    expect(mocks.createStudent).not.toHaveBeenCalled();
  });

  it('soft deletes a student from confirmation modal', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Eliminar estudiante Ana'));
    await screen.findByRole('heading', { name: 'Eliminar estudiante' });
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.deactivateStudent).toHaveBeenCalledWith('s1');
    });
  });

  it('navigates to edit page when clicking edit action', async () => {
    render(() => <EnrollmentStudentsPage />);
    await screen.findByText('Ana');

    fireEvent.click(screen.getByLabelText('Editar estudiante Ana'));

    expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/students/s1');
  });
});
