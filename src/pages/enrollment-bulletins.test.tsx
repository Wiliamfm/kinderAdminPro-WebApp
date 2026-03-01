import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EnrollmentBulletinsPage from './enrollment-bulletins';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isAuthUserAdmin: vi.fn(),
  listGrades: vi.fn(),
  listBulletinCategories: vi.fn(),
  listBulletinCategoriesPage: vi.fn(),
  createBulletinCategory: vi.fn(),
  updateBulletinCategory: vi.fn(),
  deleteBulletinCategory: vi.fn(),
  countBulletinsByCategoryId: vi.fn(),
  listBulletinsPage: vi.fn(),
  createBulletin: vi.fn(),
  updateBulletin: vi.fn(),
  softDeleteBulletin: vi.fn(),
}));

vi.mock('@solidjs/router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../lib/pocketbase/auth', () => ({
  isAuthUserAdmin: mocks.isAuthUserAdmin,
}));

vi.mock('../lib/pocketbase/grades', () => ({
  listGrades: mocks.listGrades,
}));

vi.mock('../lib/pocketbase/bulletin-categories', () => ({
  listBulletinCategories: mocks.listBulletinCategories,
  listBulletinCategoriesPage: mocks.listBulletinCategoriesPage,
  createBulletinCategory: mocks.createBulletinCategory,
  updateBulletinCategory: mocks.updateBulletinCategory,
  deleteBulletinCategory: mocks.deleteBulletinCategory,
  countBulletinsByCategoryId: mocks.countBulletinsByCategoryId,
}));

vi.mock('../lib/pocketbase/bulletins', () => ({
  listBulletinsPage: mocks.listBulletinsPage,
  createBulletin: mocks.createBulletin,
  updateBulletin: mocks.updateBulletin,
  softDeleteBulletin: mocks.softDeleteBulletin,
}));

const categoriesFixture = [
  {
    id: 'c1',
    name: 'Académico',
    description: 'Rendimiento',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  },
];

const categoriesPageFixture = {
  items: categoriesFixture,
  page: 1,
  perPage: 10,
  totalItems: 1,
  totalPages: 1,
};

const gradesFixture = [
  { id: 'g1', name: 'Primero A', capacity: 30 },
  { id: 'g2', name: 'Segundo A', capacity: 30 },
];

const bulletinsFixture = [
  {
    id: 'b1',
    category_id: 'c1',
    category_name: 'Académico',
    description: 'Excelente desempeño.',
    grade_id: 'g1',
    grade_name: 'Primero A',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    created_by: 'u1',
    created_by_name: 'Admin Uno',
    updated_by: 'u1',
    updated_by_name: 'Admin Uno',
    is_deleted: false,
  },
];

const bulletinsPageFixture = {
  items: bulletinsFixture,
  page: 1,
  perPage: 10,
  totalItems: 1,
  totalPages: 1,
};

