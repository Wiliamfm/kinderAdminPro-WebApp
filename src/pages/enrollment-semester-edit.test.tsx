import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentSemesterEditPage from './enrollment-semester-edit';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  params: { id: 'sem1' },
  isAuthUserAdmin: vi.fn(),
  getSemesterById: vi.fn(),
  updateSemester: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/semesters', () => ({
  getSemesterById: mocks.getSemesterById,
  updateSemester: mocks.updateSemester,
}));

const semesterFixture = {
  id: 'sem1',
  name: '2026-A',
  start_date: '2026-01-15T05:00:00.000Z',
  end_date: '2026-06-15T05:00:00.000Z',
  created_at: '2026-01-01T05:00:00.000Z',
  updated_at: '2026-01-01T05:00:00.000Z',
};

describe('EnrollmentSemesterEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params.id = 'sem1';
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.getSemesterById.mockResolvedValue(semesterFixture);
    mocks.updateSemester.mockResolvedValue(semesterFixture);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentSemesterEditPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('loads semester data into the form', async () => {
    render(() => <EnrollmentSemesterEditPage />);

    expect(await screen.findByDisplayValue('2026-A')).toBeInTheDocument();
    const startDateInput = screen.getByLabelText('Fecha de inicio') as HTMLInputElement;
    const endDateInput = screen.getByLabelText('Fecha de fin') as HTMLInputElement;

    expect(startDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(endDateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('updates semester and navigates back', async () => {
    render(() => <EnrollmentSemesterEditPage />);
    await screen.findByDisplayValue('2026-A');

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: '2026-B' } });
    fireEvent.input(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-07-01' } });
    fireEvent.input(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-12-01' } });

    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateSemester).toHaveBeenCalledWith('sem1', expect.objectContaining({
        name: '2026-B',
        start_date: expect.stringMatching(/Z$/),
        end_date: expect.stringMatching(/Z$/),
      }));
    });

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/semesters', { replace: true });
    });
  });

  it('blocks save when end date is not at least one day after start date', async () => {
    render(() => <EnrollmentSemesterEditPage />);
    await screen.findByDisplayValue('2026-A');

    fireEvent.input(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-07-01' } });
    fireEvent.input(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-07-01' } });

    fireEvent.click(screen.getByText('Guardar cambios'));

    expect(
      await screen.findByText('La fecha de fin debe ser al menos 1 día posterior a la fecha de inicio.'),
    ).toBeInTheDocument();
    expect(mocks.updateSemester).not.toHaveBeenCalled();
  });
});
