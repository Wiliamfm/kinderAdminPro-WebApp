import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentStudentEditPage from './enrollment-student-edit';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: 's1' },
  isAuthUserAdmin: vi.fn(),
  listGrades: vi.fn(),
  listActiveFathers: vi.fn(),
  getStudentById: vi.fn(),
  listLinksByStudentId: vi.fn(),
  updateStudent: vi.fn(),
  replaceLinksForStudent: vi.fn(),
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

vi.mock('../lib/pocketbase/grades', () => ({
  listGrades: mocks.listGrades,
}));

vi.mock('../lib/pocketbase/fathers', () => ({
  listActiveFathers: mocks.listActiveFathers,
}));

vi.mock('../lib/pocketbase/students-fathers', () => ({
  STUDENT_FATHER_RELATIONSHIPS: ['father', 'mother', 'other'],
  listLinksByStudentId: mocks.listLinksByStudentId,
  replaceLinksForStudent: mocks.replaceLinksForStudent,
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
  father_names: ['Carlos Perez'],
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

describe('EnrollmentStudentEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.id = 's1';
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listGrades.mockResolvedValue(gradesFixture);
    mocks.listActiveFathers.mockResolvedValue(fathersFixture);
    mocks.getStudentById.mockResolvedValue(studentFixture);
    mocks.listLinksByStudentId.mockResolvedValue([
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
    mocks.updateStudent.mockResolvedValue(studentFixture);
    mocks.replaceLinksForStudent.mockResolvedValue(undefined);
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
    const gradeSelect = screen.getByLabelText('Grado') as HTMLSelectElement;
    await waitFor(() => {
      expect(gradeSelect.value).toBe('g1');
    });
    expect(screen.getByDisplayValue('Bogota')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1001')).toBeInTheDocument();
  });

  it('keeps page stable when active fathers request is auto-cancelled', async () => {
    mocks.listActiveFathers.mockRejectedValue({
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: false,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(() => <EnrollmentStudentEditPage />);

    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(
      'Ignoring auto-cancelled active fathers request in student edit page.',
      expect.anything(),
    );

    warnSpy.mockRestore();
  });

  it('updates student and links then navigates back to list', async () => {
    render(() => <EnrollmentStudentEditPage />);
    await screen.findByDisplayValue('Ana');
    const gradeSelect = screen.getByLabelText('Grado') as HTMLSelectElement;
    await waitFor(() => {
      expect(gradeSelect.value).toBe('g1');
    });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Ana Maria' } });
    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), { target: { value: '2015-06-15T08:30' } });
    fireEvent.input(screen.getByLabelText('Lugar de nacimiento'), { target: { value: 'Bogota' } });
    fireEvent.input(screen.getByLabelText('Departamento'), { target: { value: 'Cundinamarca' } });
    fireEvent.input(screen.getByLabelText('Documento'), { target: { value: '1001' } });
    fireEvent.change(gradeSelect, { target: { value: 'g1' } });
    fireEvent.change(screen.getByLabelText('Tipo de sangre'), { target: { value: 'O+' } });
    fireEvent.input(screen.getByLabelText('Alergias'), { target: { value: 'Polen' } });

    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateStudent).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          name: 'Ana Maria',
          document_id: '1001',
          grade_id: 'g1',
          allergies: 'Polen',
          date_of_birth: expect.stringMatching(/Z$/),
        }),
      );
    });

    await waitFor(() => {
      expect(mocks.replaceLinksForStudent).toHaveBeenCalledWith('s1', [
        {
          fatherId: 'f1',
          relationship: 'father',
        },
      ]);
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/students', { replace: true });
    });
  });

  it('blocks update when student is younger than 2 years', async () => {
    render(() => <EnrollmentStudentEditPage />);
    await screen.findByDisplayValue('Ana');

    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 1);

    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), {
      target: { value: toDateTimeLocalValue(tooYoung) },
    });

    fireEvent.click(screen.getByText('Guardar cambios'));

    expect(await screen.findByText('El estudiante debe tener al menos 2 años.')).toBeInTheDocument();
    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it('blocks update when there are no active tutors', async () => {
    mocks.listActiveFathers.mockResolvedValue([]);
    render(() => <EnrollmentStudentEditPage />);
    await screen.findByDisplayValue('Ana');

    fireEvent.click(screen.getByText('Guardar cambios'));

    expect(await screen.findByText(/No hay tutores activos disponibles/)).toBeInTheDocument();
    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it('shows realtime age validation after changing birth date', async () => {
    render(() => <EnrollmentStudentEditPage />);
    await screen.findByDisplayValue('Ana');

    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 1);

    fireEvent.input(screen.getByLabelText('Fecha de nacimiento'), {
      target: { value: toDateTimeLocalValue(tooYoung) },
    });

    expect(await screen.findByText('El estudiante debe tener al menos 2 años.')).toBeInTheDocument();
    expect(mocks.updateStudent).not.toHaveBeenCalled();
  });

  it('accepts only numeric input in documento field', async () => {
    render(() => <EnrollmentStudentEditPage />);
    await screen.findByDisplayValue('Ana');

    const documentInput = screen.getByLabelText('Documento') as HTMLInputElement;
    fireEvent.input(documentInput, { target: { value: 'AB-45X' } });

    expect(documentInput.value).toBe('45');
  });
});
