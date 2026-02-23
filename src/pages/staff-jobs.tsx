import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import Modal from '../components/Modal';
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

const emptyForm: JobForm = {
  name: '',
  salary: '0',
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

export default function StaffJobsPage() {
  const navigate = useNavigate();
  const [jobs, { refetch }] = createResource(listEmployeeJobs);

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<JobForm>(emptyForm);
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [editTarget, setEditTarget] = createSignal<EmployeeJobRecord | null>(null);
  const [editForm, setEditForm] = createSignal<JobForm>(emptyForm);
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<EmployeeJobRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

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
  };

  const setEditField = (field: keyof JobForm, value: string) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = (form: JobForm, setError: (value: string | null) => void) => {
    const name = form.name.trim();
    const salary = Number(form.salary);

    if (name.length < 2) {
      setError('El nombre del cargo debe tener al menos 2 caracteres.');
      return null;
    }

    if (!Number.isFinite(salary) || !Number.isInteger(salary) || salary < 0) {
      setError('El salario debe ser un número entero válido mayor o igual a 0.');
      return null;
    }

    return { name, salary };
  };

  const submitCreate = async () => {
    const validated = validateForm(createForm(), setCreateError);
    if (!validated) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createEmployeeJob(validated);
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
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
    setEditError(null);
  };

  const submitEdit = async () => {
    const target = editTarget();
    if (!target) return;

    const validated = validateForm(editForm(), setEditError);
    if (!validated) return;

    setEditBusy(true);
    setEditError(null);
    setActionError(null);

    try {
      await updateEmployeeJob(target.id, validated);
      await refetch();
      setEditTarget(null);
      setEditForm(emptyForm);
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
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold">Salario</th>
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
                    <For each={jobs() ?? []}>
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
              value={createForm().name}
              onInput={(event) => setCreateField('name', event.currentTarget.value)}
              disabled={createBusy()}
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Salario</span>
            <input
              type="number"
              min="0"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={createForm().salary}
              onInput={(event) => setCreateField('salary', event.currentTarget.value)}
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
              value={editForm().name}
              onInput={(event) => setEditField('name', event.currentTarget.value)}
              disabled={editBusy()}
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Salario</span>
            <input
              type="number"
              min="0"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={editForm().salary}
              onInput={(event) => setEditField('salary', event.currentTarget.value)}
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
