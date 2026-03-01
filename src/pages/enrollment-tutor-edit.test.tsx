import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentTutorEditPage from './enrollment-tutor-edit';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: 'f1' },
  isAuthUserAdmin: vi.fn(),
  getFatherById: vi.fn(),
  listActiveStudents: vi.fn(),
  listLinksByFatherId: vi.fn(),
  updateFather: vi.fn(),
  replaceLinksForFather: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/fathers', () => ({
  getFatherById: mocks.getFatherById,
  updateFather: mocks.updateFather,
}));

vi.mock('../lib/pocketbase/students', () => ({
  listActiveStudents: mocks.listActiveStudents,
}));

vi.mock('../lib/pocketbase/students-fathers', () => ({
  STUDENT_FATHER_RELATIONSHIPS: ['father', 'mother', 'other'],
  listLinksByFatherId: mocks.listLinksByFatherId,
  replaceLinksForFather: mocks.replaceLinksForFather,
}));

const fatherFixture = {
  id: 'f1',
  full_name: 'Carlos Perez',
  document_id: '9001',
  phone_number: '300123',
  occupation: 'Ingeniero',
  company: 'ACME',
  email: 'carlos@example.com',
  address: 'Calle 1',
  is_active: true,
  student_names: ['Ana'],
};

const studentFixture = {
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
  father_names: [],
};

describe('EnrollmentTutorEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.id = 'f1';
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.getFatherById.mockResolvedValue(fatherFixture);
    mocks.listActiveStudents.mockResolvedValue([studentFixture]);
    mocks.listLinksByFatherId.mockResolvedValue([
      {
        id: 'l1',
        studentId: 's1',
        fatherId: 'f1',
        relationship: 'father',
        studentName: 'Ana',
        studentActive: true,
        fatherName: 'Carlos Perez',
        fatherActive: true,
      },
    ]);
    mocks.updateFather.mockResolvedValue(fatherFixture);
    mocks.replaceLinksForFather.mockResolvedValue(undefined);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentTutorEditPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('loads tutor data in form', async () => {
    render(() => <EnrollmentTutorEditPage />);

    expect(await screen.findByDisplayValue('Carlos Perez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9001')).toBeInTheDocument();
  });

  it('updates tutor and links then navigates back', async () => {
    render(() => <EnrollmentTutorEditPage />);
    await screen.findByDisplayValue('Carlos Perez');
    await waitFor(() => {
      expect(mocks.listLinksByFatherId).toHaveBeenCalled();
    });

    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Carlos P' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateFather).toHaveBeenCalledWith('f1', expect.objectContaining({
        full_name: 'Carlos P',
        document_id: '9001',
      }));
    });

    await waitFor(() => {
      expect(mocks.replaceLinksForFather).toHaveBeenCalledWith('f1', [
        {
          studentId: 's1',
          relationship: 'father',
        },
      ]);
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/tutors', { replace: true });
    });
  });

  it('shows validation when no active students exist', async () => {
    mocks.listActiveStudents.mockResolvedValue([]);
    render(() => <EnrollmentTutorEditPage />);
    await screen.findByDisplayValue('Carlos Perez');

    fireEvent.click(screen.getByText('Guardar cambios'));

    expect(await screen.findByText(/No hay estudiantes activos disponibles/)).toBeInTheDocument();
    expect(mocks.updateFather).not.toHaveBeenCalled();
  });

  it('accepts only numeric input in teléfono field', async () => {
    render(() => <EnrollmentTutorEditPage />);
    await screen.findByDisplayValue('Carlos Perez');

    const phoneInput = screen.getByLabelText('Teléfono') as HTMLInputElement;
    fireEvent.input(phoneInput, { target: { value: 'TEL-300A45' } });

    expect(phoneInput.value).toBe('30045');
  });
});