describe('EnrollmentBulletinsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthUserAdmin.mockReturnValue(true);
    mocks.listGrades.mockResolvedValue(gradesFixture);
    mocks.listBulletinCategories.mockResolvedValue(categoriesFixture);
    mocks.listBulletinCategoriesPage.mockResolvedValue(categoriesPageFixture);
    mocks.createBulletinCategory.mockResolvedValue(categoriesFixture[0]);
    mocks.updateBulletinCategory.mockResolvedValue(categoriesFixture[0]);
    mocks.deleteBulletinCategory.mockResolvedValue(undefined);
    mocks.countBulletinsByCategoryId.mockResolvedValue(0);
    mocks.listBulletinsPage.mockResolvedValue(bulletinsPageFixture);
    mocks.createBulletin.mockResolvedValue(bulletinsFixture[0]);
    mocks.updateBulletin.mockResolvedValue(bulletinsFixture[0]);
    mocks.softDeleteBulletin.mockResolvedValue(undefined);
  });

  it('redirects non-admin users', async () => {
    mocks.isAuthUserAdmin.mockReturnValue(false);
    render(() => <EnrollmentBulletinsPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/enrollment-management', { replace: true });
    });
  });

  it('renders categories section first and then bulletins section', async () => {
    render(() => <EnrollmentBulletinsPage />);

    expect(await screen.findByText('Excelente desempeño.')).toBeInTheDocument();
    expect(screen.getByText('Excelente desempeño.')).toBeInTheDocument();

    const categoryHeading = screen.getByRole('heading', { name: 'Categorías de boletines' });
    const bulletinHeading = screen.getByRole('heading', { name: 'Boletines' });
    const categoryPosition = categoryHeading.compareDocumentPosition(bulletinHeading);
    expect(categoryPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('requests category sorting when category header is clicked', async () => {
    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    fireEvent.click(screen.getByRole('button', { name: 'Nombre' }));

    await waitFor(() => {
      expect(mocks.listBulletinCategoriesPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'name',
        sortDirection: 'desc',
      });
    });
  });

  it('requests bulletin sorting when bulletin header is clicked', async () => {
    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    fireEvent.click(screen.getByRole('button', { name: 'Creado por' }));

    await waitFor(() => {
      expect(mocks.listBulletinsPage).toHaveBeenCalledWith(1, 10, {
        sortField: 'created_by_name',
        sortDirection: 'asc',
      });
    });
  });

  it('creates and edits a category', async () => {
    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    fireEvent.click(screen.getByText('Nueva categoría'));
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Convivencia' } });
    fireEvent.input(screen.getByLabelText('Descripción'), { target: { value: 'Comportamiento' } });
    fireEvent.click(screen.getAllByText('Crear categoría')[1]);

    await waitFor(() => {
      expect(mocks.createBulletinCategory).toHaveBeenCalledWith({
        name: 'Convivencia',
        description: 'Comportamiento',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Crear categoría' })).not.toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: /Editar categoría/i }));
    fireEvent.input(screen.getByLabelText('Descripción'), { target: { value: 'Rendimiento actualizado' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateBulletinCategory).toHaveBeenCalledWith('c1', {
        name: 'Académico',
        description: 'Rendimiento actualizado',
      });
    });
  });

  it('blocks category delete when there are linked bulletins', async () => {
    mocks.countBulletinsByCategoryId.mockResolvedValue(2);
    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    fireEvent.click(screen.getByLabelText('Eliminar categoría Académico'));
    fireEvent.click(screen.getAllByText('Eliminar')[0]);

    await waitFor(() => {
      expect(mocks.countBulletinsByCategoryId).toHaveBeenCalledWith('c1');
    });
    expect(mocks.deleteBulletinCategory).not.toHaveBeenCalled();
    expect(await screen.findByText(/No se puede eliminar la categoría Académico/)).toBeInTheDocument();
  });

  it('creates and edits a bulletin', async () => {
    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    fireEvent.click(screen.getByText('Nuevo boletín'));
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'g2' } });
    fireEvent.input(screen.getByLabelText('Descripción'), { target: { value: 'Observación positiva.' } });
    fireEvent.click(screen.getAllByText('Crear boletín')[1]);

    await waitFor(() => {
      expect(mocks.createBulletin).toHaveBeenCalledWith({
        category_id: 'c1',
        grade_id: 'g2',
        description: 'Observación positiva.',
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Editar boletín b1' }));
    fireEvent.input(screen.getByLabelText('Descripción'), { target: { value: 'Observación editada.' } });
    fireEvent.click(screen.getByText('Guardar cambios'));

    await waitFor(() => {
      expect(mocks.updateBulletin).toHaveBeenCalledWith('b1', {
        category_id: 'c1',
        grade_id: 'g1',
        description: 'Observación editada.',
      });
    });
  });

  it('soft deletes a bulletin', async () => {
    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    fireEvent.click(screen.getByLabelText('Eliminar boletín b1'));
    fireEvent.click(screen.getAllByText('Eliminar')[0]);

    await waitFor(() => {
      expect(mocks.softDeleteBulletin).toHaveBeenCalledWith('b1');
    });
  });

  it('supports pagination controls for both tables', async () => {
    mocks.listBulletinCategoriesPage.mockImplementation(async (page: number) => {
      if (page === 1) {
        return {
          items: [categoriesFixture[0]],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }

      return {
        items: [{ ...categoriesFixture[0], id: 'c2', name: 'Convivencia' }],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    mocks.listBulletinsPage.mockImplementation(async (page: number) => {
      if (page === 1) {
        return {
          items: [bulletinsFixture[0]],
          page: 1,
          perPage: 10,
          totalItems: 11,
          totalPages: 2,
        };
      }

      return {
        items: [{ ...bulletinsFixture[0], id: 'b2', description: 'Segunda fila' }],
        page: 2,
        perPage: 10,
        totalItems: 11,
        totalPages: 2,
      };
    });

    render(() => <EnrollmentBulletinsPage />);
    await screen.findByText('Excelente desempeño.');

    const nextButtons = screen.getAllByText('Siguiente');
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[1]);

    await waitFor(() => {
      expect(mocks.listBulletinCategoriesPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'name',
        sortDirection: 'asc',
      });
      expect(mocks.listBulletinsPage).toHaveBeenCalledWith(2, 10, {
        sortField: 'updated_at',
        sortDirection: 'desc',
      });
    });
  });
});
