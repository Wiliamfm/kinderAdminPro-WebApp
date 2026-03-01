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
import { toggleSort, type SortState } from '../lib/table/sorting';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import { listActiveFathers } from '../lib/pocketbase/fathers';
import { listGrades } from '../lib/pocketbase/grades';
import {
  createStudent,
  deleteStudent,
  deactivateStudent,
  listActiveStudentsPage,
  type StudentListSortField,
  type StudentCreateInput,
  type StudentRecord,
} from '../lib/pocketbase/students';
import {
  createLinksForStudent,
  STUDENT_FATHER_RELATIONSHIPS,
  type StudentFatherLinkInput,
  type StudentFatherRelationship,
} from '../lib/pocketbase/students-fathers';

type StudentForm = {
  name: string;
  grade_id: string;
  date_of_birth: string;
  birth_place: string;
  department: string;
  document_id: string;
  weight: string;
  height: string;
  blood_type: string;
  social_security: string;
  allergies: string;
};

type StudentLinkForm = {
  fatherId: string;
  relationship: StudentFatherRelationship;
};

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DOCUMENT_ID_REGEX = /^\d+$/;

const emptyForm: StudentForm = {
  name: '',
  grade_id: '',
  date_of_birth: '',
  birth_place: '',
  department: '',
  document_id: '',
  weight: '',
  height: '',
  blood_type: '',
  social_security: '',
  allergies: '',
};

const STUDENT_VALIDATED_FIELDS = [
  'name',
  'grade_id',
  'date_of_birth',
  'birth_place',
  'department',
  'document_id',
  'weight',
  'height',
  'blood_type',
] as const;

type StudentValidatedField = (typeof STUDENT_VALIDATED_FIELDS)[number];

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

function formatNumber(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return String(value);
}

function formatNames(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '—';
}

type StudentSortKey = StudentListSortField;

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return Number.NaN;
  return numeric;
}

function isAtLeastYearsOld(date: Date, minimumYears: number): boolean {
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - minimumYears);
  return date.getTime() <= threshold.getTime();
}

function sanitizeNumericValue(value: string): string {
  return value.replace(/\D+/g, '');
}

function isValidatedField(field: keyof StudentForm): field is StudentValidatedField {
  return (STUDENT_VALIDATED_FIELDS as readonly string[]).includes(field);
}

function validateStudentForm(form: StudentForm): FieldErrorMap<StudentValidatedField> {
  const errors: FieldErrorMap<StudentValidatedField> = {};

  if (form.name.trim().length === 0) errors.name = 'Nombre es obligatorio.';
  if (form.grade_id.trim().length === 0) errors.grade_id = 'Grado es obligatorio.';
  if (form.date_of_birth.trim().length === 0) errors.date_of_birth = 'Fecha de nacimiento es obligatorio.';
  if (form.birth_place.trim().length === 0) errors.birth_place = 'Lugar de nacimiento es obligatorio.';
  if (form.department.trim().length === 0) errors.department = 'Departamento es obligatorio.';
  if (form.document_id.trim().length === 0) errors.document_id = 'Documento es obligatorio.';
  if (!errors.document_id && !DOCUMENT_ID_REGEX.test(form.document_id.trim())) {
    errors.document_id = 'Documento debe contener solo números.';
  }
  if (form.blood_type.trim().length === 0) errors.blood_type = 'Tipo de sangre es obligatorio.';

  if (!errors.date_of_birth) {
    const dateOfBirth = new Date(form.date_of_birth.trim());
    if (Number.isNaN(dateOfBirth.getTime())) {
      errors.date_of_birth = 'La fecha de nacimiento no es válida.';
    } else if (!isAtLeastYearsOld(dateOfBirth, 2)) {
      errors.date_of_birth = 'El estudiante debe tener al menos 2 años.';
    }
  }

  const weight = parseOptionalNumber(form.weight);
  if (Number.isNaN(weight)) {
    errors.weight = 'El peso debe ser un número válido mayor o igual a 0.';
  }

  const height = parseOptionalNumber(form.height);
  if (Number.isNaN(height)) {
    errors.height = 'La altura debe ser un número válido mayor o igual a 0.';
  }

  if (!errors.blood_type && !BLOOD_TYPE_OPTIONS.includes(form.blood_type.trim())) {
    errors.blood_type = 'Selecciona un tipo de sangre válido.';
  }

  return errors;
}

