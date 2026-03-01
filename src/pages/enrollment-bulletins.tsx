import { useNavigate } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import SortableHeaderCell from '../components/SortableHeaderCell';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  countBulletinsByCategoryId,
  createBulletinCategory,
  deleteBulletinCategory,
  listBulletinCategories,
  listBulletinCategoriesPage,
  updateBulletinCategory,
  type BulletinCategoryListSortField,
  type BulletinCategoryRecord,
} from '../lib/pocketbase/bulletin-categories';
import {
  createBulletin,
  listBulletinsPage,
  softDeleteBulletin,
  updateBulletin,
  type BulletinListSortField,
  type BulletinRecord,
} from '../lib/pocketbase/bulletins';
import { listGrades } from '../lib/pocketbase/grades';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { toggleSort, type SortState } from '../lib/table/sorting';

type CategoryForm = {
  name: string;
  description: string;
};

type BulletinForm = {
  category_id: string;
  grade_id: string;
  description: string;
};

const CATEGORY_FIELDS = ['name', 'description'] as const;
type CategoryField = (typeof CATEGORY_FIELDS)[number];

const BULLETIN_FIELDS = ['category_id', 'grade_id', 'description'] as const;
type BulletinField = (typeof BULLETIN_FIELDS)[number];

type CategorySortKey = BulletinCategoryListSortField;
type BulletinSortKey = BulletinListSortField;

const emptyCategoryForm: CategoryForm = {
  name: '',
  description: '',
};

const emptyBulletinForm: BulletinForm = {
  category_id: '',
  grade_id: '',
  description: '',
};

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

