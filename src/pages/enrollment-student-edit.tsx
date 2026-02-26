import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
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

const STUDENT_VALIDATED_FIELDS = [
  'name',
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

function isAtLeastYearsOld(date: Date, minimumYears: number): boolean {
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - minimumYears);
  return date.getTime() <= threshold.getTime();
}

function isValidatedField(field: keyof StudentForm): field is StudentValidatedField {
  return (STUDENT_VALIDATED_FIELDS as readonly string[]).includes(field);
}

function validateStudentForm(form: StudentForm): FieldErrorMap<StudentValidatedField> {
  const errors: FieldErrorMap<StudentValidatedField> = {};

  if (form.name.trim().length === 0) errors.name = 'Nombre es obligatorio.';
  if (form.date_of_birth.trim().length === 0) errors.date_of_birth = 'Fecha de nacimiento es obligatorio.';
  if (form.birth_place.trim().length === 0) errors.birth_place = 'Lugar de nacimiento es obligatorio.';
  if (form.department.trim().length === 0) errors.department = 'Departamento es obligatorio.';
  if (form.document_id.trim().length === 0) errors.document_id = 'Documento es obligatorio.';
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

function toStudentUpdateInput(form: StudentForm): StudentUpdateInput {
  const weight = parseOptionalNumber(form.weight);
  const height = parseOptionalNumber(form.height);

  return {
    name: form.name.trim(),
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

export default function EnrollmentStudentEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [student] = createResource(() => params.id, getStudentById);
  const [form, setForm] = createSignal<StudentForm>(emptyForm);
  const [touched, setTouched] = createSignal(createInitialTouchedMap(STUDENT_VALIDATED_FIELDS));
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
    setTouched(createInitialTouchedMap(STUDENT_VALIDATED_FIELDS));
    setFormError(null);
  });

  const setField = (field: keyof StudentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (isValidatedField(field)) {
      setTouched((current) => touchField(current, field));
    }
    setFormError(null);
  };
  const fieldErrors = createMemo(() => validateStudentForm(form()));
  const fieldError = (field: StudentValidatedField) => (touched()[field] ? fieldErrors()[field] : undefined);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    setTouched((current) => touchAllFields(current));
    if (hasAnyError(fieldErrors())) return;

    setFormError(null);

    setSaveBusy(true);
    try {
      await updateStudent(params.id, toStudentUpdateInput(form()));
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
                classList={{ 'field-input-invalid': !!fieldError('name') }}
                value={form().name}
                onInput={(event) => setField('name', event.currentTarget.value)}
                aria-invalid={!!fieldError('name')}
                aria-describedby={fieldError('name') ? 'edit-student-name-error' : undefined}
              />
              <InlineFieldAlert id="edit-student-name-error" message={fieldError('name')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Fecha de nacimiento</span>
              <input
                type="datetime-local"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('date_of_birth') }}
                value={form().date_of_birth}
                onInput={(event) => setField('date_of_birth', event.currentTarget.value)}
                aria-invalid={!!fieldError('date_of_birth')}
                aria-describedby={fieldError('date_of_birth') ? 'edit-student-birthdate-error' : undefined}
              />
              <InlineFieldAlert
                id="edit-student-birthdate-error"
                message={fieldError('date_of_birth')}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Lugar de nacimiento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('birth_place') }}
                value={form().birth_place}
                onInput={(event) => setField('birth_place', event.currentTarget.value)}
                aria-invalid={!!fieldError('birth_place')}
                aria-describedby={fieldError('birth_place') ? 'edit-student-birthplace-error' : undefined}
              />
              <InlineFieldAlert id="edit-student-birthplace-error" message={fieldError('birth_place')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Departamento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('department') }}
                value={form().department}
                onInput={(event) => setField('department', event.currentTarget.value)}
                aria-invalid={!!fieldError('department')}
                aria-describedby={fieldError('department') ? 'edit-student-department-error' : undefined}
              />
              <InlineFieldAlert id="edit-student-department-error" message={fieldError('department')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Documento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('document_id') }}
                value={form().document_id}
                onInput={(event) => setField('document_id', event.currentTarget.value)}
                aria-invalid={!!fieldError('document_id')}
                aria-describedby={fieldError('document_id') ? 'edit-student-document-error' : undefined}
              />
              <InlineFieldAlert id="edit-student-document-error" message={fieldError('document_id')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Tipo de sangre</span>
              <select
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('blood_type') }}
                value={form().blood_type}
                onChange={(event) => setField('blood_type', event.currentTarget.value)}
                aria-invalid={!!fieldError('blood_type')}
                aria-describedby={fieldError('blood_type') ? 'edit-student-blood-error' : undefined}
              >
                <option value="">Selecciona un tipo</option>
                <For each={BLOOD_TYPE_OPTIONS}>
                  {(option) => (
                    <option value={option}>{option}</option>
                  )}
                </For>
              </select>
              <InlineFieldAlert id="edit-student-blood-error" message={fieldError('blood_type')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Peso</span>
              <input
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('weight') }}
                value={form().weight}
                onInput={(event) => setField('weight', event.currentTarget.value)}
                aria-invalid={!!fieldError('weight')}
                aria-describedby={fieldError('weight') ? 'edit-student-weight-error' : undefined}
              />
              <InlineFieldAlert id="edit-student-weight-error" message={fieldError('weight')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Altura</span>
              <input
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('height') }}
                value={form().height}
                onInput={(event) => setField('height', event.currentTarget.value)}
                aria-invalid={!!fieldError('height')}
                aria-describedby={fieldError('height') ? 'edit-student-height-error' : undefined}
              />
              <InlineFieldAlert id="edit-student-height-error" message={fieldError('height')} />
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
