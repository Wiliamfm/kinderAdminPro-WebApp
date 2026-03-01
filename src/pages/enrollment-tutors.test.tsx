import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentTutorsPage from './enrollment-tutors';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listActiveStudents: vi.fn(),
  listActiveFathersPage: vi.fn(),
  createFather: vi.fn(),
  deleteFather: vi.fn(),
  createLinksForFather: vi.fn(),
  countLinksByFatherId: vi.fn(),
  deactivateFather: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/students', () => ({
  listActiveStudents: mocks.listActiveStudents,
}));

vi.mock('../lib/pocketbase/fathers', () => ({
  listActiveFathersPage: mocks.listActiveFathersPage,
  createFather: mocks.createFather,
  deactivateFather: mocks.deactivateFather,
  deleteFather: mocks.deleteFather,
}));

vi.mock('../lib/pocketbase/students-fathers', () => ({
  STUDENT_FATHER_RELATIONSHIPS: ['father', 'mother', 'other'],
  createLinksForFather: mocks.createLinksForFather,
  countLinksByFatherId: mocks.countLinksByFatherId,
}));

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
    father_names: [],
  },
];

const fathersFixture = [
  {
    id: 'f1',
    full_name: 'Carlos Perez',
    document_id: '2001',
    phone_number: '300',
    occupation: 'Ingeniero',
    company: 'ACME',
    email: 'carlos@example.com',
    address: 'Calle 1',
    is_active: true,
    student_names: ['Ana'],
  },
];

const fathersPageFixture = {
  items: fathersFixture,
  page: 1,
  perPage: 10,
  totalItems: 1,
  totalPages: 1,
};

describe('EnrollmentTutorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listActiveStudents.mockResolvedValue(studentsFixture);
    mocks.listActiveFathersPage.mockResolvedValue(fathersPageFixture);
    mocks.createFather.mockResolvedValue(fathersFixture[0]);
    mocks.createLinksForFather.mockResolvedValue(undefined);
    mocks.deleteFather.mockResolvedValue(undefined);
    mocks.countLinksByFatherId.mockResolvedValue(0);
    mocks.deactivateFather.mockResolvedValue(undefined);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentTutorsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('renders tutors table with associated students column', async () => {
    render(() => <EnrollmentTutorsPage />);

    expect(await screen.findByText('Carlos Perez')).toBeInTheDocument();
    expect(screen.getByText('Estudiantes Asociados')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('keeps page stable when active students request is auto-cancelled', async () => {
    mocks.listActiveStudents.mockRejectedValue({
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: false,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(() => <EnrollmentTutorsPage />);

    expect(await screen.findByText('Carlos Perez')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring auto-cancelled active students request in tutors page.',
      expect.anything(),
    );

    warnSpy.mockRestore();
  });

  it('requests tutors sorted by document when header is clicked', async () => {
    render(() => <EnrollmentTutorsPage />);
    await screen.findByText('Carlos Perez');

    fireEvent.click(screen.getByRole('button', { name: 'Documento' }));

    await waitFor(() => {
      expect(mocks.listActiveFathersPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'document_id',
        sortDirection: 'asc',
      });
    });
  });

  it('creates a tutor with at least one student link', async () => {
    render(() => <EnrollmentTutorsPage />);
    await screen.findByText('Carlos Perez');

    fireEvent.click(screen.getByText('Nuevo tutor'));
    await screen.findByRole('heading', { name: 'Crear tutor' });

    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Laura' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '9001' } });
    fireEvent.change(screen.getByDisplayValue('Selecciona un estudiante'), { target: { value: 's1' } });

    fireEvent.click(screen.getAllByText('Crear tutor')[1]);

    await waitFor(() => {
      expect(mocks.createFather).toHaveBeenCalledWith(expect.objectContaining({
        full_name: 'Laura',
        document_id: '9001',
      }));
    });

    await waitFor(() => {
      expect(mocks.createLinksForFather).toHaveBeenCalledWith('f1', [
        {
          studentId: 's1',
          relationship: 'father',
        },
      ]);
    });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Crear tutor' })).not.toBeInTheDocument();
    });
  });

  it('blocks create when there are no active students', async () => {
    mocks.listActiveStudents.mockResolvedValue([]);
    render(() => <EnrollmentTutorsPage />);
    await screen.findByText('Carlos Perez');

    fireEvent.click(screen.getByText('Nuevo tutor'));
    await screen.findByRole('heading', { name: 'Crear tutor' });

    fireEvent.input(screen.getByLabelText('Nombre completo'), { target: { value: 'Laura' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '9001' } });

    fireEvent.click(screen.getAllByText('Crear tutor')[1]);

    expect(
      await screen.findByText(/No hay estudiantes activos disponibles/),
    ).toBeInTheDocument();
    expect(mocks.createFather).not.toHaveBeenCalled();
  });

  it('accepts only numeric input in teléfono field', async () => {
    render(() => <EnrollmentTutorsPage />);
    await screen.findByText('Carlos Perez');

    fireEvent.click(screen.getByText('Nuevo tutor'));
    await screen.findByRole('heading', { name: 'Crear tutor' });

    const phoneInput = screen.getByLabelText('Teléfono') as HTMLInputElement;
    fireEvent.input(phoneInput, { target: { value: 'TEL-300A45' } });

    expect(phoneInput.value).toBe('30045');
  });

  it('blocks delete when tutor has associated students', async () => {
    mocks.countLinksByFatherId.mockResolvedValue(2);
    render(() => <EnrollmentTutorsPage />);
    await screen.findByText('Carlos Perez');

    fireEvent.click(screen.getByLabelText('Eliminar tutor Carlos Perez'));
    fireEvent.click(screen.getByText('Eliminar'));

    await waitFor(() => {
      expect(mocks.countLinksByFatherId).toHaveBeenCalledWith('f1');
    });
    expect(mocks.deactivateFather).not.toHaveBeenCalled();
  });

  it('navigates to tutor edit page from action button', async () => {
    render(() => <EnrollmentTutorsPage />);
    await screen.findByText('Carlos Perez');

    fireEvent.click(screen.getByLabelText('Editar tutor Carlos Perez'));

    expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/tutors/f1');
  });
});