function toStudentCreateInput(form: StudentForm): StudentCreateInput {
  const weight = parseOptionalNumber(form.weight);
  const height = parseOptionalNumber(form.height);

  return {
    name: form.name.trim(),
    grade_id: form.grade_id.trim(),
    date_of_birth: new Date(form.date_of_birth.trim()).toISOString(),
    birth_place: form.birth_place.trim(),
    department: form.department.trim(),
    document_id: form.document_id.trim(),
    weight: typeof weight === 'number' && Number.isFinite(weight) ? weight : null,
    height: typeof height === 'number' && Number.isFinite(height) ? height : null,
    blood_type: form.blood_type.trim(),
    social_security: form.social_security.trim(),
    allergies: form.allergies.trim(),
  };
}

function createEmptyLink(): StudentLinkForm {
  return {
    fatherId: '',
    relationship: 'father',
  };
}

function validateLinks(
  links: StudentLinkForm[],
  hasAvailableFathers: boolean,
): string | undefined {
  if (!hasAvailableFathers) {
    return 'No hay tutores activos disponibles. Debes crear un tutor antes de registrar estudiantes.';
  }

  if (links.length === 0) {
    return 'Debes registrar al menos un tutor asociado.';
  }

  const selected = new Set<string>();

  for (const link of links) {
    if (link.fatherId.trim().length === 0) {
      return 'Cada vínculo debe incluir un tutor.';
    }

    if (!STUDENT_FATHER_RELATIONSHIPS.includes(link.relationship)) {
      return 'Cada vínculo debe incluir una relación válida.';
    }

    if (selected.has(link.fatherId)) {
      return 'No se permiten tutores duplicados en los vínculos.';
    }

    selected.add(link.fatherId);
  }

  return undefined;
}

function toLinkInput(links: StudentLinkForm[]): StudentFatherLinkInput[] {
  return links.map((link) => ({
    fatherId: link.fatherId.trim(),
    relationship: link.relationship,
  }));
}

