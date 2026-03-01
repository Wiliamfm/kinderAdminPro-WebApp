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
  getFatherById,
  updateFather,
  type FatherUpdateInput,
} from '../lib/pocketbase/fathers';
import { listActiveStudents } from '../lib/pocketbase/students';
import {
  listLinksByFatherId,
  replaceLinksForFather,
  STUDENT_FATHER_RELATIONSHIPS,
  type FatherStudentLinkInput,
  type StudentFatherRelationship,
} from '../lib/pocketbase/students-fathers';

type FatherForm = {
  full_name: string;
  document_id: string;
  phone_number: string;
  occupation: string;
  company: string;
  email: string;
  address: string;
};

type FatherLinkForm = {
  studentId: string;
  relationship: StudentFatherRelationship;
};

type StudentOption = {
  id: string;
  label: string;
};

const emptyForm: FatherForm = {
  full_name: '',
  document_id: '',
  phone_number: '',
  occupation: '',
  company: '',
  email: '',
  address: '',
};

const FATHER_VALIDATED_FIELDS = ['full_name', 'document_id', 'email'] as const;
type FatherValidatedField = (typeof FATHER_VALIDATED_FIELDS)[number];

const DOCUMENT_ID_REGEX = /^\d+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createEmptyLink(): FatherLinkForm {
  return {
    studentId: '',
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

function sanitizeNumericValue(value: string): string {
  return value.replace(/\D+/g, '');
}

function validateFatherForm(form: FatherForm): FieldErrorMap<FatherValidatedField> {
  const errors: FieldErrorMap<FatherValidatedField> = {};

  if (form.full_name.trim().length === 0) {
    errors.full_name = 'Nombre completo es obligatorio.';
  }

  if (form.document_id.trim().length === 0) {
    errors.document_id = 'Documento es obligatorio.';
  } else if (!DOCUMENT_ID_REGEX.test(form.document_id.trim())) {
    errors.document_id = 'Documento debe contener solo números.';
  }

  if (form.email.trim().length > 0 && !EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Correo electrónico no es válido.';
  }

  return errors;
}

function validateLinks(
  links: FatherLinkForm[],
  hasAvailableStudents: boolean,
): string | undefined {
  if (!hasAvailableStudents) {
    return 'No hay estudiantes activos disponibles. Debes crear un estudiante antes de continuar.';
  }

  if (links.length === 0) {
    return 'Debes conservar al menos un estudiante asociado.';
  }

  const selected = new Set<string>();

  for (const link of links) {
    if (link.studentId.trim().length === 0) {
      return 'Cada vínculo debe incluir un estudiante.';
    }

    if (!STUDENT_FATHER_RELATIONSHIPS.includes(link.relationship)) {
      return 'Cada vínculo debe incluir una relación válida.';
    }

    if (selected.has(link.studentId)) {
      return 'No se permiten estudiantes duplicados en los vínculos.';
    }

    selected.add(link.studentId);
  }

  return undefined;
}

function toFatherUpdateInput(form: FatherForm): FatherUpdateInput {
  return {
    full_name: form.full_name.trim(),
    document_id: form.document_id.trim(),
    phone_number: form.phone_number.trim(),
    occupation: form.occupation.trim(),
    company: form.company.trim(),
    email: form.email.trim(),
    address: form.address.trim(),
  };
}

function toLinkInput(links: FatherLinkForm[]): FatherStudentLinkInput[] {
  return links.map((link) => ({
    studentId: link.studentId.trim(),
    relationship: link.relationship,
  }));
}

export default function EnrollmentTutorEditPage() {
  const params = useParams();
  const navigate = useNavigate();

  const [father] = createResource(() => params.id, getFatherById);
  const [linksResource] = createResource(() => params.id, listLinksByFatherId);
  const [students] = createResource(async () => {
    if (!isAuthUserAdmin()) return [];
    try {
      return await listActiveStudents({ includeFatherNames: false });
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      const isAbortLike = message.includes('aborted') || message.includes('autocancel');
      if (isAbortLike) {
        console.warn('Ignoring auto-cancelled active students request in tutor edit page.', error);
      } else {
        console.error('Failed to load active students in tutor edit page.', error);
      }
      return [];
    }
  });

  const [form, setForm] = createSignal<FatherForm>(emptyForm);
  const [links, setLinks] = createSignal<FatherLinkForm[]>([createEmptyLink()]);

  const [touched, setTouched] = createSignal(createInitialTouchedMap(FATHER_VALIDATED_FIELDS));
  const [linksTouched, setLinksTouched] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);
  const [saveBusy, setSaveBusy] = createSignal(false);
  const studentOptions = createMemo<StudentOption[]>(() => {
    const optionsById = new Map<string, StudentOption>();

    for (const student of students() ?? []) {
      const id = student.id.trim();
      if (!id) continue;
      optionsById.set(id, {
        id,
        label: student.name,
      });
    }

    for (const link of linksResource() ?? []) {
      const studentId = link.studentId.trim();
      if (!studentId || !link.studentActive || optionsById.has(studentId)) continue;
      optionsById.set(studentId, {
        id: studentId,
        label: link.studentName || studentId,
      });
    }

    return Array.from(optionsById.values());
  });

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  createEffect(() => {
    const currentFather = father();
    if (!currentFather) return;

    setForm({
      full_name: currentFather.full_name,
      document_id: currentFather.document_id,
      phone_number: currentFather.phone_number,
      occupation: currentFather.occupation,
      company: currentFather.company,
      email: currentFather.email,
      address: currentFather.address,
    });

    setTouched(createInitialTouchedMap(FATHER_VALIDATED_FIELDS));
    setFormError(null);
  });

  createEffect(() => {
    const currentLinks = linksResource();
    if (!currentLinks) return;

    const activeLinks = currentLinks.filter(
      (link) => link.studentActive && link.studentId.trim().length > 0,
    );

    if (activeLinks.length === 0) {
      setLinks([createEmptyLink()]);
      setLinksTouched(false);
      return;
    }

    setLinks(activeLinks.map((link) => ({
      studentId: link.studentId,
      relationship: link.relationship,
    })));
    setLinksTouched(false);
  });

  const setField = (field: keyof FatherForm, value: string) => {
    const normalizedValue = (field === 'document_id' || field === 'phone_number')
      ? sanitizeNumericValue(value)
      : value;

    setForm((current) => ({
      ...current,
      [field]: normalizedValue,
    }));

    if ((FATHER_VALIDATED_FIELDS as readonly string[]).includes(field)) {
      setTouched((current) => touchField(current, field as FatherValidatedField));
    }

    setFormError(null);
  };

  const setLinkStudent = (index: number, value: string) => {
    setLinks((current) => current.map((link, linkIndex) => (
      linkIndex === index
        ? {
            ...link,
            studentId: value,
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

  const fieldErrors = createMemo(() => validateFatherForm(form()));
  const linksError = createMemo(() => validateLinks(links(), studentOptions().length > 0));
  const fieldError = (field: FatherValidatedField) => (
    touched()[field] ? fieldErrors()[field] : undefined
  );

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    setTouched((current) => touchAllFields(current));
    setLinksTouched(true);

    if (hasAnyError(fieldErrors()) || Boolean(linksError())) {
      return;
    }

    setFormError(null);
    setSaveBusy(true);

    try {
      await updateFather(params.id, toFatherUpdateInput(form()));
      await replaceLinksForFather(params.id, toLinkInput(links()));
      navigate('/enrollment-management/tutors', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <h1 class="text-2xl font-semibold">Editar tutor</h1>
        <p class="mt-2 text-gray-600">Actualiza la información del tutor seleccionado.</p>

        <Show when={father.loading}>
          <p class="mt-4 text-sm text-gray-600">Cargando tutor...</p>
        </Show>

        <Show when={father.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(father.error)}
          </div>
        </Show>
        <Show when={linksResource.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(linksResource.error)}
          </div>
        </Show>
        <Show when={students.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(students.error)}
          </div>
        </Show>

        <Show when={!father.loading && father()}>
          <form class="mt-6 space-y-4" onSubmit={onSubmit}>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label class="text-sm">
                <span class="mb-1 block font-medium text-gray-700">Nombre completo</span>
                <input
                  type="text"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  classList={{ 'field-input-invalid': !!fieldError('full_name') }}
                  value={form().full_name}
                  onInput={(event) => setField('full_name', event.currentTarget.value)}
                  aria-invalid={!!fieldError('full_name')}
                  aria-describedby={fieldError('full_name') ? 'edit-father-full-name-error' : undefined}
                  disabled={saveBusy()}
                />
                <InlineFieldAlert id="edit-father-full-name-error" message={fieldError('full_name')} />
              </label>

              <label class="text-sm">
                <span class="mb-1 block font-medium text-gray-700">Documento</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  classList={{ 'field-input-invalid': !!fieldError('document_id') }}
                  value={form().document_id}
                  onInput={(event) => setField('document_id', event.currentTarget.value)}
                  aria-invalid={!!fieldError('document_id')}
                  aria-describedby={fieldError('document_id') ? 'edit-father-document-error' : undefined}
                  disabled={saveBusy()}
                />
                <InlineFieldAlert id="edit-father-document-error" message={fieldError('document_id')} />
              </label>

              <label class="text-sm">
                <span class="mb-1 block font-medium text-gray-700">Teléfono</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  value={form().phone_number}
                  onInput={(event) => setField('phone_number', event.currentTarget.value)}
                  disabled={saveBusy()}
                />
              </label>

              <label class="text-sm">
                <span class="mb-1 block font-medium text-gray-700">Ocupación</span>
                <input
                  type="text"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  value={form().occupation}
                  onInput={(event) => setField('occupation', event.currentTarget.value)}
                  disabled={saveBusy()}
                />
              </label>

              <label class="text-sm">
                <span class="mb-1 block font-medium text-gray-700">Empresa</span>
                <input
                  type="text"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  value={form().company}
                  onInput={(event) => setField('company', event.currentTarget.value)}
                  disabled={saveBusy()}
                />
              </label>

              <label class="text-sm">
                <span class="mb-1 block font-medium text-gray-700">Correo</span>
                <input
                  type="email"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  classList={{ 'field-input-invalid': !!fieldError('email') }}
                  value={form().email}
                  onInput={(event) => setField('email', event.currentTarget.value)}
                  aria-invalid={!!fieldError('email')}
                  aria-describedby={fieldError('email') ? 'edit-father-email-error' : undefined}
                  disabled={saveBusy()}
                />
                <InlineFieldAlert id="edit-father-email-error" message={fieldError('email')} />
              </label>

              <label class="text-sm md:col-span-2">
                <span class="mb-1 block font-medium text-gray-700">Dirección</span>
                <input
                  type="text"
                  class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                  value={form().address}
                  onInput={(event) => setField('address', event.currentTarget.value)}
                  disabled={saveBusy()}
                />
              </label>
            </div>

            <div class="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-gray-800">Estudiantes asociados</h2>
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
                  {(_, indexAccessor) => {
                    const index = () => indexAccessor();
                    const link = () => links()[index()] ?? createEmptyLink();

                    return (
                      <div class="grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
                        <select
                          class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          value={link().studentId}
                          onChange={(event) => setLinkStudent(index(), event.currentTarget.value)}
                          disabled={saveBusy() || students.loading}
                        >
                          <option value="">
                            {students.loading ? 'Cargando estudiantes...' : 'Selecciona un estudiante'}
                          </option>
                          <For each={studentOptions()}>
                            {(option) => (
                              <option value={option.id} selected={option.id === link().studentId}>
                                {option.label}
                              </option>
                            )}
                          </For>
                        </select>

                        <select
                          class="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          value={link().relationship}
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
                id="edit-father-links-error"
                message={linksTouched() ? linksError() : undefined}
              />
            </div>

            <Show when={formError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError()}
              </div>
            </Show>

            <div class="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/enrollment-management/tutors')}
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
