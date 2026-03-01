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
  createFather,
  deactivateFather,
  deleteFather,
  listActiveFathersPage,
  type FatherCreateInput,
  type FatherListSortField,
  type FatherRecord,
} from '../lib/pocketbase/fathers';
import {
  countLinksByFatherId,
  createLinksForFather,
  STUDENT_FATHER_RELATIONSHIPS,
  type FatherStudentLinkInput,
  type StudentFatherRelationship,
} from '../lib/pocketbase/students-fathers';
import { listActiveStudents } from '../lib/pocketbase/students';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { toggleSort, type SortState } from '../lib/table/sorting';

type FatherForm = {
  full_name: string;
  document_id: string;
  phone_number: string;
  occupation: string;
  company: string;
  email: string;
  address: string;
};

type FatherLinkForm = {
  studentId: string;
  relationship: StudentFatherRelationship;
};

const emptyForm: FatherForm = {
  full_name: '',
  document_id: '',
  phone_number: '',
  occupation: '',
  company: '',
  email: '',
  address: '',
};

const FATHER_VALIDATED_FIELDS = ['full_name', 'document_id', 'email'] as const;
type FatherValidatedField = (typeof FATHER_VALIDATED_FIELDS)[number];
type FatherSortKey = FatherListSortField;

const DOCUMENT_ID_REGEX = /^\d+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function formatNames(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}

function sanitizeNumericValue(value: string): string {
  return value.replace(/\D+/g, '');
}

function validateFatherForm(form: FatherForm): FieldErrorMap<FatherValidatedField> {
  const errors: FieldErrorMap<FatherValidatedField> = {};

  if (form.full_name.trim().length === 0) {
    errors.full_name = 'Nombre completo es obligatorio.';
  }

  if (form.document_id.trim().length === 0) {
    errors.document_id = 'Documento es obligatorio.';
  } else if (!DOCUMENT_ID_REGEX.test(form.document_id.trim())) {
    errors.document_id = 'Documento debe contener solo números.';
  }

  if (form.email.trim().length > 0 && !EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Correo electrónico no es válido.';
  }

  return errors;
}

function validateLinks(
  links: FatherLinkForm[],
  hasAvailableStudents: boolean,
): string | undefined {
  if (!hasAvailableStudents) {
    return 'No hay estudiantes activos disponibles. Debes crear un estudiante antes de registrar un tutor.';
  }

  if (links.length === 0) {
    return 'Debes registrar al menos un estudiante asociado.';
  }

  const selected = new Set<string>();

  for (const link of links) {
    if (link.studentId.trim().length === 0) {
      return 'Cada vínculo debe incluir un estudiante.';
    }

    if (!STUDENT_FATHER_RELATIONSHIPS.includes(link.relationship)) {
      return 'Cada vínculo debe incluir una relación válida.';
    }

    if (selected.has(link.studentId)) {
      return 'No se permiten estudiantes duplicados en los vínculos.';
    }

    selected.add(link.studentId);
  }

  return undefined;
}

function toFatherCreateInput(form: FatherForm): FatherCreateInput {
  return {
    full_name: form.full_name.trim(),
    document_id: form.document_id.trim(),
    phone_number: form.phone_number.trim(),
    occupation: form.occupation.trim(),
    company: form.company.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
  };
}

function toLinkInput(links: FatherLinkForm[]): FatherStudentLinkInput[] {
  return links.map((link) => ({
    studentId: link.studentId.trim(),
    relationship: link.relationship,
  }));
}

function createEmptyLink(): FatherLinkForm {
  return {
    studentId: '',
    relationship: 'father',
  };
}

