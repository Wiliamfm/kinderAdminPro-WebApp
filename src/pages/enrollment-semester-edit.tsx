import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, Show } from 'solid-js';
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
  getSemesterById,
  updateSemester,
  type SemesterUpdateInput,
} from '../lib/pocketbase/semesters';

type SemesterForm = {
  name: string;
  start_date: string;
  end_date: string;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SEMESTER_FIELDS = ['name', 'start_date', 'end_date'] as const;
type SemesterField = (typeof SEMESTER_FIELDS)[number];

const emptyForm: SemesterForm = {
  name: '',
  start_date: '',
  end_date: '',
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

function parseLocalDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value: string): string {
  const parsed = parseLocalDate(value);
  return parsed ? parsed.toISOString() : '';
}

function toDateInputValue(value: string): string {
  if (!value) return '';

  const normalized = value.includes(' ') && value.includes('Z')
    ? value.replace(' ', 'T')
    : value;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';

  const tzOffsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function validateForm(form: SemesterForm): FieldErrorMap<SemesterField> {
  const errors: FieldErrorMap<SemesterField> = {};

  if (form.name.trim().length === 0) {
    errors.name = 'Nombre es obligatorio.';
  }

  if (form.start_date.trim().length === 0) {
    errors.start_date = 'Fecha de inicio es obligatoria.';
  }

  if (form.end_date.trim().length === 0) {
    errors.end_date = 'Fecha de fin es obligatoria.';
  }

  if (!errors.start_date && !errors.end_date) {
    const start = parseLocalDate(form.start_date);
    const end = parseLocalDate(form.end_date);

    if (!start || !end) {
      errors.end_date = 'Las fechas ingresadas no son válidas.';
    } else if (end.getTime() - start.getTime() < DAY_IN_MS) {
      errors.end_date = 'La fecha de fin debe ser al menos 1 día posterior a la fecha de inicio.';
    }
  }

  return errors;
}

function toPayload(form: SemesterForm): SemesterUpdateInput {
  return {
    name: form.name.trim(),
    start_date: toIsoDate(form.start_date),
    end_date: toIsoDate(form.end_date),
  };
}

export default function EnrollmentSemesterEditPage() {
  const params = useParams();
  const navigate = useNavigate();

  const [semester] = createResource(() => params.id, getSemesterById);

  const [form, setForm] = createSignal<SemesterForm>(emptyForm);
  const [touched, setTouched] = createSignal(createInitialTouchedMap(SEMESTER_FIELDS));
  const [formError, setFormError] = createSignal<string | null>(null);
  const [saveBusy, setSaveBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/enrollment-management', { replace: true });
    }
  });

  createEffect(() => {
    const current = semester();
    if (!current) return;

    setForm({
      name: current.name,
      start_date: toDateInputValue(current.start_date),
      end_date: toDateInputValue(current.end_date),
    });
    setTouched(createInitialTouchedMap(SEMESTER_FIELDS));
    setFormError(null);
  });

  const fieldErrors = createMemo(() => validateForm(form()));
  const fieldError = (field: SemesterField) => (touched()[field] ? fieldErrors()[field] : undefined);

  const setField = (field: SemesterField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setTouched((current) => touchField(current, field));
    setFormError(null);
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    setTouched((current) => touchAllFields(current));
    if (hasAnyError(fieldErrors())) return;

    setFormError(null);
    setSaveBusy(true);

    try {
      await updateSemester(params.id, toPayload(form()));
      navigate('/enrollment-management/semesters', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-4xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <h1 class="text-2xl font-semibold">Editar semestre</h1>
        <p class="mt-2 text-gray-600">Actualiza la información del semestre seleccionado.</p>

        <Show when={semester.loading}>
          <p class="mt-4 text-sm text-gray-600">Cargando semestre...</p>
        </Show>

        <Show when={semester.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(semester.error)}
          </div>
        </Show>

        <Show when={!semester.loading && semester()}>
          <form class="mt-6 space-y-4" onSubmit={onSubmit}>
            <label class="block text-sm">
              <span class="mb-1 block font-medium text-gray-700">Nombre</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('name') }}
                value={form().name}
                onInput={(event) => setField('name', event.currentTarget.value)}
                aria-invalid={!!fieldError('name')}
                aria-describedby={fieldError('name') ? 'edit-semester-name-error' : undefined}
                disabled={saveBusy()}
              />
              <InlineFieldAlert id="edit-semester-name-error" message={fieldError('name')} />
            </label>

            <label class="block text-sm">
              <span class="mb-1 block font-medium text-gray-700">Fecha de inicio</span>
              <input
                type="date"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('start_date') }}
                value={form().start_date}
                onInput={(event) => setField('start_date', event.currentTarget.value)}
                aria-invalid={!!fieldError('start_date')}
                aria-describedby={fieldError('start_date') ? 'edit-semester-start-error' : undefined}
                disabled={saveBusy()}
              />
              <InlineFieldAlert id="edit-semester-start-error" message={fieldError('start_date')} />
            </label>

            <label class="block text-sm">
              <span class="mb-1 block font-medium text-gray-700">Fecha de fin</span>
              <input
                type="date"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('end_date') }}
                value={form().end_date}
                onInput={(event) => setField('end_date', event.currentTarget.value)}
                aria-invalid={!!fieldError('end_date')}
                aria-describedby={fieldError('end_date') ? 'edit-semester-end-error' : undefined}
                disabled={saveBusy()}
              />
              <InlineFieldAlert id="edit-semester-end-error" message={fieldError('end_date')} />
            </label>

            <Show when={formError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError()}
              </div>
            </Show>

            <div class="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/enrollment-management/semesters')}
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
