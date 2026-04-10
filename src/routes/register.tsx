import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import type { PocketBaseRequestError } from '../lib/pocketbase/errors';
import {
  listPublicGrades,
  submitPublicRegistration,
} from '../lib/pocketbase/public';
import {
  formatRelationshipLabel,
  STUDENT_FATHER_RELATIONSHIPS,
  type StudentFatherRelationship,
} from '../lib/pocketbase/students-fathers';

type RegistrationForm = {
  student_name: string;
  grade_id: string;
  date_of_birth: string;
  birth_place: string;
  department: string;
  student_document_id: string;
  weight: string;
  height: string;
  blood_type: string;
  social_security: string;
  allergies: string;
  father_full_name: string;
  father_document_id: string;
  phone_number: string;
  occupation: string;
  company: string;
  email: string;
  address: string;
  password: string;
  passwordConfirm: string;
  relationship: StudentFatherRelationship | '';
};

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const DOCUMENT_ID_REGEX = /^\d+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const REGISTRATION_VALIDATED_FIELDS = [
  'student_name',
  'grade_id',
  'date_of_birth',
  'birth_place',
  'department',
  'student_document_id',
  'weight',
  'height',
  'blood_type',
  'father_full_name',
  'father_document_id',
  'phone_number',
  'occupation',
  'email',
  'address',
  'password',
  'passwordConfirm',
  'relationship',
] as const;

type RegistrationValidatedField = (typeof REGISTRATION_VALIDATED_FIELDS)[number];

const emptyForm: RegistrationForm = {
  student_name: '',
  grade_id: '',
  date_of_birth: '',
  birth_place: '',
  department: '',
  student_document_id: '',
  weight: '',
  height: '',
  blood_type: '',
  social_security: '',
  allergies: '',
  father_full_name: '',
  father_document_id: '',
  phone_number: '',
  occupation: '',
  company: '',
  email: '',
  address: '',
  password: '',
  passwordConfirm: '',
  relationship: 'father',
};

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo completar la solicitud.';
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return Number.NaN;

  return numeric;
}

function sanitizeNumericValue(value: string): string {
  return value.replace(/\D+/g, '');
}

function isAtLeastYearsOld(date: Date, minimumYears: number): boolean {
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - minimumYears);
  return date.getTime() <= threshold.getTime();
}

function isValidatedField(field: keyof RegistrationForm): field is RegistrationValidatedField {
  return (REGISTRATION_VALIDATED_FIELDS as readonly string[]).includes(field);
}

function validateRegistrationForm(
  form: RegistrationForm,
  availableGradeIds: Set<string>,
): FieldErrorMap<RegistrationValidatedField> {
  const errors: FieldErrorMap<RegistrationValidatedField> = {};

  if (form.student_name.trim().length === 0) errors.student_name = 'Nombre es obligatorio.';
  if (form.grade_id.trim().length === 0) {
    errors.grade_id = 'Grado es obligatorio.';
  } else if (availableGradeIds.size > 0 && !availableGradeIds.has(form.grade_id.trim())) {
    errors.grade_id = 'Selecciona un grado válido.';
  }
  if (form.date_of_birth.trim().length === 0) errors.date_of_birth = 'Fecha de nacimiento es obligatorio.';
  if (form.birth_place.trim().length === 0) errors.birth_place = 'Lugar de nacimiento es obligatorio.';
  if (form.department.trim().length === 0) errors.department = 'Departamento es obligatorio.';
  if (form.student_document_id.trim().length === 0) {
    errors.student_document_id = 'Documento es obligatorio.';
  } else if (!DOCUMENT_ID_REGEX.test(form.student_document_id.trim())) {
    errors.student_document_id = 'Documento debe contener solo números.';
  }
  if (form.blood_type.trim().length === 0) {
    errors.blood_type = 'Tipo de sangre es obligatorio.';
  } else if (!BLOOD_TYPE_OPTIONS.includes(form.blood_type.trim() as (typeof BLOOD_TYPE_OPTIONS)[number])) {
    errors.blood_type = 'Selecciona un tipo de sangre válido.';
  }

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

  if (form.father_full_name.trim().length === 0) errors.father_full_name = 'Nombre completo es obligatorio.';
  if (form.father_document_id.trim().length === 0) {
    errors.father_document_id = 'Documento es obligatorio.';
  } else if (!DOCUMENT_ID_REGEX.test(form.father_document_id.trim())) {
    errors.father_document_id = 'Documento debe contener solo números.';
  }
  if (form.phone_number.trim().length === 0) errors.phone_number = 'Teléfono es obligatorio.';
  if (form.occupation.trim().length === 0) errors.occupation = 'Ocupación es obligatorio.';
  if (form.email.trim().length === 0) {
    errors.email = 'Correo electrónico es obligatorio.';
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Correo electrónico no es válido.';
  }
  if (form.address.trim().length === 0) errors.address = 'Dirección es obligatorio.';
  if (form.password.length === 0) {
    errors.password = 'Contraseña es obligatoria.';
  } else if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }
  if (form.passwordConfirm.length === 0) {
    errors.passwordConfirm = 'Confirmación de contraseña es obligatoria.';
  } else if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = 'Las contraseñas no coinciden';
  }
  if (!STUDENT_FATHER_RELATIONSHIPS.includes(form.relationship as StudentFatherRelationship)) {
    errors.relationship = 'Relación es obligatoria.';
  }

  return errors;
}

