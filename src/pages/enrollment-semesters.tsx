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
  createSemester,
  listSemestersPage,
  type SemesterCreateInput,
  type SemesterListSortField,
} from '../lib/pocketbase/semesters';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { toggleSort, type SortState } from '../lib/table/sorting';

type SemesterForm = {
  name: string;
  start_date: string;
  end_date: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SEMESTER_FIELDS = ['name', 'start_date', 'end_date'] as const;
type SemesterField = (typeof SEMESTER_FIELDS)[number];
type SemesterSortKey = SemesterListSortField;

const emptyForm: SemesterForm = {
  name: '',
  start_date: '',
  end_date: '',
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

function parseLocalDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value: string): string {
  const parsed = parseLocalDate(value);
  return parsed ? parsed.toISOString() : '';
}

function validateForm(form: SemesterForm): FieldErrorMap<SemesterField> {
  const errors: FieldErrorMap<SemesterField> = {};

  if (form.name.trim().length === 0) {
    errors.name = 'Nombre es obligatorio.';
  }

  if (form.start_date.trim().length === 0) {
    errors.start_date = 'Fecha de inicio es obligatoria.';
  }

  if (form.end_date.trim().length === 0) {
    errors.end_date = 'Fecha de fin es obligatoria.';
  }

  if (!errors.start_date && !errors.end_date) {
    const start = parseLocalDate(form.start_date);
    const end = parseLocalDate(form.end_date);

    if (!start || !end) {
      errors.end_date = 'Las fechas ingresadas no son válidas.';
    } else if (end.getTime() - start.getTime() < DAY_IN_MS) {
      errors.end_date = 'La fecha de fin debe ser al menos 1 día posterior a la fecha de inicio.';
    }
  }

  return errors;
}

function toPayload(form: SemesterForm): SemesterCreateInput {
  return {
    name: form.name.trim(),
    start_date: toIsoDate(form.start_date),
    end_date: toIsoDate(form.end_date),
  };
}

export default function EnrollmentSemestersPage() {
  const navigate = useNavigate();

  const [semesterPage, setSemesterPage] = createSignal(1);
  const [semesterSort, setSemesterSort] = createSignal<SortState<SemesterSortKey>>({
    key: 'name',
    direction: 'asc',
  });

  const [semesters, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;

      return {
        page: semesterPage(),
        sortField: semesterSort().key,
        sortDirection: semesterSort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listSemestersPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<SemesterForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(SEMESTER_FIELDS));
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const createFieldErrors = createMemo(() => validateForm(createForm()));
  const fieldError = (field: SemesterField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const setCreateField = (field: SemesterField, value: string) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));

    setCreateTouched((current) => touchField(current, field));
    setCreateError(null);
  };

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateError(null);
    setCreateForm(emptyForm);
    setCreateTouched(createInitialTouchedMap(SEMESTER_FIELDS));
  };

  const closeCreateModal = () => {
    if (createBusy()) return;
    setCreateOpen(false);
    setCreateError(null);
  };

  const submitCreate = async () => {
    setCreateTouched((current) => touchAllFields(current));
    if (hasAnyError(createFieldErrors())) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createSemester(toPayload(createForm()));
      await refetch();
      const totalPages = semesters()?.totalPages ?? 1;
      if (semesterPage() > totalPages) {
        setSemesterPage(clampPage(semesterPage(), totalPages));
      }

      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(SEMESTER_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const semesterRows = () => semesters()?.items ?? [];
  const semesterCurrentPage = () => semesters()?.page ?? 1;
  const semesterTotalPages = () => semesters()?.totalPages ?? 1;

  const handleSort = (key: SemesterSortKey) => {
    setSemesterSort((current) => toggleSort(current, key));
    setSemesterPage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-4xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de semestres</h1>
            <p class="mt-2 text-gray-600">
              Administra semestres académicos y sus fechas de inicio y fin.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
              onClick={() => navigate('/enrollment-management')}
            >
              Volver
            </button>
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              onClick={openCreateModal}
            >
              Nuevo semestre
            </button>
          </div>
        </div>

        <Show when={actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError()}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[520px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Semestre"
                  columnKey="name"
                  sort={semesterSort()}
                  onSort={handleSort}
                />
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={!semesters.loading}
                fallback={(
                  <tr>
                    <td class="px-4 py-4 text-gray-600" colSpan={2}>
                      Cargando semestres...
                    </td>
                  </tr>
                )}
              >
                <Show
                  when={!semesters.error}
                  fallback={(
                    <tr>
                      <td class="px-4 py-4 text-red-700" colSpan={2}>
                        {getErrorMessage(semesters.error)}
                      </td>
                    </tr>
                  )}
                >
                  <Show
                    when={semesterRows().length > 0}
                    fallback={(
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={2}>
                          No hay semestres registrados.
                        </td>
                      </tr>
                    )}
                  >
                    <For each={semesterRows()}>
                      {(semester) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{semester.name || '—'}</td>
                          <td class="px-4 py-3">
                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                              aria-label={`Editar semestre ${semester.name}`}
                              onClick={() => navigate(`/enrollment-management/semesters/${semester.id}`)}
                            >
                              <i class="bi bi-pencil-square" aria-hidden="true"></i>
                            </button>
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
          page={semesterCurrentPage()}
          totalPages={semesterTotalPages()}
          busy={semesters.loading || createBusy()}
          onPageChange={(nextPage) => setSemesterPage(nextPage)}
        />
      </div>

      <Modal
        open={createOpen()}
        title="Crear semestre"
        description="Completa la información para registrar un semestre."
        confirmLabel="Crear semestre"
        cancelLabel="Cancelar"
        busy={createBusy()}
        onConfirm={submitCreate}
        onClose={closeCreateModal}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Nombre</span>
            <input
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!fieldError('name') }}
              value={createForm().name}
              onInput={(event) => setCreateField('name', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!fieldError('name')}
              aria-describedby={fieldError('name') ? 'create-semester-name-error' : undefined}
            />
            <InlineFieldAlert id="create-semester-name-error" message={fieldError('name')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Fecha de inicio</span>
            <input
              type="date"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!fieldError('start_date') }}
              value={createForm().start_date}
              onInput={(event) => setCreateField('start_date', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!fieldError('start_date')}
              aria-describedby={fieldError('start_date') ? 'create-semester-start-error' : undefined}
            />
            <InlineFieldAlert id="create-semester-start-error" message={fieldError('start_date')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Fecha de fin</span>
            <input
              type="date"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!fieldError('end_date') }}
              value={createForm().end_date}
              onInput={(event) => setCreateField('end_date', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!fieldError('end_date')}
              aria-describedby={fieldError('end_date') ? 'create-semester-end-error' : undefined}
            />
            <InlineFieldAlert id="create-semester-end-error" message={fieldError('end_date')} />
          </label>

          <Show when={createError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError()}
            </div>
          </Show>
        </div>
      </Modal>
    </section>
  );
}
