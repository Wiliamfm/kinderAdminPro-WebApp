import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import Modal from '../components/Modal';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  createStudent,
  deactivateStudent,
  listActiveStudents,
  type StudentCreateInput,
  type StudentRecord,
} from '../lib/pocketbase/students';

type StudentForm = {
  name: string;
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

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm: StudentForm = {
  name: '',
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

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return Number.NaN;
  return numeric;
}

export default function EnrollmentStudentsPage() {
  const navigate = useNavigate();
  const [students, { refetch }] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listActiveStudents();
  });

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<StudentForm>(emptyForm);
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<StudentRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  const setCreateField = (field: keyof StudentForm, value: string) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = (): StudentCreateInput | null => {
    const current = createForm();

    const requiredFields: Array<[string, string]> = [
      ['Nombre', current.name],
      ['Fecha de nacimiento', current.date_of_birth],
      ['Lugar de nacimiento', current.birth_place],
      ['Departamento', current.department],
      ['Documento', current.document_id],
      ['Tipo de sangre', current.blood_type],
    ];

    const missing = requiredFields.find(([, value]) => value.trim().length === 0);
    if (missing) {
      setCreateError(`${missing[0]} es obligatorio.`);
      return null;
    }

    const dateOfBirth = new Date(current.date_of_birth.trim());
    if (Number.isNaN(dateOfBirth.getTime())) {
      setCreateError('La fecha de nacimiento no es válida.');
      return null;
    }

    const weight = parseOptionalNumber(current.weight);
    if (Number.isNaN(weight)) {
      setCreateError('El peso debe ser un número válido mayor o igual a 0.');
      return null;
    }

    const height = parseOptionalNumber(current.height);
    if (Number.isNaN(height)) {
      setCreateError('La altura debe ser un número válido mayor o igual a 0.');
      return null;
    }

    if (!BLOOD_TYPE_OPTIONS.includes(current.blood_type.trim())) {
      setCreateError('Selecciona un tipo de sangre válido.');
      return null;
    }

    return {
      name: current.name.trim(),
      date_of_birth: dateOfBirth.toISOString(),
      birth_place: current.birth_place.trim(),
      department: current.department.trim(),
      document_id: current.document_id.trim(),
      weight,
      height,
      blood_type: current.blood_type.trim(),
      social_security: current.social_security.trim(),
      allergies: current.allergies.trim(),
    };
  };

  const submitCreate = async () => {
    const validated = validateForm();
    if (!validated) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createStudent(validated);
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
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
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
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
          <table class="min-w-[1400px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold">Fecha de nacimiento</th>
                <th class="px-4 py-3 font-semibold">Lugar de nacimiento</th>
                <th class="px-4 py-3 font-semibold">Departamento</th>
                <th class="px-4 py-3 font-semibold">Documento</th>
                <th class="px-4 py-3 font-semibold">Peso</th>
                <th class="px-4 py-3 font-semibold">Altura</th>
                <th class="px-4 py-3 font-semibold">Tipo de sangre</th>
                <th class="px-4 py-3 font-semibold">Seguridad social</th>
                <th class="px-4 py-3 font-semibold">Alergias</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!students.loading} fallback={
                <tr>
                  <td class="px-4 py-4 text-gray-600" colSpan={11}>
                    Cargando estudiantes...
                  </td>
                </tr>
              }>
                <Show when={!students.error} fallback={
                  <tr>
                    <td class="px-4 py-4 text-red-700" colSpan={11}>
                      {getErrorMessage(students.error)}
                    </td>
                  </tr>
                }>
                  <Show
                    when={(students() ?? []).length > 0}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={11}>
                          No hay estudiantes registrados.
                        </td>
                      </tr>
                    }
                  >
                    <For each={students() ?? []}>
                      {(student) => (
                        <tr class="border-t border-yellow-100 align-top">
                          <td class="px-4 py-3">{formatText(student.name)}</td>
                          <td class="px-4 py-3">{formatDateTime(student.date_of_birth)}</td>
                          <td class="px-4 py-3">{formatText(student.birth_place)}</td>
                          <td class="px-4 py-3">{formatText(student.department)}</td>
                          <td class="px-4 py-3">{formatText(student.document_id)}</td>
                          <td class="px-4 py-3">{formatNumber(student.weight)}</td>
                          <td class="px-4 py-3">{formatNumber(student.height)}</td>
                          <td class="px-4 py-3">{formatText(student.blood_type)}</td>
                          <td class="px-4 py-3">{formatText(student.social_security)}</td>
                          <td class="px-4 py-3">{formatText(student.allergies)}</td>
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
                type="text"
                value={createForm().name}
                onInput={(event) => setCreateField('name', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Fecha de nacimiento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="datetime-local"
                value={createForm().date_of_birth}
                onInput={(event) => setCreateField('date_of_birth', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Lugar de nacimiento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().birth_place}
                onInput={(event) => setCreateField('birth_place', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Departamento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().department}
                onInput={(event) => setCreateField('department', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Documento</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="text"
                value={createForm().document_id}
                onInput={(event) => setCreateField('document_id', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Tipo de sangre</span>
              <select
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={createForm().blood_type}
                onChange={(event) => setCreateField('blood_type', event.currentTarget.value)}
                disabled={createBusy()}
              >
                <option value="">Selecciona un tipo</option>
                <For each={BLOOD_TYPE_OPTIONS}>
                  {(option) => (
                    <option value={option}>{option}</option>
                  )}
                </For>
              </select>
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Peso</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                value={createForm().weight}
                onInput={(event) => setCreateField('weight', event.currentTarget.value)}
                disabled={createBusy()}
              />
            </label>

            <label class="block">
              <span class="text-sm text-gray-700">Altura</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                value={createForm().height}
                onInput={(event) => setCreateField('height', event.currentTarget.value)}
                disabled={createBusy()}
              />
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
