import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentSemestersPage from './enrollment-semesters';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listSemestersPage: vi.fn(),
  createSemester: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/semesters', () => ({
  listSemestersPage: mocks.listSemestersPage,
  createSemester: mocks.createSemester,
}));

const semestersFixture = [
  {
    id: 'sem1',
    name: '2026-A',
    start_date: '2026-01-15T05:00:00.000Z',
    end_date: '2026-06-15T05:00:00.000Z',
    created_at: '2026-01-01T05:00:00.000Z',
    updated_at: '2026-01-01T05:00:00.000Z',
  },
];

const semestersPageFixture = {
  items: semestersFixture,
  page: 1,
  perPage: 10,
  totalItems: 1,
  totalPages: 1,
};

describe('EnrollmentSemestersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listSemestersPage.mockResolvedValue(semestersPageFixture);
    mocks.createSemester.mockResolvedValue(semestersFixture[0]);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentSemestersPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('renders semesters table and edit action', async () => {
    render(() => <EnrollmentSemestersPage />);

    expect(await screen.findByText('2026-A')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
    expect(screen.getByLabelText('Editar semestre 2026-A')).toBeInTheDocument();
  });

  it('requests semesters sorted when header is clicked', async () => {
    render(() => <EnrollmentSemestersPage />);
    await screen.findByText('2026-A');

    fireEvent.click(screen.getByRole('button', { name: 'Semestre' }));

    await waitFor(() => {
      expect(mocks.listSemestersPage).toHaveBeenLastCalledWith(1, 10, {
        sortField: 'name',
        sortDirection: 'desc',
      });
    });
  });

  it('creates a semester with valid dates', async () => {
    render(() => <EnrollmentSemestersPage />);
    await screen.findByText('2026-A');

    fireEvent.click(screen.getByText('Nuevo semestre'));
    await screen.findByRole('heading', { name: 'Crear semestre' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: '2026-B' } });
    fireEvent.input(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-07-01' } });
    fireEvent.input(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-12-01' } });

    fireEvent.click(screen.getAllByText('Crear semestre')[1]);

    await waitFor(() => {
      expect(mocks.createSemester).toHaveBeenCalledWith(expect.objectContaining({
        name: '2026-B',
        start_date: expect.stringMatching(/Z$/),
        end_date: expect.stringMatching(/Z$/),
      }));
    });
  });

  it('blocks create when end date is not at least one day after start date', async () => {
    render(() => <EnrollmentSemestersPage />);
    await screen.findByText('2026-A');

    fireEvent.click(screen.getByText('Nuevo semestre'));
    await screen.findByRole('heading', { name: 'Crear semestre' });

    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: '2026-C' } });
    fireEvent.input(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-07-01' } });
    fireEvent.input(screen.getByLabelText('Fecha de fin'), { target: { value: '2026-07-01' } });

    fireEvent.click(screen.getAllByText('Crear semestre')[1]);

    expect(
      await screen.findByText('La fecha de fin debe ser al menos 1 día posterior a la fecha de inicio.'),
    ).toBeInTheDocument();
    expect(mocks.createSemester).not.toHaveBeenCalled();
  });

  it('navigates to edit page from row action', async () => {
    render(() => <EnrollmentSemestersPage />);
    await screen.findByText('2026-A');

    fireEvent.click(screen.getByLabelText('Editar semestre 2026-A'));

    expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management/semesters/sem1');
  });
});
