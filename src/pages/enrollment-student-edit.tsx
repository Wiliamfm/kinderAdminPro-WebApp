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
import { listActiveFathers } from '../lib/pocketbase/fathers';
import { listGrades } from '../lib/pocketbase/grades';
import {
  getStudentById,
  updateStudent,
  type StudentUpdateInput,
} from '../lib/pocketbase/students';
import {
  listLinksByStudentId,
  replaceLinksForStudent,
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

function createEmptyLink(): StudentLinkForm {
  return {
    fatherId: '',
    relationship: 'father',
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

function toStudentUpdateInput(form: StudentForm): StudentUpdateInput {
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

function validateLinks(
  links: StudentLinkForm[],
  hasAvailableFathers: boolean,
): string | undefined {
  if (!hasAvailableFathers) {
    return 'No hay tutores activos disponibles. Debes crear un tutor antes de continuar.';
  }

  if (links.length === 0) {
    return 'Debes conservar al menos un tutor asociado.';
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

export default function EnrollmentStudentEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [student] = createResource(() => params.id, getStudentById);
  const [studentLinks] = createResource(() => params.id, listLinksByStudentId);
  const [grades] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listGrades();
  });
  const [fathers] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    return listActiveFathers();
  });
  const [form, setForm] = createSignal<StudentForm>(emptyForm);
  const [links, setLinks] = createSignal<StudentLinkForm[]>([createEmptyLink()]);
  const [touched, setTouched] = createSignal(createInitialTouchedMap(STUDENT_VALIDATED_FIELDS));
  const [linksTouched, setLinksTouched] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);
  const [saveBusy, setSaveBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  createEffect(() => {
    const current = student();
    if (!current || grades.loading) return;

    setForm({
      name: current.name,
      grade_id: current.grade_id,
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

  createEffect(() => {
    const currentLinks = studentLinks();
    if (!currentLinks) return;

    if (currentLinks.length === 0) {
      setLinks([createEmptyLink()]);
      setLinksTouched(false);
      return;
    }

    setLinks(currentLinks.map((link) => ({
      fatherId: link.fatherId,
      relationship: link.relationship,
    })));
    setLinksTouched(false);
  });

  const setField = (field: keyof StudentForm, value: string) => {
    const normalizedValue = field === 'document_id' ? sanitizeNumericValue(value) : value;
    setForm((prev) => ({ ...prev, [field]: normalizedValue }));
    if (isValidatedField(field)) {
      setTouched((current) => touchField(current, field));
    }
    setFormError(null);
  };

  const setLinkFather = (index: number, value: string) => {
    setLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index
        ? {
            ...link,
            fatherId: value,
          }
        : link
    )));
    setLinksTouched(true);
    setFormError(null);
  };

  const setLinkRelationship = (index: number, value: string) => {
    if (!STUDENT_FATHER_RELATIONSHIPS.includes(value as StudentFatherRelationship)) return;

    setLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index
        ? {
            ...link,
            relationship: value as StudentFatherRelationship,
          }
        : link
    )));
    setLinksTouched(true);
    setFormError(null);
  };

  const addLink = () => {
    setLinks((current) => [...current, createEmptyLink()]);
    setLinksTouched(true);
    setFormError(null);
  };

  const removeLink = (index: number) => {
    setLinks((current) => current.filter((_, linkIndex) => linkIndex !== index));
    setLinksTouched(true);
    setFormError(null);
  };
  const fieldErrors = createMemo(() => validateStudentForm(form()));
  const linksError = createMemo(() => validateLinks(links(), (fathers()?.length ?? 0) > 0));
  const fieldError = (field: StudentValidatedField) => (touched()[field] ? fieldErrors()[field] : undefined);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    setTouched((current) => touchAllFields(current));
    setLinksTouched(true);
    if (hasAnyError(fieldErrors()) || Boolean(linksError())) return;

    setFormError(null);

    setSaveBusy(true);
    try {
      await updateStudent(params.id, toStudentUpdateInput(form()));
      await replaceLinksForStudent(params.id, toLinkInput(links()));
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
        <Show when={grades.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(grades.error)}
          </div>
        </Show>
        <Show when={studentLinks.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(studentLinks.error)}
          </div>
        </Show>
        <Show when={fathers.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(fathers.error)}
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
              <span class="mb-1 block font-medium text-gray-700">Grado</span>
              <select
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('grade_id') }}
                value={form().grade_id}
                onChange={(event) => setField('grade_id', event.currentTarget.value)}
                disabled={saveBusy() || grades.loading}
                aria-invalid={!!fieldError('grade_id')}
                aria-describedby={fieldError('grade_id') ? 'edit-student-grade-error' : undefined}
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
              <InlineFieldAlert id="edit-student-grade-error" message={fieldError('grade_id')} />
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
                inputMode="numeric"
                pattern="[0-9]*"
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

            <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 md:col-span-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-gray-800">Tutores asociados</h2>
                <button
                  type="button"
                  class="rounded-md border border-yellow-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-yellow-100"
                  onClick={addLink}
                  disabled={saveBusy()}
                >
                  Agregar vínculo
                </button>
              </div>

              <div class="mt-3 space-y-2">
                <For each={links()}>
                  {(link, indexAccessor) => {
                    const index = () => indexAccessor();

                    return (
                      <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                        <select
                          class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          value={link.fatherId}
                          onChange={(event) => setLinkFather(index(), event.currentTarget.value)}
                          disabled={saveBusy() || fathers.loading}
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
                          onChange={(event) => setLinkRelationship(index(), event.currentTarget.value)}
                          disabled={saveBusy()}
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
                          onClick={() => removeLink(index())}
                          disabled={saveBusy() || links().length <= 1}
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
                id="edit-student-links-error"
                message={linksTouched() ? linksError() : undefined}
              />
            </div>

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
