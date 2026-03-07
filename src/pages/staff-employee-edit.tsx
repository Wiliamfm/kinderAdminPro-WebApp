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
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import { listEmployeeJobs } from '../lib/pocketbase/employee-jobs';
import {
  getEmployeeById,
  updateEmployee,
  type EmployeeUpdateInput,
} from '../lib/pocketbase/employees';

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

const emptyForm: EmployeeUpdateInput = {
  name: '',
  documentId: '',
  jobId: '',
  email: '',
  phone: '',
  address: '',
  emergency_contact: '',
};

const REQUIRED_FIELDS = [
  'name',
  'documentId',
  'jobId',
  'email',
  'phone',
  'address',
  'emergency_contact',
] as const;
type RequiredField = (typeof REQUIRED_FIELDS)[number];
const CV_FIELDS = ['cv'] as const;
type CvField = (typeof CV_FIELDS)[number];
const DOCUMENT_ID_REGEX = /^[0-9]{4,20}$/;
const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateForm(current: EmployeeUpdateInput): FieldErrorMap<RequiredField> {
  const errors: FieldErrorMap<RequiredField> = {};

  if (current.name.trim().length === 0) errors.name = 'Nombre es obligatorio.';
  if (current.documentId.trim().length === 0) errors.documentId = 'Documento es obligatorio.';
  if (current.jobId.trim().length === 0) errors.jobId = 'Cargo es obligatorio.';
  if (current.email.trim().length === 0) errors.email = 'Correo es obligatorio.';
  if (current.phone.trim().length === 0) errors.phone = 'Teléfono es obligatorio.';
  if (current.address.trim().length === 0) errors.address = 'Dirección es obligatorio.';
  if (current.emergency_contact.trim().length === 0) {
    errors.emergency_contact = 'Contacto de emergencia es obligatorio.';
  }

  if (!errors.documentId && !DOCUMENT_ID_REGEX.test(current.documentId.trim())) {
    errors.documentId = 'Documento debe contener entre 4 y 20 dígitos numéricos.';
  }

  return errors;
}

function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

