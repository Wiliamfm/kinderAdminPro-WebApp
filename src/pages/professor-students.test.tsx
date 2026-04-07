import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProfessorStudentsPage from './professor-students';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  canAccessModule: vi.fn(),
  getAuthUserId: vi.fn(),
  getEmployeeByUserId: vi.fn(),
  listGradesByEmployeeId: vi.fn(),
  listActiveStudentsByGradeIds: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
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
  listActiveStudentsByGradeIds: mocks.listActiveStudentsByGradeIds,
}));

const employee = {
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

describe('ProfessorStudentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessModule.mockReturnValue(true);
    mocks.getAuthUserId.mockReturnValue('u1');
    mocks.listGradesByEmployeeId.mockResolvedValue([]);
    mocks.listActiveStudentsByGradeIds.mockResolvedValue([]);
  });

  it('shows error state when no employee is linked to the logged-in user', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorStudentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no se encontró/i)).toBeInTheDocument();
    });
  });

  it('redirects to home when module access is denied', async () => {
    mocks.canAccessModule.mockReturnValue(false);
    mocks.getEmployeeByUserId.mockResolvedValue(null);

    render(() => <ProfessorStudentsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('shows empty state when employee has no assigned grades', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listGradesByEmployeeId.mockResolvedValue([]);

    render(() => <ProfessorStudentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no tienes grados asignados/i)).toBeInTheDocument();
    });
  });

  it('shows students when employee has assigned grades', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listGradesByEmployeeId.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30, employeeId: 'e1', employeeName: 'Ana' },
    ]);
    mocks.listActiveStudentsByGradeIds.mockResolvedValue([
      {
        id: 's1',
        name: 'Carlos',
        grade_id: 'g1',
        grade_name: 'Primero A',
        date_of_birth: '2015-06-15 13:30:00.000Z',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: null,
        height: null,
        blood_type: 'O+',
        social_security: '',
        allergies: '',
        active: true,
        father_names: [],
      },
    ]);

    render(() => <ProfessorStudentsPage />);

    await waitFor(() => {
      expect(screen.getByText('Carlos')).toBeInTheDocument();
    });
  });

  it('shows grouped grade sections when the professor has multiple grades', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listGradesByEmployeeId.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30, employeeId: 'e1', employeeName: 'Ana' },
      { id: 'g2', name: 'Segundo A', capacity: 32, employeeId: 'e1', employeeName: 'Ana' },
    ]);
    mocks.listActiveStudentsByGradeIds.mockResolvedValue([
      {
        id: 's1',
        name: 'Carlos',
        grade_id: 'g1',
        grade_name: 'Primero A',
        date_of_birth: '2015-06-15 13:30:00.000Z',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: null,
        height: null,
        blood_type: 'O+',
        social_security: '',
        allergies: '',
        active: true,
        father_names: [],
      },
    ]);

    render(() => <ProfessorStudentsPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Primero A' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Segundo A' })).toBeInTheDocument();
    });
    expect(screen.queryByText(/filtrar por grado/i)).not.toBeInTheDocument();
  });

  it('navigates to the student detail page when a row is clicked', async () => {
    mocks.getEmployeeByUserId.mockResolvedValue(employee);
    mocks.listGradesByEmployeeId.mockResolvedValue([
      { id: 'g1', name: 'Primero A', capacity: 30, employeeId: 'e1', employeeName: 'Ana' },
    ]);
    mocks.listActiveStudentsByGradeIds.mockResolvedValue([
      {
        id: 's1',
        name: 'Carlos',
        grade_id: 'g1',
        grade_name: 'Primero A',
        date_of_birth: '2015-06-15 13:30:00.000Z',
        birth_place: 'Bogota',
        department: 'Cundinamarca',
        document_id: 'DOC-1',
        weight: null,
        height: null,
        blood_type: 'O+',
        social_security: '',
        allergies: '',
        active: true,
        father_names: [],
      },
    ]);

    render(() => <ProfessorStudentsPage />);

    const rowLink = await screen.findByRole('link', { name: 'Ver detalle de Carlos' });
    fireEvent.click(rowLink);

    expect(mocks.navigate).toHaveBeenCalledWith('/professor/students/s1');
  });
});