export default function EnrollmentTutorsPage() {
  const navigate = useNavigate();

  const [fatherPage, setFatherPage] = createSignal(1);
  const [fatherSort, setFatherSort] = createSignal<SortState<FatherSortKey>>({
    key: 'full_name',
    direction: 'asc',
  });

  const [students] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    try {
      return await listActiveStudents({ includeFatherNames: false });
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      const isAbortLike = message.includes('aborted') || message.includes('autocancel');
      if (isAbortLike) {
        console.warn('Ignoring auto-cancelled active students request in tutors page.', error);
      } else {
        console.error('Failed to load active students in tutors page.', error);
      }
      return [];
    }
  });

  const [fathers, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;

      return {
        page: fatherPage(),
        sortField: fatherSort().key,
        sortDirection: fatherSort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listActiveFathersPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<FatherForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(FATHER_VALIDATED_FIELDS));
  const [linksTouched, setLinksTouched] = createSignal(false);
  const [createLinks, setCreateLinks] = createSignal<FatherLinkForm[]>([createEmptyLink()]);
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<FatherRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const setCreateField = (field: keyof FatherForm, value: string) => {
    const normalizedValue = (field === 'document_id' || field === 'phone_number')
      ? sanitizeNumericValue(value)
      : value;
    setCreateForm((current) => ({
      ...current,
      [field]: normalizedValue,
    }));

    if ((FATHER_VALIDATED_FIELDS as readonly string[]).includes(field)) {
      setCreateTouched((current) => touchField(current, field as FatherValidatedField));
    }

    setCreateError(null);
  };

  const createFieldErrors = createMemo(() => validateFatherForm(createForm()));
  const createLinksError = createMemo(() => validateLinks(createLinks(), (students()?.length ?? 0) > 0));
  const fieldError = (field: FatherValidatedField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const setCreateLinkStudent = (index: number, value: string) => {
    setCreateLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index
        ? {
            ...link,
            studentId: value,
          }
        : link
    )));
    setLinksTouched(true);
    setCreateError(null);
  };

  const setCreateLinkRelationship = (index: number, value: string) => {
    if (!STUDENT_FATHER_RELATIONSHIPS.includes(value as StudentFatherRelationship)) return;

    setCreateLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index
        ? {
            ...link,
            relationship: value as StudentFatherRelationship,
          }
        : link
    )));
    setLinksTouched(true);
    setCreateError(null);
  };

  const addCreateLink = () => {
    setCreateLinks((current) => [...current, createEmptyLink()]);
    setLinksTouched(true);
    setCreateError(null);
  };

  const removeCreateLink = (index: number) => {
    setCreateLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
    setLinksTouched(true);
    setCreateError(null);
  };

  const openCreateModal = () => {
    setCreateOpen(true);
    setCreateError(null);
    setCreateForm(emptyForm);
    setCreateTouched(createInitialTouchedMap(FATHER_VALIDATED_FIELDS));
    setCreateLinks([createEmptyLink()]);
    setLinksTouched(false);
  };

  const closeCreateModal = (options?: { force?: boolean }) => {
    if (createBusy() && !options?.force) return;

    setCreateOpen(false);
    setCreateError(null);
    setCreateForm(emptyForm);
    setCreateTouched(createInitialTouchedMap(FATHER_VALIDATED_FIELDS));
    setCreateLinks([createEmptyLink()]);
    setLinksTouched(false);
  };

  const submitCreate = async () => {
    setCreateTouched((current) => touchAllFields(current));
    setLinksTouched(true);

    if (hasAnyError(createFieldErrors()) || Boolean(createLinksError())) {
      return;
    }

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      const created = await createFather(toFatherCreateInput(createForm()));

      try {
        await createLinksForFather(created.id, toLinkInput(createLinks()));
      } catch (error) {
        await deleteFather(created.id);
        throw error;
      }

      await refetch();
      const totalPages = fathers()?.totalPages ?? 1;
      if (fatherPage() > totalPages) {
        setFatherPage(clampPage(fatherPage(), totalPages));
      }

      closeCreateModal({ force: true });
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleteBusy()) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;

    setDeleteBusy(true);
    setActionError(null);

    try {
      const linked = await countLinksByFatherId(target.id);
      if (linked > 0) {
        setActionError(
          `No se puede eliminar el tutor ${target.full_name} porque tiene ${linked} estudiante(s) asociado(s).`,
        );
        setDeleteTarget(null);
        return;
      }

      await deactivateFather(target.id);
      await refetch();
      const totalPages = fathers()?.totalPages ?? 1;
      if (fatherPage() > totalPages) {
        setFatherPage(clampPage(fatherPage(), totalPages));
      }
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const fatherRows = () => fathers()?.items ?? [];
  const fatherCurrentPage = () => fathers()?.page ?? 1;
  const fatherTotalPages = () => fathers()?.totalPages ?? 1;

  const handleFatherSort = (key: FatherSortKey) => {
    setFatherSort((current) => toggleSort(current, key));
    setFatherPage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-[1280px] rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de Tutores</h1>
            <p class="mt-1 text-sm text-gray-600">
              Administra tutores activos y sus estudiantes asociados.
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
              Nuevo tutor
            </button>
          </div>
        </div>

        <Show when={actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError()}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[1400px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Nombre completo"
                  columnKey="full_name"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Documento"
                  columnKey="document_id"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Teléfono"
                  columnKey="phone_number"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Ocupación"
                  columnKey="occupation"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Empresa"
                  columnKey="company"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Correo"
                  columnKey="email"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Dirección"
                  columnKey="address"
                  sort={fatherSort()}
                  onSort={handleFatherSort}
                />
                <th class="px-4 py-3 font-semibold">Estudiantes Asociados</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={!fathers.loading}
                fallback={
                  <tr>
                    <td class="px-4 py-4 text-gray-600" colSpan={9}>
                      Cargando tutores...
                    </td>
                  </tr>
                }
              >
                <Show
                  when={!fathers.error}
                  fallback={
                    <tr>
                      <td class="px-4 py-4 text-red-700" colSpan={9}>
                        {getErrorMessage(fathers.error)}
                      </td>
                    </tr>
                  }
                >
                  <Show
                    when={fatherRows().length > 0}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={9}>
                          No hay tutores registrados.
                        </td>
                      </tr>
                    }
                  >
                    <For each={fatherRows()}>
                      {(father) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{formatText(father.full_name)}</td>
                          <td class="px-4 py-3">{formatText(father.document_id)}</td>
                          <td class="px-4 py-3">{formatText(father.phone_number)}</td>
                          <td class="px-4 py-3">{formatText(father.occupation)}</td>
                          <td class="px-4 py-3">{formatText(father.company)}</td>
                          <td class="px-4 py-3">{formatText(father.email)}</td>
                          <td class="px-4 py-3">{formatText(father.address)}</td>
                          <td class="px-4 py-3">{formatNames(father.student_names)}</td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                aria-label={`Editar tutor ${father.full_name}`}
                                onClick={() => navigate(`/enrollment-management/tutors/${father.id}`)}
                              >
                                <i class="bi bi-pencil-square" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                aria-label={`Eliminar tutor ${father.full_name}`}
                                onClick={() => setDeleteTarget(father)}
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
          page={fatherCurrentPage()}
          totalPages={fatherTotalPages()}
          busy={fathers.loading || createBusy() || deleteBusy()}
          onPageChange={(nextPage) => setFatherPage(nextPage)}
        />
      </div>

      <Modal
        open={createOpen()}
        title="Crear tutor"
        description="Completa la información para registrar un tutor."
        confirmLabel="Crear tutor"
        cancelLabel="Cancelar"
        busy={createBusy()}
        size="xl"
        onConfirm={submitCreate}
        onClose={closeCreateModal}
      >
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="block">
              <span class="text-sm text-gray-700">Nombre completo</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('full_name') }}
                type="text"
                value={createForm().full_name}
                onInput={(event) => setCreateField('full_name', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('full_name')}
                aria-describedby={fieldError('full_name') ? 'create-father-full-name-error' : undefined}
              />
              <InlineFieldAlert id="create-father-full-name-error" message={fieldError('full_name')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Documento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('document_id') }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={createForm().document_id}
                onInput={(event) => setCreateField('document_id', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('document_id')}
                aria-describedby={fieldError('document_id') ? 'create-father-document-error' : undefined}
              />
              <InlineFieldAlert id="create-father-document-error" message={fieldError('document_id')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Teléfono</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={createForm().phone_number}
                onInput={(event) => setCreateField('phone_number', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Ocupación</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().occupation}
                onInput={(event) => setCreateField('occupation', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Empresa</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().company}
                onInput={(event) => setCreateField('company', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Correo</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('email') }}
                type="email"
                value={createForm().email}
                onInput={(event) => setCreateField('email', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('email')}
                aria-describedby={fieldError('email') ? 'create-father-email-error' : undefined}
              />
              <InlineFieldAlert id="create-father-email-error" message={fieldError('email')} />
            </label>

            <label class="block md:col-span-2">
              <span class="text-sm text-gray-700">Dirección</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().address}
                onInput={(event) => setCreateField('address', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>
          </div>

          <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-semibold text-gray-800">Estudiantes asociados</h3>
              <button
                type="button"
                class="rounded-md border border-yellow-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-yellow-100"
                onClick={addCreateLink}
                disabled={createBusy()}
              >
                Agregar vínculo
              </button>
            </div>

            <div class="mt-3 space-y-2">
              <For each={createLinks()}>
                {(link, indexAccessor) => {
                  const index = () => indexAccessor();

                  return (
                    <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                      <select
                        class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={link.studentId}
                        onChange={(event) => setCreateLinkStudent(index(), event.currentTarget.value)}
                        disabled={createBusy() || students.loading}
                      >
                        <option value="">
                          {students.loading ? 'Cargando estudiantes...' : 'Selecciona un estudiante'}
                        </option>
                        <For each={students() ?? []}>
                          {(student) => (
                            <option value={student.id}>{student.name}</option>
                          )}
                        </For>
                      </select>

                      <select
                        class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={link.relationship}
                        onChange={(event) => setCreateLinkRelationship(index(), event.currentTarget.value)}
                        disabled={createBusy()}
                      >
                        <For each={STUDENT_FATHER_RELATIONSHIPS}>
                          {(relationship) => (
                            <option value={relationship}>{relationship}</option>
                          )}
                        </For>
                      </select>

                      <button
                        type="button"
                        class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => removeCreateLink(index())}
                        disabled={createBusy() || createLinks().length <= 1}
                        aria-label={`Eliminar vínculo ${index() + 1}`}
                      >
                        <i class="bi bi-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>

            <InlineFieldAlert
              id="create-father-links-error"
              message={linksTouched() ? createLinksError() : undefined}
            />
          </div>

          <Show when={createError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={deleteTarget() !== null}
        title="Eliminar tutor"
        description={`Esta acción desactivará al tutor ${deleteTarget()?.full_name ?? ''}.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={deleteBusy()}
        onConfirm={confirmDelete}
        onClose={closeDeleteModal}
      />
    </section>
  );
}
