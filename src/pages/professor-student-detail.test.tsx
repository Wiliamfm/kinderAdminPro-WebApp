import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorStudentDetailPage from './professor-student-detail';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: 's1' },
  canAccessModule: vi.fn(),
  getAuthUserId: vi.fn(),
  getEmployeeByUserId: vi.fn(),
  listGradesByEmployeeId: vi.fn(),
  getStudentById: vi.fn(),
  getCurrentSemester: vi.fn(),
  listBulletinsByGradeId: vi.fn(),
  listBulletinStudentsByStudentAndGrade: vi.fn(),
  createBulletinStudent: vi.fn(),
  updateBulletinStudent: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  canAccessModule: mocks.canAccessModule,
}));

vi.mock('../lib/pocketbase/users', () => ({
  getAuthUserId: mocks.getAuthUserId,
}));

vi.mock('../lib/pocketbase/employees', () => ({
  getEmployeeByUserId: mocks.getEmployeeByUserId,
}));

vi.mock('../lib/pocketbase/grades', () => ({
  listGradesByEmployeeId: mocks.listGradesByEmployeeId,
}));

vi.mock('../lib/pocketbase/students', () => ({
  getStudentById: mocks.getStudentById,
}));

vi.mock('../lib/pocketbase/semesters', () => ({
  getCurrentSemester: mocks.getCurrentSemester,
}));

vi.mock('../lib/pocketbase/bulletins', () => ({
  listBulletinsByGradeId: mocks.listBulletinsByGradeId,
}));

vi.mock('../lib/pocketbase/bulletins-students', () => ({
  listBulletinStudentsByStudentAndGrade: mocks.listBulletinStudentsByStudentAndGrade,
  createBulletinStudent: mocks.createBulletinStudent,
  updateBulletinStudent: mocks.updateBulletinStudent,
}));

const employeeFixture = {
  id: 'e1',
  name: 'Ana',
  documentId: '123',
  email: 'ana@test.com',
  phone: '300',
  address: 'Calle 1',
  emergency_contact: 'Luis',
  active: true,
  userId: 'u1',
  jobId: 'j1',
  jobName: 'Docente',
  jobSalary: 1000,
  cvFileName: '',
  cvUrl: null,
};

const studentFixture = {
  id: 's1',
  name: 'Carlos',
  grade_id: 'g1',
  grade_name: 'Primero A',
  date_of_birth: '2015-06-15T13:30:00.000Z',
  birth_place: 'Bogota',
  department: 'Cundinamarca',
  document_id: '1001',
  weight: null,
  height: null,
  blood_type: 'O+',
  social_security: '',
  allergies: '',
  active: true,
  father_names: [],
};

const bulletinsFixture = [
  {
    id: 'b1',
    category_id: 'c1',
    category_name: 'Académico',
    description: 'Matemáticas',
    grade_id: 'g1',
    grade_name: 'Primero A',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-02T00:00:00.000Z',
    created_by: 'u1',
    created_by_name: 'Admin',
    updated_by: 'u1',
    updated_by_name: 'Admin',
    is_deleted: false,
  },
];

describe('ProfessorStudentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.id = 's1';
    mocks.canAccessModule.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u1');
    mocks.getEmployeeByUserId.mockResolvedValue(employeeFixture);
    mocks.listGradesByEmployeeId.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30, employeeId: 'e1', employeeName: 'Ana' },
    ]);
    mocks.getStudentById.mockResolvedValue(studentFixture);
    mocks.getCurrentSemester.mockResolvedValue({
      id: 'sem1',
      name: '2026-1',
      start_date: '2026-01-01T00:00:00.000Z',
      end_date: '2026-06-30T00:00:00.000Z',
      is_current: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    mocks.listBulletinsByGradeId.mockResolvedValue(bulletinsFixture);
    mocks.listBulletinStudentsByStudentAndGrade.mockResolvedValue([]);
    mocks.createBulletinStudent.mockImplementation(async (payload) => ({
      id: 'bs1',
      bulletin_id: payload.bulletin_id,
      bulletin_category_name: 'Académico',
      bulletin_description: 'Matemáticas',
      bulletin_label: 'Académico: Matemáticas',
      student_id: payload.student_id,
      student_name: 'Carlos',
      student_document_id: '1001',
      grade_id: payload.grade_id,
      grade_name: 'Primero A',
      semester_id: payload.semester_id,
      semester_name: '2026-1',
      note: payload.note,
      comments: payload.comments ?? '',
      created_at: '2026-04-06T00:00:00.000Z',
      updated_at: '2026-04-06T00:00:00.000Z',
      created_by: 'u1',
      created_by_name: 'Ana',
      updated_by: 'u1',
      updated_by_name: 'Ana',
      is_deleted: false,
    }));
  });

  it('redirects back to the list when the student grade is not assigned to the professor', async () => {
    mocks.listGradesByEmployeeId.mockResolvedValue([
      { id: 'g2', name: 'Segundo A', capacity: 30, employeeId: 'e1', employeeName: 'Ana' },
    ]);

    render(() => <ProfessorStudentDetailPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/professor/students', { replace: true });
    });
  });

  it('creates a bulletin entry inline for the current semester', async () => {
    render(() => <ProfessorStudentDetailPage />);

    const addButton = await screen.findByRole('button', { name: 'Agregar' });
    fireEvent.click(addButton);

    fireEvent.input(screen.getByLabelText('Nota para Matemáticas'), {
      target: { value: '8.5' },
    });
    fireEvent.input(screen.getByLabelText('Comentarios para Matemáticas'), {
      target: { value: 'Buen trabajo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(mocks.createBulletinStudent).toHaveBeenCalledWith({
        bulletin_id: 'b1',
        student_id: 's1',
        grade_id: 'g1',
        semester_id: 'sem1',
        note: 8.5,
        comments: 'Buen trabajo',
      });
    });
    expect(await screen.findByText('8.5')).toBeInTheDocument();
  });

  it('shows a banner and disables actions when no current semester is configured', async () => {
    mocks.getCurrentSemester.mockResolvedValue(null);

    render(() => <ProfessorStudentDetailPage />);

    expect(await screen.findByText(/no hay un trimestre activo configurado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });
});