export default function RegisterPage() {
  const [form, setForm] = createSignal<RegistrationForm>(emptyForm);
  const [touched, setTouched] = createSignal(createInitialTouchedMap(REGISTRATION_VALIDATED_FIELDS));
  const [submitBusy, setSubmitBusy] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = createSignal(false);

  const [grades] = createResource(listPublicGrades);

  const availableGradeIds = createMemo(() => new Set((grades() ?? []).map((grade) => grade.id)));
  const fieldErrors = createMemo(() => validateRegistrationForm(form(), availableGradeIds()));
  const fieldError = (field: RegistrationValidatedField) => (
    touched()[field] ? fieldErrors()[field] : undefined
  );

  const setField = (field: keyof RegistrationForm, value: string) => {
    const normalizedValue = (
      field === 'student_document_id'
      || field === 'father_document_id'
      || field === 'phone_number'
    )
      ? sanitizeNumericValue(value)
      : value;

    setForm((current) => ({
      ...current,
      [field]: normalizedValue,
    }));

    if (isValidatedField(field)) {
      setTouched((current) => touchField(current, field));
    }

    setSubmitError(null);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (submitBusy()) return;

    setTouched((current) => touchAllFields(current));
    setSubmitError(null);

    if (grades.loading) {
      setSubmitError('Los grados todavía se están cargando. Intenta de nuevo en un momento.');
      return;
    }

    if (grades.error) {
      setSubmitError(getErrorMessage(grades.error));
      return;
    }

    if ((grades()?.length ?? 0) === 0) {
      setSubmitError('No hay grados disponibles en este momento.');
      return;
    }

    if (hasAnyError(fieldErrors())) {
      return;
    }

    setSubmitBusy(true);

    try {
      const weight = parseOptionalNumber(form().weight);
      const height = parseOptionalNumber(form().height);

      await submitPublicRegistration({
        father: {
          full_name: form().father_full_name,
          document_id: form().father_document_id,
          phone_number: form().phone_number,
          occupation: form().occupation,
          company: form().company,
          email: form().email,
          address: form().address,
        },
        student: {
          name: form().student_name,
          grade_id: form().grade_id,
          date_of_birth: new Date(form().date_of_birth.trim()).toISOString(),
          birth_place: form().birth_place,
          department: form().department,
          document_id: form().student_document_id,
          weight: typeof weight === 'number' && Number.isFinite(weight) ? weight : null,
          height: typeof height === 'number' && Number.isFinite(height) ? height : null,
          blood_type: form().blood_type,
          social_security: form().social_security,
          allergies: form().allergies,
        },
        relationship: form().relationship as StudentFatherRelationship,
        password: form().password,
        passwordConfirm: form().passwordConfirm,
      });

      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-[linear-gradient(180deg,#fff7d6_0%,#fffdf4_40%,#ffffff_100%)] px-4 py-8 text-gray-800 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <div class="rounded-[28px] border border-yellow-200 bg-white/95 p-6 shadow-[0_24px_80px_rgba(120,83,0,0.10)] sm:p-8 lg:p-10">
          <div class="max-w-3xl">
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-700">Registro público</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Solicitud de inscripción estudiantil
            </h1>
            <p class="mt-4 text-sm leading-6 text-gray-600 sm:text-base">
              Completa la información del estudiante y de su padre, madre o acudiente. La solicitud
              quedará pendiente de aprobación por el equipo de matrícula.
            </p>
          </div>

          <Show
            when={!submitSuccess()}
            fallback={(
              <div class="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
                <h2 class="text-2xl font-semibold text-emerald-900">Tu solicitud está pendiente de aprobación</h2>
                <p class="mt-3 text-sm text-emerald-800 sm:text-base">
                  Recibimos la información correctamente. El equipo de matrícula la revisará en el
                  flujo de solicitudes pendientes.
                </p>
                <p class="mt-3 text-sm text-emerald-800 sm:text-base">
                  Tu cuenta ya fue creada y puedes iniciar sesión con el correo y la contraseña que
                  registraste.
                </p>
              </div>
            )}
          >
            <form class="mt-8 space-y-8" onSubmit={handleSubmit}>
              <Show when={submitError()}>
                <div class="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError()}
                </div>
              </Show>

              <div class="rounded-3xl border border-yellow-200 bg-yellow-50/60 p-5 sm:p-6">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 class="text-xl font-semibold text-gray-900">Datos del estudiante</h2>
                    <p class="text-sm text-gray-600">Información académica y personal básica.</p>
                  </div>
                </div>

                <div class="mt-6 grid gap-5 md:grid-cols-2">
                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Nombre</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().student_name}
                      onInput={(event) => setField('student_name', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('student_name')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Grado</span>
                    <select
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      value={form().grade_id}
                      onChange={(event) => setField('grade_id', event.currentTarget.value)}
                      disabled={grades.loading || Boolean(grades.error)}
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
                    <InlineFieldAlert message={fieldError('grade_id')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Fecha de nacimiento</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="datetime-local"
                      value={form().date_of_birth}
                      onInput={(event) => setField('date_of_birth', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('date_of_birth')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Lugar de nacimiento</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().birth_place}
                      onInput={(event) => setField('birth_place', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('birth_place')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Departamento</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().department}
                      onInput={(event) => setField('department', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('department')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Documento</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      inputMode="numeric"
                      value={form().student_document_id}
                      onInput={(event) => setField('student_document_id', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('student_document_id')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Peso</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      inputMode="decimal"
                      value={form().weight}
                      onInput={(event) => setField('weight', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('weight')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Altura</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      inputMode="decimal"
                      value={form().height}
                      onInput={(event) => setField('height', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('height')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Tipo de sangre</span>
                    <select
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      value={form().blood_type}
                      onChange={(event) => setField('blood_type', event.currentTarget.value)}
                    >
                      <option value="">Selecciona un tipo de sangre</option>
                      <For each={BLOOD_TYPE_OPTIONS}>
                        {(bloodType) => (
                          <option value={bloodType}>{bloodType}</option>
                        )}
                      </For>
                    </select>
                    <InlineFieldAlert message={fieldError('blood_type')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Seguridad social</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().social_security}
                      onInput={(event) => setField('social_security', event.currentTarget.value)}
                    />
                  </label>

                  <label class="block md:col-span-2">
                    <span class="text-sm font-medium text-gray-700">Alergias</span>
                    <textarea
                      class="mt-2 min-h-28 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      value={form().allergies}
                      onInput={(event) => setField('allergies', event.currentTarget.value)}
                    />
                  </label>
                </div>
              </div>

              <div class="rounded-3xl border border-yellow-200 bg-white p-5 sm:p-6">
                <div>
                  <h2 class="text-xl font-semibold text-gray-900">Datos del acudiente</h2>
                  <p class="text-sm text-gray-600">Persona responsable del estudiante.</p>
                </div>

                <div class="mt-6 grid gap-5 md:grid-cols-2">
                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Nombre completo</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().father_full_name}
                      onInput={(event) => setField('father_full_name', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('father_full_name')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Documento</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      inputMode="numeric"
                      value={form().father_document_id}
                      onInput={(event) => setField('father_document_id', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('father_document_id')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Teléfono</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      inputMode="numeric"
                      value={form().phone_number}
                      onInput={(event) => setField('phone_number', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('phone_number')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Ocupación</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().occupation}
                      onInput={(event) => setField('occupation', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('occupation')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Empresa</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().company}
                      onInput={(event) => setField('company', event.currentTarget.value)}
                    />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Correo electrónico</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="email"
                      value={form().email}
                      onInput={(event) => setField('email', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('email')} />
                  </label>

                  <label class="block md:col-span-2">
                    <span class="text-sm font-medium text-gray-700">Dirección</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="text"
                      value={form().address}
                      onInput={(event) => setField('address', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('address')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Contraseña</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="password"
                      aria-label="Contraseña"
                      autocomplete="new-password"
                      value={form().password}
                      onInput={(event) => setField('password', event.currentTarget.value)}
                    />
                    <p class="mt-2 text-xs text-gray-500">Debe tener al menos 8 caracteres.</p>
                    <InlineFieldAlert message={fieldError('password')} />
                  </label>

                  <label class="block">
                    <span class="text-sm font-medium text-gray-700">Confirmar contraseña</span>
                    <input
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      type="password"
                      aria-label="Confirmar contraseña"
                      autocomplete="new-password"
                      value={form().passwordConfirm}
                      onInput={(event) => setField('passwordConfirm', event.currentTarget.value)}
                    />
                    <InlineFieldAlert message={fieldError('passwordConfirm')} />
                  </label>

                  <label class="block md:col-span-2">
                    <span class="text-sm font-medium text-gray-700">Relación con el estudiante</span>
                    <select
                      class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                      value={form().relationship}
                      onChange={(event) => setField('relationship', event.currentTarget.value)}
                    >
                      <option value="">Selecciona una relación</option>
                      <For each={STUDENT_FATHER_RELATIONSHIPS}>
                        {(relationship) => (
                          <option value={relationship}>{formatRelationshipLabel(relationship)}</option>
                        )}
                      </For>
                    </select>
                    <InlineFieldAlert message={fieldError('relationship')} />
                  </label>
                </div>
              </div>

              <div class="flex flex-col gap-3 border-t border-yellow-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-gray-600">
                  Al enviar este formulario, la solicitud quedará pendiente de revisión.
                </p>
                <button
                  type="submit"
                  class="inline-flex items-center justify-center rounded-full bg-yellow-400 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-yellow-500 disabled:cursor-not-allowed disabled:bg-yellow-200"
                  disabled={submitBusy() || grades.loading || Boolean(grades.error)}
                >
                  {submitBusy() ? 'Enviando solicitud...' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </Show>
        </div>
      </div>
    </section>
  );
}
