import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentStudentEditPage from './enrollment-student-edit';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: 's1' },
  isAuthUserAdmin: vi.fn(),
  getStudentById: vi.fn(),
  updateStudent: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/students', () => ({
  getStudentById: mocks.getStudentById,
  updateStudent: mocks.updateStudent,
}));

const studentFixture = {
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
};

describe('EnrollmentStudentEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.id = 's1';
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.getStudentById.mockResolvedValue(studentFixture);
    mocks.updateStudent.mockResolvedValue(studentFixture);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentStudentEditPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('loads student data into the edit form', async () => {
    render(() => <EnrollmentStudentEditPage />);

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bogota')).toBeInTheDocument();
    expect(screen.getByDisplayValue('DOC-1')).toBeInTheDocument();
  });

  it('updates student and navigates back to list', async () => {
    render(() => <EnrollmentStudentEditPage />);
    await screen.findByDisplayValue('Ana');

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Ana Maria' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2015-06-15T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: 'DOC-1' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'O+' } });
    fireEvent.input(screen.getByLabelText('Alergias'), { target: { value: 'Polen' } });

    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateStudent).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          name: 'Ana Maria',
          document_id: 'DOC-1',
          allergies: 'Polen',
          date_of_birth: expect.stringMatching(/Z$/),
        }),
      );
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/students', { replace: true });
    });
  });
});
