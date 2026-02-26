import { useNavigate } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import Modal from '../components/Modal';
import SortableHeaderCell from '../components/SortableHeaderCell';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import { sortRows, toggleSort, type SortState } from '../lib/table/sorting';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  countEmployeesByJobId,
  createEmployeeJob,
  deleteEmployeeJob,
  listEmployeeJobs,
  type EmployeeJobRecord,
  updateEmployeeJob,
} from '../lib/pocketbase/employee-jobs';

type JobForm = {
  name: string;
  salary: string;
};

const JOB_FIELDS = ['name', 'salary'] as const;
type JobField = (typeof JOB_FIELDS)[number];

const emptyForm: JobForm = {
  name: '',
  salary: '0',
};

function validateForm(form: JobForm): FieldErrorMap<JobField> {
  const errors: FieldErrorMap<JobField> = {};
  const name = form.name.trim();
  const salary = Number(form.salary);

  if (name.length < 2) {
    errors.name = 'El nombre del cargo debe tener al menos 2 caracteres.';
  }

  if (!Number.isFinite(salary) || !Number.isInteger(salary) || salary < 0) {
    errors.salary = 'El salario debe ser un número entero válido mayor o igual a 0.';
  }

  return errors;
}

function buildPayload(form: JobForm) {
  return {
    name: form.name.trim(),
    salary: Number(form.salary),
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

function formatSalary(value: number | string): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return '—';
}

function toSortableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toSortableNumber(value: number | string): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

type JobSortKey = 'name' | 'salary';

export default function StaffJobsPage() {
  const navigate = useNavigate();
  const [jobs, { refetch }] = createResource(listEmployeeJobs);

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<JobForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(JOB_FIELDS));
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [editTarget, setEditTarget] = createSignal<EmployeeJobRecord | null>(null);
  const [editForm, setEditForm] = createSignal<JobForm>(emptyForm);
  const [editTouched, setEditTouched] = createSignal(createInitialTouchedMap(JOB_FIELDS));
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<EmployeeJobRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [jobSort, setJobSort] = createSignal<SortState<JobSortKey>>({
    key: 'name',
    direction: 'asc',
  });

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/staff-management', { replace: true });
    }
  });

  const setCreateField = (field: keyof JobForm, value: string) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCreateTouched((current) => touchField(current, field as JobField));
    setCreateError(null);
  };

  const setEditField = (field: keyof JobForm, value: string) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
    setEditTouched((current) => touchField(current, field as JobField));
    setEditError(null);
  };

  const createFieldErrors = createMemo(() => validateForm(createForm()));
  const editFieldErrors = createMemo(() => validateForm(editForm()));
  const createNameError = () => (createTouched().name ? createFieldErrors().name : undefined);
  const createSalaryError = () => (createTouched().salary ? createFieldErrors().salary : undefined);
  const editNameError = () => (editTouched().name ? editFieldErrors().name : undefined);
  const editSalaryError = () => (editTouched().salary ? editFieldErrors().salary : undefined);

  const submitCreate = async () => {
    const touched = touchAllFields(createTouched());
    setCreateTouched(touched);
    if (hasAnyError(createFieldErrors())) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createEmployeeJob(buildPayload(createForm()));
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(JOB_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (job: EmployeeJobRecord) => {
    setEditTarget(job);
    setEditForm({
      name: job.name,
      salary: String(job.salary),
    });
    setEditTouched(createInitialTouchedMap(JOB_FIELDS));
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
      await updateEmployeeJob(target.id, buildPayload(editForm()));
      await refetch();
      setEditTarget(null);
      setEditForm(emptyForm);
      setEditTouched(createInitialTouchedMap(JOB_FIELDS));
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
      const linkedEmployees = await countEmployeesByJobId(target.id);
      if (linkedEmployees > 0) {
        setActionError(
          `No se puede eliminar el cargo ${target.name} porque está asignado a ${linkedEmployees} empleado(s).`,
        );
        setDeleteTarget(null);
        return;
      }

      await deleteEmployeeJob(target.id);
      await refetch();
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const jobRows = createMemo(() => sortRows(jobs() ?? [], jobSort(), {
    name: (job) => toSortableText(job.name),
    salary: (job) => toSortableNumber(job.salary),
  }));

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de cargos</h1>
            <p class="mt-2 text-gray-600">
              Administra los cargos y salarios para asignarlos a los empleados.
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/staff-management')}
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
              setCreateTouched(createInitialTouchedMap(JOB_FIELDS));
              setCreateError(null);
            }}
          >
            Nuevo cargo
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
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Nombre"
                  columnKey="name"
                  sort={jobSort()}
                  onSort={(key) => setJobSort((current) => toggleSort(current, key))}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Salario"
                  columnKey="salary"
                  sort={jobSort()}
                  onSort={(key) => setJobSort((current) => toggleSort(current, key))}
                />
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show
                when={!jobs.loading}
                fallback={
                  <tr>
                    <td class="px-4 py-4 text-gray-600" colSpan={3}>
                      Cargando cargos...
                    </td>
                  </tr>
                }
              >
                <Show
                  when={!jobs.error}
                  fallback={
                    <tr>
                      <td class="px-4 py-4 text-red-700" colSpan={3}>
                        {getErrorMessage(jobs.error)}
                      </td>
                    </tr>
                  }
                >
                  <Show
                    when={(jobs() ?? []).length > 0}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={3}>
                          No hay cargos registrados.
                        </td>
                      </tr>
                    }
                  >
                    <For each={jobRows()}>
                      {(job) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{job.name}</td>
                          <td class="px-4 py-3">{formatSalary(job.salary)}</td>
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="rounded border border-blue-300 bg-blue-50 px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                                aria-label={`Editar cargo ${job.name}`}
                                onClick={() => openEdit(job)}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                class="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 transition-colors hover:bg-red-100"
                                aria-label={`Eliminar cargo ${job.name}`}
                                onClick={() => setDeleteTarget(job)}
                              >
                                Eliminar
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
        title="Crear cargo"
        confirmLabel="Crear cargo"
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
              aria-describedby={createNameError() ? 'create-job-name-error' : undefined}
            />
            <InlineFieldAlert id="create-job-name-error" message={createNameError()} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Salario</span>
            <input
              type="number"
              min="0"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createSalaryError() }}
              value={createForm().salary}
              onInput={(event) => setCreateField('salary', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!createSalaryError()}
              aria-describedby={createSalaryError() ? 'create-job-salary-error' : undefined}
            />
            <InlineFieldAlert id="create-job-salary-error" message={createSalaryError()} />
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
        title="Editar cargo"
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
              aria-describedby={editNameError() ? 'edit-job-name-error' : undefined}
            />
            <InlineFieldAlert id="edit-job-name-error" message={editNameError()} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Salario</span>
            <input
              type="number"
              min="0"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editSalaryError() }}
              value={editForm().salary}
              onInput={(event) => setEditField('salary', event.currentTarget.value)}
              disabled={editBusy()}
              aria-invalid={!!editSalaryError()}
              aria-describedby={editSalaryError() ? 'edit-job-salary-error' : undefined}
            />
            <InlineFieldAlert id="edit-job-salary-error" message={editSalaryError()} />
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
        title="Eliminar cargo"
        description={`Esta acción eliminará el cargo ${deleteTarget()?.name ?? ''}.`}
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