function formatText(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function validateCategoryForm(form: CategoryForm): FieldErrorMap<CategoryField> {
  const errors: FieldErrorMap<CategoryField> = {};

  if (form.name.trim().length === 0) {
    errors.name = 'Nombre es obligatorio.';
  }

  if (form.description.trim().length === 0) {
    errors.description = 'Descripción es obligatoria.';
  }

  return errors;
}

function validateBulletinForm(form: BulletinForm): FieldErrorMap<BulletinField> {
  const errors: FieldErrorMap<BulletinField> = {};

  if (form.category_id.trim().length === 0) {
    errors.category_id = 'Categoría es obligatoria.';
  }

  if (form.grade_id.trim().length === 0) {
    errors.grade_id = 'Grado es obligatorio.';
  }

  if (form.description.trim().length === 0) {
    errors.description = 'Descripción es obligatoria.';
  }

  return errors;
}

export default function EnrollmentBulletinsPage() {
  const navigate = useNavigate();

  const [categoryPage, setCategoryPage] = createSignal(1);
  const [categorySort, setCategorySort] = createSignal<SortState<CategorySortKey>>({
    key: 'name',
    direction: 'asc',
  });
  const [bulletinPage, setBulletinPage] = createSignal(1);
  const [bulletinSort, setBulletinSort] = createSignal<SortState<BulletinSortKey>>({
    key: 'updated_at',
    direction: 'desc',
  });

  const [categoryActionError, setCategoryActionError] = createSignal<string | null>(null);
  const [bulletinActionError, setBulletinActionError] = createSignal<string | null>(null);

  const [grades] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listGrades();
  });

  const [categoryOptions, { refetch: refetchCategoryOptions }] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listBulletinCategories();
  });

  const [categories, { refetch: refetchCategories }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;
      return {
        page: categoryPage(),
        sortField: categorySort().key,
        sortDirection: categorySort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listBulletinCategoriesPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  const [bulletins, { refetch: refetchBulletins }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;
      return {
        page: bulletinPage(),
        sortField: bulletinSort().key,
        sortDirection: bulletinSort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listBulletinsPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  const [createCategoryOpen, setCreateCategoryOpen] = createSignal(false);
  const [createCategoryForm, setCreateCategoryForm] = createSignal<CategoryForm>(emptyCategoryForm);
  const [createCategoryTouched, setCreateCategoryTouched] = createSignal(
    createInitialTouchedMap(CATEGORY_FIELDS),
  );
  const [createCategoryBusy, setCreateCategoryBusy] = createSignal(false);
  const [createCategoryError, setCreateCategoryError] = createSignal<string | null>(null);

  const [editCategoryTarget, setEditCategoryTarget] = createSignal<BulletinCategoryRecord | null>(null);
  const [editCategoryForm, setEditCategoryForm] = createSignal<CategoryForm>(emptyCategoryForm);
  const [editCategoryTouched, setEditCategoryTouched] = createSignal(createInitialTouchedMap(CATEGORY_FIELDS));
  const [editCategoryBusy, setEditCategoryBusy] = createSignal(false);
  const [editCategoryError, setEditCategoryError] = createSignal<string | null>(null);

  const [deleteCategoryTarget, setDeleteCategoryTarget] = createSignal<BulletinCategoryRecord | null>(null);
  const [deleteCategoryBusy, setDeleteCategoryBusy] = createSignal(false);

  const [createBulletinOpen, setCreateBulletinOpen] = createSignal(false);
  const [createBulletinForm, setCreateBulletinForm] = createSignal<BulletinForm>(emptyBulletinForm);
  const [createBulletinTouched, setCreateBulletinTouched] = createSignal(createInitialTouchedMap(BULLETIN_FIELDS));
  const [createBulletinBusy, setCreateBulletinBusy] = createSignal(false);
  const [createBulletinError, setCreateBulletinError] = createSignal<string | null>(null);

  const [editBulletinTarget, setEditBulletinTarget] = createSignal<BulletinRecord | null>(null);
  const [editBulletinForm, setEditBulletinForm] = createSignal<BulletinForm>(emptyBulletinForm);
  const [editBulletinTouched, setEditBulletinTouched] = createSignal(createInitialTouchedMap(BULLETIN_FIELDS));
  const [editBulletinBusy, setEditBulletinBusy] = createSignal(false);
  const [editBulletinError, setEditBulletinError] = createSignal<string | null>(null);

  const [deleteBulletinTarget, setDeleteBulletinTarget] = createSignal<BulletinRecord | null>(null);
  const [deleteBulletinBusy, setDeleteBulletinBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const createCategoryFieldErrors = createMemo(() => validateCategoryForm(createCategoryForm()));
  const editCategoryFieldErrors = createMemo(() => validateCategoryForm(editCategoryForm()));
  const createBulletinFieldErrors = createMemo(() => validateBulletinForm(createBulletinForm()));
  const editBulletinFieldErrors = createMemo(() => validateBulletinForm(editBulletinForm()));

  const createCategoryFieldError = (field: CategoryField) => (
    createCategoryTouched()[field] ? createCategoryFieldErrors()[field] : undefined
  );
  const editCategoryFieldError = (field: CategoryField) => (
    editCategoryTouched()[field] ? editCategoryFieldErrors()[field] : undefined
  );
  const createBulletinFieldError = (field: BulletinField) => (
    createBulletinTouched()[field] ? createBulletinFieldErrors()[field] : undefined
  );
  const editBulletinFieldError = (field: BulletinField) => (
    editBulletinTouched()[field] ? editBulletinFieldErrors()[field] : undefined
  );

  const setCreateCategoryField = (field: CategoryField, value: string) => {
    setCreateCategoryForm((current) => ({ ...current, [field]: value }));
    setCreateCategoryTouched((current) => touchField(current, field));
    setCreateCategoryError(null);
  };

  const setEditCategoryField = (field: CategoryField, value: string) => {
    setEditCategoryForm((current) => ({ ...current, [field]: value }));
    setEditCategoryTouched((current) => touchField(current, field));
    setEditCategoryError(null);
  };

  const setCreateBulletinField = (field: BulletinField, value: string) => {
    setCreateBulletinForm((current) => ({ ...current, [field]: value }));
    setCreateBulletinTouched((current) => touchField(current, field));
    setCreateBulletinError(null);
  };

  const setEditBulletinField = (field: BulletinField, value: string) => {
    setEditBulletinForm((current) => ({ ...current, [field]: value }));
    setEditBulletinTouched((current) => touchField(current, field));
    setEditBulletinError(null);
  };

  const submitCreateCategory = async () => {
    setCreateCategoryTouched((current) => touchAllFields(current));
    if (hasAnyError(createCategoryFieldErrors())) return;

    setCreateCategoryBusy(true);
    setCreateCategoryError(null);
    setCategoryActionError(null);

    try {
      await createBulletinCategory({
        name: createCategoryForm().name,
        description: createCategoryForm().description,
      });
      await refetchCategories();
      await refetchCategoryOptions();
      setCreateCategoryOpen(false);
      setCreateCategoryForm(emptyCategoryForm);
      setCreateCategoryTouched(createInitialTouchedMap(CATEGORY_FIELDS));
    } catch (error) {
      setCreateCategoryError(getErrorMessage(error));
    } finally {
      setCreateCategoryBusy(false);
    }
  };

  const openEditCategory = (category: BulletinCategoryRecord) => {
    setEditCategoryTarget(category);
    setEditCategoryError(null);
    setEditCategoryTouched(createInitialTouchedMap(CATEGORY_FIELDS));
    setEditCategoryForm({
      name: category.name,
      description: category.description,
    });
  };

  const submitEditCategory = async () => {
    const target = editCategoryTarget();
    if (!target) return;

    setEditCategoryTouched((current) => touchAllFields(current));
    if (hasAnyError(editCategoryFieldErrors())) return;

    setEditCategoryBusy(true);
    setEditCategoryError(null);
    setCategoryActionError(null);

    try {
      await updateBulletinCategory(target.id, {
        name: editCategoryForm().name,
        description: editCategoryForm().description,
      });
      await refetchCategories();
      await refetchCategoryOptions();
      await refetchBulletins();
      setEditCategoryTarget(null);
      setEditCategoryForm(emptyCategoryForm);
      setEditCategoryTouched(createInitialTouchedMap(CATEGORY_FIELDS));
    } catch (error) {
      setEditCategoryError(getErrorMessage(error));
    } finally {
      setEditCategoryBusy(false);
    }
  };

  const confirmDeleteCategory = async () => {
    const target = deleteCategoryTarget();
    if (!target) return;

    setDeleteCategoryBusy(true);
    setCategoryActionError(null);

    try {
      const linked = await countBulletinsByCategoryId(target.id);
      if (linked > 0) {
        setCategoryActionError(
          `No se puede eliminar la categoría ${target.name} porque tiene ${linked} boletín(es) asociado(s).`,
        );
        setDeleteCategoryTarget(null);
        return;
      }

      await deleteBulletinCategory(target.id);
      await refetchCategories();
      await refetchCategoryOptions();
      const totalPages = categories()?.totalPages ?? 1;
      if (categoryPage() > totalPages) {
        setCategoryPage(clampPage(categoryPage(), totalPages));
      }
      setDeleteCategoryTarget(null);
    } catch (error) {
      setCategoryActionError(getErrorMessage(error));
    } finally {
      setDeleteCategoryBusy(false);
    }
  };

  const submitCreateBulletin = async () => {
    setCreateBulletinTouched((current) => touchAllFields(current));
    if (hasAnyError(createBulletinFieldErrors())) return;

    setCreateBulletinBusy(true);
    setCreateBulletinError(null);
    setBulletinActionError(null);

    try {
      await createBulletin({
        category_id: createBulletinForm().category_id,
        grade_id: createBulletinForm().grade_id,
        description: createBulletinForm().description,
      });
      await refetchBulletins();
      setCreateBulletinOpen(false);
      setCreateBulletinForm(emptyBulletinForm);
      setCreateBulletinTouched(createInitialTouchedMap(BULLETIN_FIELDS));
    } catch (error) {
      setCreateBulletinError(getErrorMessage(error));
    } finally {
      setCreateBulletinBusy(false);
    }
  };

  const openEditBulletin = (bulletin: BulletinRecord) => {
    setEditBulletinTarget(bulletin);
    setEditBulletinError(null);
    setEditBulletinTouched(createInitialTouchedMap(BULLETIN_FIELDS));
    setEditBulletinForm({
      category_id: bulletin.category_id,
      grade_id: bulletin.grade_id,
      description: bulletin.description,
    });
  };

  const submitEditBulletin = async () => {
    const target = editBulletinTarget();
    if (!target) return;

    setEditBulletinTouched((current) => touchAllFields(current));
    if (hasAnyError(editBulletinFieldErrors())) return;

    setEditBulletinBusy(true);
    setEditBulletinError(null);
    setBulletinActionError(null);

    try {
      await updateBulletin(target.id, {
        category_id: editBulletinForm().category_id,
        grade_id: editBulletinForm().grade_id,
        description: editBulletinForm().description,
      });
      await refetchBulletins();
      setEditBulletinTarget(null);
      setEditBulletinForm(emptyBulletinForm);
      setEditBulletinTouched(createInitialTouchedMap(BULLETIN_FIELDS));
    } catch (error) {
      setEditBulletinError(getErrorMessage(error));
    } finally {
      setEditBulletinBusy(false);
    }
  };

  const confirmDeleteBulletin = async () => {
    const target = deleteBulletinTarget();
    if (!target) return;

    setDeleteBulletinBusy(true);
    setBulletinActionError(null);

    try {
      await softDeleteBulletin(target.id);
      await refetchBulletins();
      const totalPages = bulletins()?.totalPages ?? 1;
      if (bulletinPage() > totalPages) {
        setBulletinPage(clampPage(bulletinPage(), totalPages));
      }
      setDeleteBulletinTarget(null);
    } catch (error) {
      setBulletinActionError(getErrorMessage(error));
    } finally {
      setDeleteBulletinBusy(false);
    }
  };

  const categoryRows = () => categories()?.items ?? [];
  const categoryCurrentPage = () => categories()?.page ?? 1;
  const categoryTotalPages = () => categories()?.totalPages ?? 1;
  const bulletinRows = () => bulletins()?.items ?? [];
  const bulletinCurrentPage = () => bulletins()?.page ?? 1;
  const bulletinTotalPages = () => bulletins()?.totalPages ?? 1;

  const handleCategorySort = (key: CategorySortKey) => {
    setCategorySort((current) => toggleSort(current, key));
    setCategoryPage(1);
  };

  const handleBulletinSort = (key: BulletinSortKey) => {
    setBulletinSort((current) => toggleSort(current, key));
    setBulletinPage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-[1280px] space-y-6">
        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-semibold">Gestión de boletines</h1>
              <p class="mt-1 text-sm text-gray-600">
                Administra categorías y boletines académicos de los estudiantes.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
              onClick={() => navigate('/enrollment-management')}
            >
              Volver
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-semibold">Categorías de boletines</h2>
              <p class="mt-1 text-sm text-gray-600">
                Define categorías para clasificar historial académico.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              onClick={() => {
                setCreateCategoryOpen(true);
                setCreateCategoryError(null);
                setCreateCategoryForm(emptyCategoryForm);
                setCreateCategoryTouched(createInitialTouchedMap(CATEGORY_FIELDS));
              }}
            >
              Nueva categoría
            </button>
          </div>

          <Show when={categoryActionError()}>
            <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {categoryActionError()}
            </div>
          </Show>

          <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
            <table class="min-w-[980px] w-full text-left text-sm">
              <thead class="bg-yellow-100 text-gray-700">
                <tr>
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Nombre"
                    columnKey="name"
                    sort={categorySort()}
                    onSort={handleCategorySort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Descripción"
                    columnKey="description"
                    sort={categorySort()}
                    onSort={handleCategorySort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado"
                    columnKey="created_at"
                    sort={categorySort()}
                    onSort={handleCategorySort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado"
                    columnKey="updated_at"
                    sort={categorySort()}
                    onSort={handleCategorySort}
                  />
                  <th class="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <Show
                  when={!categories.loading}
                  fallback={(
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={5}>
                        Cargando categorías...
                      </td>
                    </tr>
                  )}
                >
                  <Show
                    when={!categories.error}
                    fallback={(
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={5}>
                          {getErrorMessage(categories.error)}
                        </td>
                      </tr>
                    )}
                  >
                    <Show
                      when={categoryRows().length > 0}
                      fallback={(
                        <tr>
                          <td class="px-4 py-4 text-gray-600" colSpan={5}>
                            No hay categorías registradas.
                          </td>
                        </tr>
                      )}
                    >
                      <For each={categoryRows()}>
                        {(category) => (
                          <tr class="border-t border-yellow-100 align-top">
                            <td class="px-4 py-3">{formatText(category.name)}</td>
                            <td class="px-4 py-3">{formatText(category.description)}</td>
                            <td class="px-4 py-3">{formatDateTime(category.created_at)}</td>
                            <td class="px-4 py-3">{formatDateTime(category.updated_at)}</td>
                            <td class="px-4 py-3">
                              <div class="flex items-center gap-2">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label={`Editar categoría ${category.name}`}
                                  onClick={() => openEditCategory(category)}
                                >
                                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                  aria-label={`Eliminar categoría ${category.name}`}
                                  onClick={() => setDeleteCategoryTarget(category)}
                                >
                                  <i class="bi bi-trash" aria-hidden="true"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </Show>
                  </Show>
                </Show>
              </tbody>
            </table>
          </div>

          <PaginationControls
            class="mt-3 flex items-center justify-between"
            page={categoryCurrentPage()}
            totalPages={categoryTotalPages()}
            busy={categories.loading || createCategoryBusy() || editCategoryBusy() || deleteCategoryBusy()}
            onPageChange={(nextPage) => setCategoryPage(nextPage)}
          />
        </div>

        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-semibold">Boletines</h2>
              <p class="mt-1 text-sm text-gray-600">
                Registra historial académico por categoría y grado.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              onClick={() => {
                setCreateBulletinOpen(true);
                setCreateBulletinError(null);
                setCreateBulletinForm(emptyBulletinForm);
                setCreateBulletinTouched(createInitialTouchedMap(BULLETIN_FIELDS));
              }}
            >
              Nuevo boletín
            </button>
          </div>

          <Show when={bulletinActionError()}>
            <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {bulletinActionError()}
            </div>
          </Show>

          <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
            <table class="min-w-[1650px] w-full text-left text-sm">
              <thead class="bg-yellow-100 text-gray-700">
                <tr>
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Categoría"
                    columnKey="category_name"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Grado"
                    columnKey="grade_name"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Descripción"
                    columnKey="description"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado"
                    columnKey="created_at"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado"
                    columnKey="updated_at"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado por"
                    columnKey="created_by_name"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado por"
                    columnKey="updated_by_name"
                    sort={bulletinSort()}
                    onSort={handleBulletinSort}
                  />
                  <th class="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <Show
                  when={!bulletins.loading}
                  fallback={(
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={8}>
                        Cargando boletines...
                      </td>
                    </tr>
                  )}
                >
                  <Show
                    when={!bulletins.error}
                    fallback={(
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={8}>
                          {getErrorMessage(bulletins.error)}
                        </td>
                      </tr>
                    )}
                  >
                    <Show
                      when={bulletinRows().length > 0}
                      fallback={(
                        <tr>
                          <td class="px-4 py-4 text-gray-600" colSpan={8}>
                            No hay boletines registrados.
                          </td>
                        </tr>
                      )}
                    >
                      <For each={bulletinRows()}>
                        {(bulletin) => (
                          <tr class="border-t border-yellow-100 align-top">
                            <td class="px-4 py-3">{formatText(bulletin.category_name)}</td>
                            <td class="px-4 py-3">{formatText(bulletin.grade_name)}</td>
                            <td class="px-4 py-3">{formatText(bulletin.description)}</td>
                            <td class="px-4 py-3">{formatDateTime(bulletin.created_at)}</td>
                            <td class="px-4 py-3">{formatDateTime(bulletin.updated_at)}</td>
                            <td class="px-4 py-3">{formatText(bulletin.created_by_name)}</td>
                            <td class="px-4 py-3">{formatText(bulletin.updated_by_name)}</td>
                            <td class="px-4 py-3">
                              <div class="flex items-center gap-2">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label={`Editar boletín ${bulletin.id}`}
                                  onClick={() => openEditBulletin(bulletin)}
                                >
                                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                  aria-label={`Eliminar boletín ${bulletin.id}`}
                                  onClick={() => setDeleteBulletinTarget(bulletin)}
                                >
                                  <i class="bi bi-trash" aria-hidden="true"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </Show>
                  </Show>
                </Show>
              </tbody>
            </table>
          </div>

          <PaginationControls
            class="mt-3 flex items-center justify-between"
            page={bulletinCurrentPage()}
            totalPages={bulletinTotalPages()}
            busy={bulletins.loading || createBulletinBusy() || editBulletinBusy() || deleteBulletinBusy()}
            onPageChange={(nextPage) => setBulletinPage(nextPage)}
          />
        </div>
      </div>

      <Modal
        open={createCategoryOpen()}
        title="Crear categoría"
        confirmLabel="Crear categoría"
        busy={createCategoryBusy()}
        onConfirm={submitCreateCategory}
        onClose={() => {
          if (createCategoryBusy()) return;
          setCreateCategoryOpen(false);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Nombre</span>
            <input
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createCategoryFieldError('name') }}
              value={createCategoryForm().name}
              onInput={(event) => setCreateCategoryField('name', event.currentTarget.value)}
              disabled={createCategoryBusy()}
              aria-invalid={!!createCategoryFieldError('name')}
              aria-describedby={createCategoryFieldError('name') ? 'create-category-name-error' : undefined}
            />
            <InlineFieldAlert id="create-category-name-error" message={createCategoryFieldError('name')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Descripción</span>
            <textarea
              class="mt-1 h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createCategoryFieldError('description') }}
              value={createCategoryForm().description}
              onInput={(event) => setCreateCategoryField('description', event.currentTarget.value)}
              disabled={createCategoryBusy()}
              aria-invalid={!!createCategoryFieldError('description')}
              aria-describedby={createCategoryFieldError('description') ? 'create-category-description-error' : undefined}
            />
            <InlineFieldAlert
              id="create-category-description-error"
              message={createCategoryFieldError('description')}
            />
          </label>

          <Show when={createCategoryError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createCategoryError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={editCategoryTarget() !== null}
        title="Editar categoría"
        confirmLabel="Guardar cambios"
        busy={editCategoryBusy()}
        onConfirm={submitEditCategory}
        onClose={() => {
          if (editCategoryBusy()) return;
          setEditCategoryTarget(null);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Nombre</span>
            <input
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editCategoryFieldError('name') }}
              value={editCategoryForm().name}
              onInput={(event) => setEditCategoryField('name', event.currentTarget.value)}
              disabled={editCategoryBusy()}
              aria-invalid={!!editCategoryFieldError('name')}
              aria-describedby={editCategoryFieldError('name') ? 'edit-category-name-error' : undefined}
            />
            <InlineFieldAlert id="edit-category-name-error" message={editCategoryFieldError('name')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Descripción</span>
            <textarea
              class="mt-1 h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editCategoryFieldError('description') }}
              value={editCategoryForm().description}
              onInput={(event) => setEditCategoryField('description', event.currentTarget.value)}
              disabled={editCategoryBusy()}
              aria-invalid={!!editCategoryFieldError('description')}
              aria-describedby={editCategoryFieldError('description') ? 'edit-category-description-error' : undefined}
            />
            <InlineFieldAlert
              id="edit-category-description-error"
              message={editCategoryFieldError('description')}
            />
          </label>

          <Show when={editCategoryError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {editCategoryError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={deleteCategoryTarget() !== null}
        title="Eliminar categoría"
        description={`Esta acción eliminará la categoría ${deleteCategoryTarget()?.name ?? ''}.`}
        confirmLabel="Eliminar"
        variant="danger"
        busy={deleteCategoryBusy()}
        onConfirm={confirmDeleteCategory}
        onClose={() => {
          if (deleteCategoryBusy()) return;
          setDeleteCategoryTarget(null);
        }}
      />

      <Modal
        open={createBulletinOpen()}
        title="Crear boletín"
        description="La fecha de creación se registra automáticamente y no es editable."
        confirmLabel="Crear boletín"
        busy={createBulletinBusy()}
        onConfirm={submitCreateBulletin}
        onClose={() => {
          if (createBulletinBusy()) return;
          setCreateBulletinOpen(false);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Categoría</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createBulletinFieldError('category_id') }}
              value={createBulletinForm().category_id}
              onChange={(event) => setCreateBulletinField('category_id', event.currentTarget.value)}
              disabled={createBulletinBusy() || categoryOptions.loading}
              aria-invalid={!!createBulletinFieldError('category_id')}
              aria-describedby={createBulletinFieldError('category_id') ? 'create-bulletin-category-error' : undefined}
            >
              <option value="">
                {categoryOptions.loading ? 'Cargando categorías...' : 'Selecciona una categoría'}
              </option>
              <For each={categoryOptions() ?? []}>
                {(category) => (
                  <option value={category.id}>{category.name}</option>
                )}
              </For>
            </select>
            <InlineFieldAlert
              id="create-bulletin-category-error"
              message={createBulletinFieldError('category_id')}
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Grado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createBulletinFieldError('grade_id') }}
              value={createBulletinForm().grade_id}
              onChange={(event) => setCreateBulletinField('grade_id', event.currentTarget.value)}
              disabled={createBulletinBusy() || grades.loading}
              aria-invalid={!!createBulletinFieldError('grade_id')}
              aria-describedby={createBulletinFieldError('grade_id') ? 'create-bulletin-grade-error' : undefined}
            >
              <option value="">
                {grades.loading ? 'Cargando grados...' : 'Selecciona un grado'}
              </option>
              <For each={grades() ?? []}>
                {(grade) => (
                  <option value={grade.id}>{grade.name}</option>
                )}
              </For>
            </select>
            <InlineFieldAlert
              id="create-bulletin-grade-error"
              message={createBulletinFieldError('grade_id')}
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Descripción</span>
            <textarea
              class="mt-1 h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createBulletinFieldError('description') }}
              value={createBulletinForm().description}
              onInput={(event) => setCreateBulletinField('description', event.currentTarget.value)}
              disabled={createBulletinBusy()}
              aria-invalid={!!createBulletinFieldError('description')}
              aria-describedby={createBulletinFieldError('description') ? 'create-bulletin-description-error' : undefined}
            />
            <InlineFieldAlert
              id="create-bulletin-description-error"
              message={createBulletinFieldError('description')}
            />
          </label>

          <Show when={createBulletinError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createBulletinError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={editBulletinTarget() !== null}
        title="Editar boletín"
        description="La fecha de creación no se puede modificar."
        confirmLabel="Guardar cambios"
        busy={editBulletinBusy()}
        onConfirm={submitEditBulletin}
        onClose={() => {
          if (editBulletinBusy()) return;
          setEditBulletinTarget(null);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Categoría</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editBulletinFieldError('category_id') }}
              value={editBulletinForm().category_id}
              onChange={(event) => setEditBulletinField('category_id', event.currentTarget.value)}
              disabled={editBulletinBusy() || categoryOptions.loading}
              aria-invalid={!!editBulletinFieldError('category_id')}
              aria-describedby={editBulletinFieldError('category_id') ? 'edit-bulletin-category-error' : undefined}
            >
              <option value="">
                {categoryOptions.loading ? 'Cargando categorías...' : 'Selecciona una categoría'}
              </option>
              <For each={categoryOptions() ?? []}>
                {(category) => (
                  <option value={category.id}>{category.name}</option>
                )}
              </For>
            </select>
            <InlineFieldAlert
              id="edit-bulletin-category-error"
              message={editBulletinFieldError('category_id')}
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Grado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editBulletinFieldError('grade_id') }}
              value={editBulletinForm().grade_id}
              onChange={(event) => setEditBulletinField('grade_id', event.currentTarget.value)}
              disabled={editBulletinBusy() || grades.loading}
              aria-invalid={!!editBulletinFieldError('grade_id')}
              aria-describedby={editBulletinFieldError('grade_id') ? 'edit-bulletin-grade-error' : undefined}
            >
              <option value="">
                {grades.loading ? 'Cargando grados...' : 'Selecciona un grado'}
              </option>
              <For each={grades() ?? []}>
                {(grade) => (
                  <option value={grade.id}>{grade.name}</option>
                )}
              </For>
            </select>
            <InlineFieldAlert
              id="edit-bulletin-grade-error"
              message={editBulletinFieldError('grade_id')}
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Descripción</span>
            <textarea
              class="mt-1 h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editBulletinFieldError('description') }}
              value={editBulletinForm().description}
              onInput={(event) => setEditBulletinField('description', event.currentTarget.value)}
              disabled={editBulletinBusy()}
              aria-invalid={!!editBulletinFieldError('description')}
              aria-describedby={editBulletinFieldError('description') ? 'edit-bulletin-description-error' : undefined}
            />
            <InlineFieldAlert
              id="edit-bulletin-description-error"
              message={editBulletinFieldError('description')}
            />
          </label>

          <Show when={editBulletinError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {editBulletinError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={deleteBulletinTarget() !== null}
        title="Eliminar boletín"
        description="Esta acción realizará eliminación lógica del boletín seleccionado."
        confirmLabel="Eliminar"
        variant="danger"
        busy={deleteBulletinBusy()}
        onConfirm={confirmDeleteBulletin}
        onClose={() => {
          if (deleteBulletinBusy()) return;
          setDeleteBulletinTarget(null);
        }}
      />
    </section>
  );
}