export default function EnrollmentStudentsPage() {
  const navigate = useNavigate();
  const [studentPage, setStudentPage] = createSignal(1);
  const [grades] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listGrades();
  });
  const [fathers] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    try {
      return await listActiveFathers({ includeStudentNames: false });
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      const isAbortLike = message.includes('aborted') || message.includes('autocancel');
      if (isAbortLike) {
        console.warn('Ignoring auto-cancelled active fathers request in students page.', error);
      } else {
        console.error('Failed to load active fathers in students page.', error);
      }
      return [];
    }
  });

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<StudentForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(
    createInitialTouchedMap(STUDENT_VALIDATED_FIELDS),
  );
  const [linksTouched, setLinksTouched] = createSignal(false);
  const [createLinks, setCreateLinks] = createSignal<StudentLinkForm[]>([createEmptyLink()]);
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<StudentRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [studentSort, setStudentSort] = createSignal<SortState<StudentSortKey>>({
    key: 'name',
    direction: 'asc',
  });
  const [students, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;

      return {
        page: studentPage(),
        sortField: studentSort().key,
        sortDirection: studentSort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listActiveStudentsPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const setCreateField = (field: keyof StudentForm, value: string) => {
    const normalizedValue = field === 'document_id' ? sanitizeNumericValue(value) : value;
    setCreateForm((current) => ({
      ...current,
      [field]: normalizedValue,
    }));
    if (isValidatedField(field)) {
      setCreateTouched((current) => touchField(current, field));
    }
    setCreateError(null);
  };

  const createFieldErrors = createMemo(() => validateStudentForm(createForm()));
  const createLinksError = createMemo(() => validateLinks(createLinks(), (fathers()?.length ?? 0) > 0));
  const fieldError = (field: StudentValidatedField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const setCreateLinkFather = (index: number, value: string) => {
    setCreateLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index
        ? {
            ...link,
            fatherId: value,
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

  const submitCreate = async () => {
    setCreateTouched((current) => touchAllFields(current));
    setLinksTouched(true);
    if (hasAnyError(createFieldErrors()) || Boolean(createLinksError())) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      const created = await createStudent(toStudentCreateInput(createForm()));

      try {
        await createLinksForStudent(created.id, toLinkInput(createLinks()));
      } catch (error) {
        await deleteStudent(created.id);
        throw error;
      }

      await refetch();
      const totalPages = students()?.totalPages ?? 1;
      if (studentPage() > totalPages) {
        setStudentPage(clampPage(studentPage(), totalPages));
      }
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(STUDENT_VALIDATED_FIELDS));
      setCreateLinks([createEmptyLink()]);
      setLinksTouched(false);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const closeCreateModal = () => {
    if (createBusy()) return;
    setCreateOpen(false);
    setCreateError(null);
    setCreateForm(emptyForm);
    setCreateTouched(createInitialTouchedMap(STUDENT_VALIDATED_FIELDS));
    setCreateLinks([createEmptyLink()]);
    setLinksTouched(false);
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
      await deactivateStudent(target.id);
      await refetch();
      const totalPages = students()?.totalPages ?? 1;
      if (studentPage() > totalPages) {
        setStudentPage(clampPage(studentPage(), totalPages));
      }
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const studentRows = () => students()?.items ?? [];
  const studentCurrentPage = () => students()?.page ?? 1;
  const studentTotalPages = () => students()?.totalPages ?? 1;
  const handleStudentSort = (key: StudentSortKey) => {
    setStudentSort((current) => toggleSort(current, key));
    setStudentPage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-4 sm:p-6 lg:p-8">
      <div class="mx-auto max-w-[1280px] rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de estudiantes</h1>
            <p class="mt-1 text-sm text-gray-600">
              Administra estudiantes activos: crear, editar y eliminación lógica.
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
              onClick={() => {
                setCreateOpen(true);
                setCreateError(null);
                setCreateForm(emptyForm);
                setCreateTouched(createInitialTouchedMap(STUDENT_VALIDATED_FIELDS));
                setCreateLinks([createEmptyLink()]);
                setLinksTouched(false);
              }}
            >
              Nuevo estudiante
            </button>
          </div>
        </div>

        <Show when={actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError()}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[1600px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Nombre"
                  columnKey="name"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Grado"
                  columnKey="grade_name"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Fecha de nacimiento"
                  columnKey="date_of_birth"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Lugar de nacimiento"
                  columnKey="birth_place"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Departamento"
                  columnKey="department"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Documento"
                  columnKey="document_id"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Peso"
                  columnKey="weight"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Altura"
                  columnKey="height"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Tipo de sangre"
                  columnKey="blood_type"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Seguridad social"
                  columnKey="social_security"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Alergias"
                  columnKey="allergies"
                  sort={studentSort()}
                  onSort={handleStudentSort}
                />
                <th class="px-4 py-3 font-semibold">Tutores asociados</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!students.loading} fallback={
                <tr>
                  <td class="px-4 py-4 text-gray-600" colSpan={13}>
                    Cargando estudiantes...
                  </td>
                </tr>
              }>
                <Show when={!students.error} fallback={
                  <tr>
                    <td class="px-4 py-4 text-red-700" colSpan={13}>
                      {getErrorMessage(students.error)}
                    </td>
                  </tr>
                }>
                  <Show
                    when={studentRows().length > 0}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={13}>
                          No hay estudiantes registrados.
                        </td>
                      </tr>
                    }
                  >
                    <For each={studentRows()}>
                      {(student) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{formatText(student.name)}</td>
                          <td class="px-4 py-3">{formatText(student.grade_name)}</td>
                          <td class="px-4 py-3">{formatDateTime(student.date_of_birth)}</td>
                          <td class="px-4 py-3">{formatText(student.birth_place)}</td>
                          <td class="px-4 py-3">{formatText(student.department)}</td>
                          <td class="px-4 py-3">{formatText(student.document_id)}</td>
                          <td class="px-4 py-3">{formatNumber(student.weight)}</td>
                          <td class="px-4 py-3">{formatNumber(student.height)}</td>
                          <td class="px-4 py-3">{formatText(student.blood_type)}</td>
                          <td class="px-4 py-3">{formatText(student.social_security)}</td>
                          <td class="px-4 py-3">{formatText(student.allergies)}</td>
                          <td class="px-4 py-3">{formatNames(student.father_names)}</td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                aria-label={`Editar estudiante ${student.name}`}
                                onClick={() => navigate(`/enrollment-management/students/${student.id}`)}
                              >
                                <i class="bi bi-pencil-square" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                aria-label={`Eliminar estudiante ${student.name}`}
                                onClick={() => setDeleteTarget(student)}
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
          page={studentCurrentPage()}
          totalPages={studentTotalPages()}
          busy={students.loading || createBusy() || deleteBusy()}
          onPageChange={(nextPage) => setStudentPage(nextPage)}
        />
      </div>

      <Modal
        open={createOpen()}
        title="Crear estudiante"
        description="Completa la información para registrar un estudiante."
        confirmLabel="Crear estudiante"
        cancelLabel="Cancelar"
        busy={createBusy()}
        size="xl"
        onConfirm={submitCreate}
        onClose={closeCreateModal}
      >
        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label class="block">
              <span class="text-sm text-gray-700">Nombre</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('name') }}
                type="text"
                value={createForm().name}
                onInput={(event) => setCreateField('name', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('name')}
                aria-describedby={fieldError('name') ? 'create-student-name-error' : undefined}
              />
              <InlineFieldAlert id="create-student-name-error" message={fieldError('name')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Grado</span>
              <select
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('grade_id') }}
                value={createForm().grade_id}
                onChange={(event) => setCreateField('grade_id', event.currentTarget.value)}
                disabled={createBusy() || grades.loading}
                aria-invalid={!!fieldError('grade_id')}
                aria-describedby={fieldError('grade_id') ? 'create-student-grade-error' : undefined}
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
              <InlineFieldAlert id="create-student-grade-error" message={fieldError('grade_id')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Fecha de nacimiento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('date_of_birth') }}
                type="datetime-local"
                value={createForm().date_of_birth}
                onInput={(event) => setCreateField('date_of_birth', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('date_of_birth')}
                aria-describedby={fieldError('date_of_birth') ? 'create-student-birthdate-error' : undefined}
              />
              <InlineFieldAlert
                id="create-student-birthdate-error"
                message={fieldError('date_of_birth')}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Lugar de nacimiento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('birth_place') }}
                type="text"
                value={createForm().birth_place}
                onInput={(event) => setCreateField('birth_place', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('birth_place')}
                aria-describedby={fieldError('birth_place') ? 'create-student-birthplace-error' : undefined}
              />
              <InlineFieldAlert
                id="create-student-birthplace-error"
                message={fieldError('birth_place')}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Departamento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('department') }}
                type="text"
                value={createForm().department}
                onInput={(event) => setCreateField('department', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('department')}
                aria-describedby={fieldError('department') ? 'create-student-department-error' : undefined}
              />
              <InlineFieldAlert
                id="create-student-department-error"
                message={fieldError('department')}
              />
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
                aria-describedby={fieldError('document_id') ? 'create-student-document-error' : undefined}
              />
              <InlineFieldAlert
                id="create-student-document-error"
                message={fieldError('document_id')}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Tipo de sangre</span>
              <select
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('blood_type') }}
                value={createForm().blood_type}
                onChange={(event) => setCreateField('blood_type', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('blood_type')}
                aria-describedby={fieldError('blood_type') ? 'create-student-blood-error' : undefined}
              >
                <option value="">Selecciona un tipo</option>
                <For each={BLOOD_TYPE_OPTIONS}>
                  {(option) => (
                    <option value={option}>{option}</option>
                  )}
                </For>
              </select>
              <InlineFieldAlert id="create-student-blood-error" message={fieldError('blood_type')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Peso</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('weight') }}
                type="number"
                min="0"
                step="0.01"
                value={createForm().weight}
                onInput={(event) => setCreateField('weight', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('weight')}
                aria-describedby={fieldError('weight') ? 'create-student-weight-error' : undefined}
              />
              <InlineFieldAlert id="create-student-weight-error" message={fieldError('weight')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Altura</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!fieldError('height') }}
                type="number"
                min="0"
                step="0.01"
                value={createForm().height}
                onInput={(event) => setCreateField('height', event.currentTarget.value)}
                disabled={createBusy()}
                aria-invalid={!!fieldError('height')}
                aria-describedby={fieldError('height') ? 'create-student-height-error' : undefined}
              />
              <InlineFieldAlert id="create-student-height-error" message={fieldError('height')} />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Seguridad social</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().social_security}
                onInput={(event) => setCreateField('social_security', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block md:col-span-2">
              <span class="text-sm text-gray-700">Alergias</span>
              <textarea
                class="mt-1 min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={createForm().allergies}
                onInput={(event) => setCreateField('allergies', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>
          </div>

          <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-semibold text-gray-800">Tutores asociados</h3>
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
                        value={link.fatherId}
                        onChange={(event) => setCreateLinkFather(index(), event.currentTarget.value)}
                        disabled={createBusy() || fathers.loading}
                      >
                        <option value="">
                          {fathers.loading ? 'Cargando tutores...' : 'Selecciona un tutor'}
                        </option>
                        <For each={fathers() ?? []}>
                          {(father) => (
                            <option value={father.id}>{father.full_name}</option>
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
              id="create-student-links-error"
              message={linksTouched() ? createLinksError() : undefined}
            />
          </div>

          <p class="text-xs text-gray-500">
            La fecha se captura en hora local y se almacena con zona horaria.
          </p>

          <Show when={createError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={deleteTarget() !== null}
        title="Eliminar estudiante"
        description={`Esta acción ocultará al estudiante ${deleteTarget()?.name || ''} de la lista activa.`}
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