function isFileWithinLimit(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

export default function StaffEmployeeEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [employee] = createResource(() => params.id, getEmployeeById);
  const [jobs] = createResource(listEmployeeJobs);
  const [form, setForm] = createSignal<EmployeeUpdateInput>(emptyForm);
  const [touched, setTouched] = createSignal(createInitialTouchedMap(REQUIRED_FIELDS));
  const [cvFile, setCvFile] = createSignal<File | null>(null);
  const [cvTouched, setCvTouched] = createSignal(createInitialTouchedMap(CV_FIELDS));
  const [formError, setFormError] = createSignal<string | null>(null);
  const [saveBusy, setSaveBusy] = createSignal(false);
  let cvInputRef: HTMLInputElement | undefined;

  createEffect(() => {
    const current = employee();
    if (!current) return;

    setForm({
      name: current.name,
      documentId: current.documentId,
      jobId: current.jobId,
      email: current.email,
      phone: current.phone,
      address: current.address,
      emergency_contact: current.emergency_contact,
    });
    setTouched(createInitialTouchedMap(REQUIRED_FIELDS));
    setCvFile(null);
    setCvTouched(createInitialTouchedMap(CV_FIELDS));
    if (cvInputRef) cvInputRef.value = '';
    setFormError(null);
  });

  const setField = (field: keyof EmployeeUpdateInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((current) => touchField(current, field as RequiredField));
    setFormError(null);
  };

  const selectedJob = createMemo(() => {
    const jobId = form().jobId;
    return (jobs() ?? []).find((job) => job.id === jobId) ?? null;
  });
  const fieldErrors = createMemo(() => validateForm(form()));
  const fieldError = (field: RequiredField) => (touched()[field] ? fieldErrors()[field] : undefined);
  const setCvField = (file: File | null) => {
    setCvFile(file);
    setCvTouched((current) => touchField(current, 'cv'));
    setFormError(null);
  };
  const cvFieldErrors = createMemo(() => {
    const errors: FieldErrorMap<CvField> = {};
    const file = cvFile();
    if (!file) return errors;

    if (!isPdfFile(file)) {
      errors.cv = 'Solo se permiten archivos PDF.';
      return errors;
    }

    if (!isFileWithinLimit(file, MAX_PDF_FILE_SIZE_BYTES)) {
      errors.cv = 'El archivo PDF debe pesar máximo 10 MB.';
    }

    return errors;
  });
  const cvFieldError = () => (cvTouched().cv ? cvFieldErrors().cv : undefined);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    setTouched((current) => touchAllFields(current));
    setCvTouched((current) => touchAllFields(current));
    if (hasAnyError(fieldErrors())) return;
    if (hasAnyError(cvFieldErrors())) return;

    setFormError(null);

    setSaveBusy(true);
    try {
      await updateEmployee(params.id, {
        ...form(),
        email: form().email.trim(),
        cv: cvFile() ?? undefined,
      });
      navigate('/staff-management/employees', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-3xl rounded-xl border border-yellow-300 bg-white p-6">
        <h1 class="text-2xl font-semibold">Editar empleado</h1>
        <p class="mt-2 text-gray-600">Actualiza la información del empleado seleccionado.</p>

        <Show when={employee.loading}>
          <p class="mt-4 text-sm text-gray-600">Cargando empleado...</p>
        </Show>

        <Show when={employee.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(employee.error)}
          </div>
        </Show>

        <Show when={!employee.loading && employee()}>
          <form class="mt-6 grid grid-cols-1 gap-4" onSubmit={onSubmit}>
            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Nombre</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('name') }}
                value={form().name}
                onInput={(event) => setField('name', event.currentTarget.value)}
                aria-invalid={!!fieldError('name')}
                aria-describedby={fieldError('name') ? 'employee-name-error' : undefined}
              />
              <InlineFieldAlert id="employee-name-error" message={fieldError('name')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Documento</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('documentId') }}
                value={form().documentId}
                onInput={(event) => setField('documentId', event.currentTarget.value)}
                aria-invalid={!!fieldError('documentId')}
                aria-describedby={fieldError('documentId') ? 'employee-document-error' : undefined}
              />
              <InlineFieldAlert id="employee-document-error" message={fieldError('documentId')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Cargo</span>
              <select
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('jobId') }}
                value={form().jobId}
                onChange={(event) => setField('jobId', event.currentTarget.value)}
                aria-invalid={!!fieldError('jobId')}
                aria-describedby={fieldError('jobId') ? 'employee-job-error' : undefined}
              >
                <option value="">Selecciona un cargo</option>
                {jobs()?.map((job) => (
                  <option value={job.id}>{job.name}</option>
                ))}
              </select>
              <InlineFieldAlert id="employee-job-error" message={fieldError('jobId')} />
            </label>

            <Show when={selectedJob()}>
              <p class="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-gray-700">
                Salario del cargo: {formatSalary(selectedJob()?.salary ?? '')}
              </p>
            </Show>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Correo</span>
              <input
                type="email"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('email') }}
                value={form().email}
                onInput={(event) => setField('email', event.currentTarget.value)}
                aria-invalid={!!fieldError('email')}
                aria-describedby={fieldError('email') ? 'employee-email-error' : undefined}
              />
              <InlineFieldAlert id="employee-email-error" message={fieldError('email')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Teléfono</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('phone') }}
                value={form().phone}
                onInput={(event) => setField('phone', event.currentTarget.value)}
                aria-invalid={!!fieldError('phone')}
                aria-describedby={fieldError('phone') ? 'employee-phone-error' : undefined}
              />
              <InlineFieldAlert id="employee-phone-error" message={fieldError('phone')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Dirección</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('address') }}
                value={form().address}
                onInput={(event) => setField('address', event.currentTarget.value)}
                aria-invalid={!!fieldError('address')}
                aria-describedby={fieldError('address') ? 'employee-address-error' : undefined}
              />
              <InlineFieldAlert id="employee-address-error" message={fieldError('address')} />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Contacto de emergencia</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                classList={{ 'field-input-invalid': !!fieldError('emergency_contact') }}
                value={form().emergency_contact}
                onInput={(event) => setField('emergency_contact', event.currentTarget.value)}
                aria-invalid={!!fieldError('emergency_contact')}
                aria-describedby={fieldError('emergency_contact') ? 'employee-emergency-error' : undefined}
              />
              <InlineFieldAlert
                id="employee-emergency-error"
                message={fieldError('emergency_contact')}
              />
            </label>

            <Show when={employee()?.cvUrl}>
              <p class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Hoja de vida actual:{' '}
                <a
                  href={employee()?.cvUrl ?? ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={employee()?.cvFileName || undefined}
                  class="font-medium underline hover:text-blue-900"
                >
                  Ver CV
                </a>
                <span class="mx-2 text-blue-300">|</span>
                <a
                  href={employee()?.cvUrl ?? ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={employee()?.cvFileName || undefined}
                  class="font-medium underline hover:text-blue-900"
                  aria-label="Descargar CV actual"
                >
                  Descargar CV
                </a>
              </p>
            </Show>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Reemplazar hoja de vida (PDF, opcional)</span>
              <input
                ref={cvInputRef}
                type="file"
                accept="application/pdf"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-yellow-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-yellow-900 hover:file:bg-yellow-200"
                classList={{ 'field-input-invalid': !!cvFieldError() }}
                onChange={(event) => setCvField(event.currentTarget.files?.[0] ?? null)}
                disabled={saveBusy()}
                aria-invalid={!!cvFieldError()}
                aria-describedby={cvFieldError() ? 'employee-cv-error' : undefined}
              />
              <InlineFieldAlert id="employee-cv-error" message={cvFieldError()} />
            </label>

            <Show when={cvFile()}>
              <p class="text-xs text-gray-600">Archivo seleccionado: {cvFile()?.name}</p>
            </Show>

            <Show when={formError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError()}
              </div>
            </Show>

            <div class="mt-2 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => navigate('/staff-management/employees')}
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
