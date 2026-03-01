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
  createBulletinStudent,
  listBulletinStudentFormOptions,
  listBulletinsStudentsPage,
  softDeleteBulletinStudent,
  updateBulletinStudent,
  type BulletinStudentFormOptions,
  type BulletinStudentListSortField,
  type BulletinStudentRecord,
} from '../lib/pocketbase/bulletins-students';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { toggleSort, type SortState } from '../lib/table/sorting';

type BulletinStudentForm = {
  bulletin_id: string;
  student_id: string;
  grade_id: string;
  semester_id: string;
  note: string;
  comments: string;
};

const BULLETIN_STUDENT_FIELDS = [
  'bulletin_id',
  'student_id',
  'grade_id',
  'semester_id',
  'note',
] as const;

type BulletinStudentField = (typeof BULLETIN_STUDENT_FIELDS)[number];
type BulletinStudentSortKey = BulletinStudentListSortField;

const emptyForm: BulletinStudentForm = {
  bulletin_id: '',
  student_id: '',
  grade_id: '',
  semester_id: '',
  note: '',
  comments: '',
};

const emptyFormOptions: BulletinStudentFormOptions = {
  bulletins: [],
  students: [],
  grades: [],
  semesters: [],
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

function isAbortLikeError(error: unknown): boolean {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized?.isAbort) return true;

  const message = getErrorMessage(error).toLowerCase();
  return message.includes('aborted') || message.includes('autocancel');
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

function formatNote(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return '—';
}

function validateForm(form: BulletinStudentForm): FieldErrorMap<BulletinStudentField> {
  const errors: FieldErrorMap<BulletinStudentField> = {};

  if (form.bulletin_id.trim().length === 0) {
    errors.bulletin_id = 'Boletín es obligatorio.';
  }

  if (form.student_id.trim().length === 0) {
    errors.student_id = 'Estudiante es obligatorio.';
  }

  if (form.grade_id.trim().length === 0) {
    errors.grade_id = 'Grado es obligatorio.';
  }

  if (form.semester_id.trim().length === 0) {
    errors.semester_id = 'Semestre es obligatorio.';
  }

  const noteRaw = form.note.trim();
  if (noteRaw.length === 0) {
    errors.note = 'Nota es obligatoria.';
    return errors;
  }

  const noteNumber = Number(noteRaw);
  if (!Number.isFinite(noteNumber) || !Number.isInteger(noteNumber)) {
    errors.note = 'Nota debe ser un número entero válido.';
    return errors;
  }

  if (noteNumber <= 0) {
    errors.note = 'Nota debe ser mayor que 0.';
  }

  return errors;
}

function buildPayload(form: BulletinStudentForm) {
  return {
    bulletin_id: form.bulletin_id,
    student_id: form.student_id,
    grade_id: form.grade_id,
    semester_id: form.semester_id,
    note: Number(form.note.trim()),
    comments: form.comments,
  };
}

function toFormNoteValue(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

export default function ReportsStudentsPage() {
  const navigate = useNavigate();

  const [reportPage, setReportPage] = createSignal(1);
  const [reportSort, setReportSort] = createSignal<SortState<BulletinStudentSortKey>>({
    key: 'updated_at',
    direction: 'desc',
  });

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [formOptions, setFormOptions] = createSignal<BulletinStudentFormOptions>(emptyFormOptions);
  const [formOptionsLoading, setFormOptionsLoading] = createSignal(false);
  const [formOptionsLoaded, setFormOptionsLoaded] = createSignal(false);

  const loadFormOptions = async (force = false): Promise<void> => {
    if (!isAuthUserAdmin()) return;
    if (formOptionsLoading()) return;
    if (formOptionsLoaded() && !force) return;

    setFormOptionsLoading(true);
    try {
      const options = await listBulletinStudentFormOptions();
      setFormOptions(options);
      setFormOptionsLoaded(true);
    } catch (error) {
      if (isAbortLikeError(error)) {
        console.warn('Ignoring auto-cancelled bulletin student options request in reports students page.', error);
      } else {
        console.error('Failed to load bulletin student options in reports students page.', error);
      }

      if (!formOptionsLoaded()) {
        setFormOptions(emptyFormOptions);
      }
    } finally {
      setFormOptionsLoading(false);
    }
  };

  const [bulletinsStudents, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;
      return {
        page: reportPage(),
        sortField: reportSort().key,
        sortDirection: reportSort().direction,
      };
    },
    ({ page, sortField, sortDirection }) => listBulletinsStudentsPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<BulletinStudentForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [editTarget, setEditTarget] = createSignal<BulletinStudentRecord | null>(null);
  const [editForm, setEditForm] = createSignal<BulletinStudentForm>(emptyForm);
  const [editTouched, setEditTouched] = createSignal(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<BulletinStudentRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/reports', { replace: true });
    }
  });

  const createFieldErrors = createMemo(() => validateForm(createForm()));
  const editFieldErrors = createMemo(() => validateForm(editForm()));

  const createFieldError = (field: BulletinStudentField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const editFieldError = (field: BulletinStudentField) => (
    editTouched()[field] ? editFieldErrors()[field] : undefined
  );

  const setCreateField = (field: keyof BulletinStudentForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    if ((BULLETIN_STUDENT_FIELDS as readonly string[]).includes(field)) {
      setCreateTouched((current) => touchField(current, field as BulletinStudentField));
    }
    setCreateError(null);
  };

  const setEditField = (field: keyof BulletinStudentForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    if ((BULLETIN_STUDENT_FIELDS as readonly string[]).includes(field)) {
      setEditTouched((current) => touchField(current, field as BulletinStudentField));
    }
    setEditError(null);
  };

  const submitCreate = async () => {
    setCreateTouched((current) => touchAllFields(current));
    if (hasAnyError(createFieldErrors())) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createBulletinStudent(buildPayload(createForm()));
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (record: BulletinStudentRecord) => {
    void loadFormOptions();
    setEditTarget(record);
    setEditError(null);
    setEditTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
    setEditForm({
      bulletin_id: record.bulletin_id,
      student_id: record.student_id,
      grade_id: record.grade_id,
      semester_id: record.semester_id,
      note: toFormNoteValue(record.note),
      comments: record.comments,
    });
  };

  const submitEdit = async () => {
    const target = editTarget();
    if (!target) return;

    setEditTouched((current) => touchAllFields(current));
    if (hasAnyError(editFieldErrors())) return;

    setEditBusy(true);
    setEditError(null);
    setActionError(null);

    try {
      await updateBulletinStudent(target.id, buildPayload(editForm()));
      await refetch();
      setEditTarget(null);
      setEditForm(emptyForm);
      setEditTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;

    setDeleteBusy(true);
    setActionError(null);

    try {
      await softDeleteBulletinStudent(target.id);
      await refetch();
      const totalPages = bulletinsStudents()?.totalPages ?? 1;
      if (reportPage() > totalPages) {
        setReportPage(clampPage(reportPage(), totalPages));
      }
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const rows = () => bulletinsStudents()?.items ?? [];
  const currentPage = () => bulletinsStudents()?.page ?? 1;
  const totalPages = () => bulletinsStudents()?.totalPages ?? 1;

  const handleSort = (key: BulletinStudentSortKey) => {
    setReportSort((current) => toggleSort(current, key));
    setReportPage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-[1280px] space-y-6">
        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-semibold">Informe de estudiantes</h1>
              <p class="mt-1 text-sm text-gray-600">
                Consulta y administra los reportes académicos asociados a boletines por estudiante.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
              onClick={() => navigate('/reports')}
            >
              Volver
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-semibold">Estudiantes</h2>
              <p class="mt-1 text-sm text-gray-600">
                Gestiona el registro de notas y observaciones por boletín, grado y semestre.
              </p>
            </div>

            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              onClick={() => {
                void loadFormOptions();
                setCreateOpen(true);
                setCreateError(null);
                setCreateForm(emptyForm);
                setCreateTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
              }}
            >
              Nuevo reporte
            </button>
          </div>

          <Show when={actionError()}>
            <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError()}
            </div>
          </Show>

          <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
            <table class="min-w-[1850px] w-full text-left text-sm">
              <thead class="bg-yellow-100 text-gray-700">
                <tr>
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Boletin"
                    columnKey="bulletin_label"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Estudiante"
                    columnKey="student_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Grado"
                    columnKey="grade_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Semestre"
                    columnKey="semester_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Nota"
                    columnKey="note"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Comentarios"
                    columnKey="comments"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado"
                    columnKey="created_at"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado"
                    columnKey="updated_at"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado por"
                    columnKey="created_by_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado por"
                    columnKey="updated_by_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <th class="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <Show
                  when={!bulletinsStudents.loading}
                  fallback={(
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={11}>
                        Cargando reportes de estudiantes...
                      </td>
                    </tr>
                  )}
                >
                  <Show
                    when={!bulletinsStudents.error}
                    fallback={(
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={11}>
                          {getErrorMessage(bulletinsStudents.error)}
                        </td>
                      </tr>
                    )}
                  >
                    <Show
                      when={rows().length > 0}
                      fallback={(
                        <tr>
                          <td class="px-4 py-4 text-gray-600" colSpan={11}>
                            No hay reportes registrados.
                          </td>
                        </tr>
                      )}
                    >
                      <For each={rows()}>
                        {(record) => (
                          <tr class="border-t border-yellow-100 align-top">
                            <td class="px-4 py-3">{formatText(record.bulletin_label)}</td>
                            <td class="px-4 py-3">{formatText(record.student_name)}</td>
                            <td class="px-4 py-3">{formatText(record.grade_name)}</td>
                            <td class="px-4 py-3">{formatText(record.semester_name)}</td>
                            <td class="px-4 py-3">{formatNote(record.note)}</td>
                            <td class="px-4 py-3">{formatText(record.comments)}</td>
                            <td class="px-4 py-3">{formatDateTime(record.created_at)}</td>
                            <td class="px-4 py-3">{formatDateTime(record.updated_at)}</td>
                            <td class="px-4 py-3">{formatText(record.created_by_name)}</td>
                            <td class="px-4 py-3">{formatText(record.updated_by_name)}</td>
                            <td class="px-4 py-3">
                              <div class="flex items-center gap-2">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label={`Editar reporte ${record.id}`}
                                  onClick={() => openEdit(record)}
                                >
                                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                  aria-label={`Eliminar reporte ${record.id}`}
                                  onClick={() => setDeleteTarget(record)}
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
            page={currentPage()}
            totalPages={totalPages()}
            busy={bulletinsStudents.loading || createBusy() || editBusy() || deleteBusy()}
            onPageChange={(nextPage) => setReportPage(nextPage)}
          />
        </div>
      </div>

      <Modal
        open={createOpen()}
        title="Crear reporte de estudiante"
        description="Las fechas de creación y actualización se registran automáticamente."
        confirmLabel="Crear reporte"
        busy={createBusy()}
        onConfirm={submitCreate}
        onClose={() => {
          if (createBusy()) return;
          setCreateOpen(false);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Boletín</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('bulletin_id') }}
              value={createForm().bulletin_id}
              onChange={(event) => setCreateField('bulletin_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('bulletin_id')}
              aria-describedby={createFieldError('bulletin_id') ? 'create-report-bulletin-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando boletines...' : 'Selecciona un boletín'}
              </option>
              <For each={formOptions().bulletins}>
                {(bulletin) => <option value={bulletin.id}>{bulletin.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-bulletin-error" message={createFieldError('bulletin_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Estudiante</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('student_id') }}
              value={createForm().student_id}
              onChange={(event) => setCreateField('student_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('student_id')}
              aria-describedby={createFieldError('student_id') ? 'create-report-student-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando estudiantes...' : 'Selecciona un estudiante'}
              </option>
              <For each={formOptions().students}>
                {(student) => <option value={student.id}>{student.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-student-error" message={createFieldError('student_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Grado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('grade_id') }}
              value={createForm().grade_id}
              onChange={(event) => setCreateField('grade_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('grade_id')}
              aria-describedby={createFieldError('grade_id') ? 'create-report-grade-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando grados...' : 'Selecciona un grado'}
              </option>
              <For each={formOptions().grades}>
                {(grade) => <option value={grade.id}>{grade.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-grade-error" message={createFieldError('grade_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Semestre</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('semester_id') }}
              value={createForm().semester_id}
              onChange={(event) => setCreateField('semester_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('semester_id')}
              aria-describedby={createFieldError('semester_id') ? 'create-report-semester-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando semestres...' : 'Selecciona un semestre'}
              </option>
              <For each={formOptions().semesters}>
                {(semester) => <option value={semester.id}>{semester.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-semester-error" message={createFieldError('semester_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Nota</span>
            <input
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('note') }}
              value={createForm().note}
              onInput={(event) => setCreateField('note', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!createFieldError('note')}
              aria-describedby={createFieldError('note') ? 'create-report-note-error' : undefined}
            />
            <InlineFieldAlert id="create-report-note-error" message={createFieldError('note')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Comentarios</span>
            <textarea
              class="mt-1 h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={createForm().comments}
              onInput={(event) => setCreateField('comments', event.currentTarget.value)}
              disabled={createBusy()}
            />
          </label>

          <Show when={createError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={editTarget() !== null}
        title="Editar reporte de estudiante"
        description="La fecha de creación no se puede modificar."
        confirmLabel="Guardar cambios"
        busy={editBusy()}
        onConfirm={submitEdit}
        onClose={() => {
          if (editBusy()) return;
          setEditTarget(null);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Boletín</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('bulletin_id') }}
              value={editForm().bulletin_id}
              onChange={(event) => setEditField('bulletin_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('bulletin_id')}
              aria-describedby={editFieldError('bulletin_id') ? 'edit-report-bulletin-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando boletines...' : 'Selecciona un boletín'}
              </option>
              <For each={formOptions().bulletins}>
                {(bulletin) => <option value={bulletin.id}>{bulletin.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-bulletin-error" message={editFieldError('bulletin_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Estudiante</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('student_id') }}
              value={editForm().student_id}
              onChange={(event) => setEditField('student_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('student_id')}
              aria-describedby={editFieldError('student_id') ? 'edit-report-student-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando estudiantes...' : 'Selecciona un estudiante'}
              </option>
              <For each={formOptions().students}>
                {(student) => <option value={student.id}>{student.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-student-error" message={editFieldError('student_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Grado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('grade_id') }}
              value={editForm().grade_id}
              onChange={(event) => setEditField('grade_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('grade_id')}
              aria-describedby={editFieldError('grade_id') ? 'edit-report-grade-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando grados...' : 'Selecciona un grado'}
              </option>
              <For each={formOptions().grades}>
                {(grade) => <option value={grade.id}>{grade.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-grade-error" message={editFieldError('grade_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Semestre</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('semester_id') }}
              value={editForm().semester_id}
              onChange={(event) => setEditField('semester_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('semester_id')}
              aria-describedby={editFieldError('semester_id') ? 'edit-report-semester-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando semestres...' : 'Selecciona un semestre'}
              </option>
              <For each={formOptions().semesters}>
                {(semester) => <option value={semester.id}>{semester.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-semester-error" message={editFieldError('semester_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Nota</span>
            <input
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('note') }}
              value={editForm().note}
              onInput={(event) => setEditField('note', event.currentTarget.value)}
              disabled={editBusy()}
              aria-invalid={!!editFieldError('note')}
              aria-describedby={editFieldError('note') ? 'edit-report-note-error' : undefined}
            />
            <InlineFieldAlert id="edit-report-note-error" message={editFieldError('note')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Comentarios</span>
            <textarea
              class="mt-1 h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={editForm().comments}
              onInput={(event) => setEditField('comments', event.currentTarget.value)}
              disabled={editBusy()}
            />
          </label>

          <Show when={editError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {editError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={deleteTarget() !== null}
        title="Eliminar reporte de estudiante"
        description={`Esta acción realizará eliminación lógica del reporte de ${deleteTarget()?.student_name ?? 'estudiante seleccionado'}.`}
        confirmLabel="Eliminar"
        variant="danger"
        busy={deleteBusy()}
        onConfirm={confirmDelete}
        onClose={() => {
          if (deleteBusy()) return;
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}
