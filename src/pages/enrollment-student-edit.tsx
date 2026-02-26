import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  getStudentById,
  updateStudent,
  type StudentUpdateInput,
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

function toDateTimeLocalValue(value: string): string {
  if (!value) return '';

  const normalized = value.includes(' ') && value.includes('Z')
    ? value.replace(' ', 'T')
    : value;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';

  const tzOffsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return Number.NaN;
  return numeric;
}

export default function EnrollmentStudentEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [student] = createResource(() => params.id, getStudentById);
  const [form, setForm] = createSignal<StudentForm>(emptyForm);
  const [formError, setFormError] = createSignal<string | null>(null);
  const [saveBusy, setSaveBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  createEffect(() => {
    const current = student();
    if (!current) return;

    setForm({
      name: current.name,
      date_of_birth: toDateTimeLocalValue(current.date_of_birth),
      birth_place: current.birth_place,
      department: current.department,
      document_id: current.document_id,
      weight: current.weight !== null ? String(current.weight) : '',
      height: current.height !== null ? String(current.height) : '',
      blood_type: current.blood_type,
      social_security: current.social_security,
      allergies: current.allergies,
    });
  });

  const setField = (field: keyof StudentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): StudentUpdateInput | null => {
    const current = form();

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
      setFormError(`${missing[0]} es obligatorio.`);
      return null;
    }

    const dateOfBirth = new Date(current.date_of_birth.trim());
    if (Number.isNaN(dateOfBirth.getTime())) {
      setFormError('La fecha de nacimiento no es válida.');
      return null;
    }

    const weight = parseOptionalNumber(current.weight);
    if (Number.isNaN(weight)) {
      setFormError('El peso debe ser un número válido mayor o igual a 0.');
      return null;
    }

    const height = parseOptionalNumber(current.height);
    if (Number.isNaN(height)) {
      setFormError('La altura debe ser un número válido mayor o igual a 0.');
      return null;
    }

    if (!BLOOD_TYPE_OPTIONS.includes(current.blood_type.trim())) {
      setFormError('Selecciona un tipo de sangre válido.');
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

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setFormError(null);

    const validated = validateForm();
    if (!validated) return;

    setSaveBusy(true);
    try {
      await updateStudent(params.id, validated);
      navigate('/enrollment-management/students', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-4xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <h1 class="text-2xl font-semibold">Editar estudiante</h1>
        <p class="mt-2 text-gray-600">Actualiza la información del estudiante seleccionado.</p>

        <Show when={student.loading}>
          <p class="mt-4 text-sm text-gray-600">Cargando estudiante...</p>
        </Show>

        <Show when={student.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(student.error)}
          </div>
        </Show>

        <Show when={!student.loading && student()}>
          <form class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Nombre</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().name}
                onInput={(event) => setField('name', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Fecha de nacimiento</span>
              <input
                type="datetime-local"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().date_of_birth}
                onInput={(event) => setField('date_of_birth', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Lugar de nacimiento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().birth_place}
                onInput={(event) => setField('birth_place', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Departamento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().department}
                onInput={(event) => setField('department', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Documento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().document_id}
                onInput={(event) => setField('document_id', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Tipo de sangre</span>
              <select
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().blood_type}
                onChange={(event) => setField('blood_type', event.currentTarget.value)}
              >
                <option value="">Selecciona un tipo</option>
                <For each={BLOOD_TYPE_OPTIONS}>
                  {(option) => (
                    <option value={option}>{option}</option>
                  )}
                </For>
              </select>
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Peso</span>
              <input
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().weight}
                onInput={(event) => setField('weight', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Altura</span>
              <input
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().height}
                onInput={(event) => setField('height', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Seguridad social</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().social_security}
                onInput={(event) => setField('social_security', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm md:col-span-2">
              <span class="mb-1 block font-medium text-gray-700">Alergias</span>
              <textarea
                class="min-h-24 w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().allergies}
                onInput={(event) => setField('allergies', event.currentTarget.value)}
              />
            </label>

            <p class="text-xs text-gray-500 md:col-span-2">
              La fecha se captura en hora local y se almacena con zona horaria.
            </p>

            <Show when={formError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
                {formError()}
              </div>
            </Show>

            <div class="mt-2 flex flex-wrap justify-end gap-2 md:col-span-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/enrollment-management/students')}
                disabled={saveBusy()}
              >
                Volver
              </button>
              <button
                type="submit"
                class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saveBusy()}
              >
                {saveBusy() ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Show>
      </div>
    </section>
  );
}
