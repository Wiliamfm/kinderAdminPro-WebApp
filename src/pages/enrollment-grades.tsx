import { useNavigate } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import Modal from '../components/Modal';
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
  countActiveStudentsByGradeId,
  createGrade,
  deleteGrade,
  listGrades,
  type GradeRecord,
  updateGrade,
} from '../lib/pocketbase/grades';

type GradeForm = {
  name: string;
  capacity: string;
};

const GRADE_FIELDS = ['name', 'capacity'] as const;
type GradeField = (typeof GRADE_FIELDS)[number];

const emptyForm: GradeForm = {
  name: '',
  capacity: '',
};

function validateForm(form: GradeForm): FieldErrorMap<GradeField> {
  const errors: FieldErrorMap<GradeField> = {};
  const name = form.name.trim();
  const capacity = Number(form.capacity);

  if (name.length === 0) {
    errors.name = 'Nombre es obligatorio.';
  }

  if (!Number.isFinite(capacity) || !Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'La capacidad debe ser un número entero mayor o igual a 1.';
  }

  return errors;
}

function buildPayload(form: GradeForm) {
  return {
    name: form.name.trim(),
    capacity: Number(form.capacity),
  };
}

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

function formatCapacity(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return '—';
}

export default function EnrollmentGradesPage() {
  const navigate = useNavigate();
  const [grades, { refetch }] = createResource(listGrades);

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<GradeForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(GRADE_FIELDS));
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [editTarget, setEditTarget] = createSignal<GradeRecord | null>(null);
  const [editForm, setEditForm] = createSignal<GradeForm>(emptyForm);
  const [editTouched, setEditTouched] = createSignal(createInitialTouchedMap(GRADE_FIELDS));
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<GradeRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const setCreateField = (field: keyof GradeForm, value: string) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCreateTouched((current) => touchField(current, field as GradeField));
    setCreateError(null);
  };

  const setEditField = (field: keyof GradeForm, value: string) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
    setEditTouched((current) => touchField(current, field as GradeField));
    setEditError(null);
  };

  const createFieldErrors = createMemo(() => validateForm(createForm()));
  const editFieldErrors = createMemo(() => validateForm(editForm()));
  const createNameError = () => (createTouched().name ? createFieldErrors().name : undefined);
  const createCapacityError = () => (createTouched().capacity ? createFieldErrors().capacity : undefined);
  const editNameError = () => (editTouched().name ? editFieldErrors().name : undefined);
  const editCapacityError = () => (editTouched().capacity ? editFieldErrors().capacity : undefined);

  const submitCreate = async () => {
    const touched = touchAllFields(createTouched());
    setCreateTouched(touched);
    if (hasAnyError(createFieldErrors())) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createGrade(buildPayload(createForm()));
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(GRADE_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (grade: GradeRecord) => {
    setEditTarget(grade);
    setEditForm({
      name: grade.name,
      capacity: String(grade.capacity),
    });
    setEditTouched(createInitialTouchedMap(GRADE_FIELDS));
    setEditError(null);
  };

  const submitEdit = async () => {
    const target = editTarget();
    if (!target) return;

    const touched = touchAllFields(editTouched());
    setEditTouched(touched);
    if (hasAnyError(editFieldErrors())) return;

    setEditBusy(true);
    setEditError(null);
    setActionError(null);

    try {
      await updateGrade(target.id, buildPayload(editForm()));
      await refetch();
      setEditTarget(null);
      setEditForm(emptyForm);
      setEditTouched(createInitialTouchedMap(GRADE_FIELDS));
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
      const linkedStudents = await countActiveStudentsByGradeId(target.id);
      if (linkedStudents > 0) {
        setActionError(
          `No se puede eliminar el grado ${target.name} porque está asignado a ${linkedStudents} estudiante(s).`,
        );
        setDeleteTarget(null);
        return;
      }

      await deleteGrade(target.id);
      await refetch();
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de grados</h1>
            <p class="mt-2 text-gray-600">
              Administra grados y su capacidad para la asignación de estudiantes.
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

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
            onClick={() => {
              setCreateOpen(true);
              setCreateForm(emptyForm);
              setCreateTouched(createInitialTouchedMap(GRADE_FIELDS));
              setCreateError(null);
            }}
          >
            Nuevo grado
          </button>
        </div>

        <Show when={actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError()}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[640px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold">Capacidad</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={!grades.loading}
                fallback={
                  <tr>
                    <td class="px-4 py-4 text-gray-600" colSpan={3}>
                      Cargando grados...
                    </td>
                  </tr>
                }
              >
                <Show
                  when={!grades.error}
                  fallback={
                    <tr>
                      <td class="px-4 py-4 text-red-700" colSpan={3}>
                        {getErrorMessage(grades.error)}
                      </td>
                    </tr>
                  }
                >
                  <Show
                    when={(grades() ?? []).length > 0}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={3}>
                          No hay grados registrados.
                        </td>
                      </tr>
                    }
                  >
                    <For each={grades() ?? []}>
                      {(grade) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{grade.name}</td>
                          <td class="px-4 py-3">{formatCapacity(grade.capacity)}</td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                aria-label={`Editar grado ${grade.name}`}
                                onClick={() => openEdit(grade)}
                              >
                                <i class="bi bi-pencil-square" aria-hidden="true"></i>
                              </button>

                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                aria-label={`Eliminar grado ${grade.name}`}
                                onClick={() => setDeleteTarget(grade)}
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
      </div>

      <Modal
        open={createOpen()}
        title="Crear grado"
        confirmLabel="Crear grado"
        busy={createBusy()}
        onConfirm={submitCreate}
        onClose={() => {
          if (createBusy()) return;
          setCreateOpen(false);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Nombre</span>
            <input
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createNameError() }}
              value={createForm().name}
              onInput={(event) => setCreateField('name', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!createNameError()}
              aria-describedby={createNameError() ? 'create-grade-name-error' : undefined}
            />
            <InlineFieldAlert id="create-grade-name-error" message={createNameError()} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Capacidad</span>
            <input
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createCapacityError() }}
              value={createForm().capacity}
              onInput={(event) => setCreateField('capacity', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!createCapacityError()}
              aria-describedby={createCapacityError() ? 'create-grade-capacity-error' : undefined}
            />
            <InlineFieldAlert id="create-grade-capacity-error" message={createCapacityError()} />
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
        title="Editar grado"
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
            <span class="text-sm text-gray-700">Nombre</span>
            <input
              type="text"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editNameError() }}
              value={editForm().name}
              onInput={(event) => setEditField('name', event.currentTarget.value)}
              disabled={editBusy()}
              aria-invalid={!!editNameError()}
              aria-describedby={editNameError() ? 'edit-grade-name-error' : undefined}
            />
            <InlineFieldAlert id="edit-grade-name-error" message={editNameError()} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Capacidad</span>
            <input
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editCapacityError() }}
              value={editForm().capacity}
              onInput={(event) => setEditField('capacity', event.currentTarget.value)}
              disabled={editBusy()}
              aria-invalid={!!editCapacityError()}
              aria-describedby={editCapacityError() ? 'edit-grade-capacity-error' : undefined}
            />
            <InlineFieldAlert id="edit-grade-capacity-error" message={editCapacityError()} />
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
        title="Eliminar grado"
        description={`Esta acción eliminará el grado ${deleteTarget()?.name ?? ''}.`}
        confirmLabel="Eliminar"
        busy={deleteBusy()}
        variant="danger"
        onConfirm={confirmDelete}
        onClose={() => {
          if (deleteBusy()) return;
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}
