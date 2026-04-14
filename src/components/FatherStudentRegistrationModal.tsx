import { For, Show } from 'solid-js';
import {
  BLOOD_TYPE_OPTIONS,
} from '../lib/forms/student-registration';
import type {
  StudentRegistrationFormValues,
  StudentRegistrationValidatedField,
} from '../lib/forms/student-registration';
import type { PublicGradeRecord } from '../lib/pocketbase/public-grades';
import {
  formatRelationshipLabel,
  STUDENT_FATHER_RELATIONSHIPS,
  type StudentFatherRelationship,
} from '../lib/pocketbase/students-fathers';
import InlineFieldAlert from './InlineFieldAlert';
import Modal from './Modal';

type FatherStudentRegistrationModalProps = {
  open: boolean;
  busy: boolean;
  documentValidationBusy: boolean;
  form: StudentRegistrationFormValues;
  relationship: StudentFatherRelationship;
  grades: PublicGradeRecord[];
  gradesLoading: boolean;
  gradesError: string | null;
  submitError: string | null;
  fieldError: (field: StudentRegistrationValidatedField) => string | undefined;
  onFieldChange: (field: keyof StudentRegistrationFormValues, value: string) => void;
  onRelationshipChange: (value: StudentFatherRelationship) => void;
  onDocumentBlur: () => void | Promise<void>;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
};

export default function FatherStudentRegistrationModal(props: FatherStudentRegistrationModalProps) {
  return (
    <Modal
      open={props.open}
      title="Registrar nuevo estudiante"
      description="Completa la información del estudiante. La solicitud quedará pendiente de aprobación."
      confirmLabel="Registrar estudiante"
      busy={props.busy}
      size="xl"
      onConfirm={() => void props.onSubmit()}
      onClose={props.onClose}
      footer={(
        <div class="mt-6 flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={props.busy}
            onClick={props.onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg border border-yellow-500 bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={props.busy || props.documentValidationBusy}
            onClick={() => void props.onSubmit()}
          >
            {props.busy ? 'Registrando...' : 'Registrar estudiante'}
          </button>
        </div>
      )}
    >
      <div class="space-y-5">
        <Show when={props.submitError}>
          {(message) => (
            <div class="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message()}
            </div>
          )}
        </Show>

        <Show when={props.gradesError}>
          {(message) => (
            <div class="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message()}
            </div>
          )}
        </Show>

        <div class="rounded-3xl border border-yellow-200 bg-yellow-50/70 p-4 sm:p-5">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Datos del estudiante</h3>
            <p class="text-sm text-gray-600">Información académica y personal básica.</p>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <label class="block">
              <span class="text-sm font-medium text-gray-700">Nombre</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                value={props.form.name}
                onInput={(event) => props.onFieldChange('name', event.currentTarget.value)}
              />
              <InlineFieldAlert message={props.fieldError('name')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Grado</span>
              <select
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                value={props.form.grade_id}
                disabled={props.gradesLoading || Boolean(props.gradesError)}
                onChange={(event) => props.onFieldChange('grade_id', event.currentTarget.value)}
              >
                <option value="">
                  {props.gradesLoading ? 'Cargando grados...' : 'Selecciona un grado'}
                </option>
                <For each={props.grades}>
                  {(grade) => (
                    <option value={grade.id}>{grade.name}</option>
                  )}
                </For>
              </select>
              <InlineFieldAlert message={props.fieldError('grade_id')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Fecha de nacimiento</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="datetime-local"
                value={props.form.date_of_birth}
                onInput={(event) => props.onFieldChange('date_of_birth', event.currentTarget.value)}
              />
              <InlineFieldAlert message={props.fieldError('date_of_birth')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Lugar de nacimiento</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                value={props.form.birth_place}
                onInput={(event) => props.onFieldChange('birth_place', event.currentTarget.value)}
              />
              <InlineFieldAlert message={props.fieldError('birth_place')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Departamento</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                value={props.form.department}
                onInput={(event) => props.onFieldChange('department', event.currentTarget.value)}
              />
              <InlineFieldAlert message={props.fieldError('department')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Documento</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                inputMode="numeric"
                value={props.form.document_id}
                onInput={(event) => props.onFieldChange('document_id', event.currentTarget.value)}
                onBlur={() => void props.onDocumentBlur()}
              />
              <InlineFieldAlert message={props.fieldError('document_id')} />
              <Show when={props.documentValidationBusy}>
                <p class="mt-2 text-xs text-gray-500">Validando documento...</p>
              </Show>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Relación</span>
              <select
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                value={props.relationship}
                onChange={(event) => props.onRelationshipChange(event.currentTarget.value as StudentFatherRelationship)}
              >
                <For each={STUDENT_FATHER_RELATIONSHIPS}>
                  {(relationship) => (
                    <option value={relationship}>{formatRelationshipLabel(relationship)}</option>
                  )}
                </For>
              </select>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Peso</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                inputMode="decimal"
                value={props.form.weight}
                onInput={(event) => props.onFieldChange('weight', event.currentTarget.value)}
              />
              <InlineFieldAlert message={props.fieldError('weight')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Altura</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                inputMode="decimal"
                value={props.form.height}
                onInput={(event) => props.onFieldChange('height', event.currentTarget.value)}
              />
              <InlineFieldAlert message={props.fieldError('height')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Tipo de sangre</span>
              <select
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                value={props.form.blood_type}
                onChange={(event) => props.onFieldChange('blood_type', event.currentTarget.value)}
              >
                <option value="">Selecciona un tipo de sangre</option>
                <For each={BLOOD_TYPE_OPTIONS}>
                  {(bloodType) => (
                    <option value={bloodType}>{bloodType}</option>
                  )}
                </For>
              </select>
              <InlineFieldAlert message={props.fieldError('blood_type')} />
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Seguridad social</span>
              <input
                class="mt-2 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                type="text"
                value={props.form.social_security}
                onInput={(event) => props.onFieldChange('social_security', event.currentTarget.value)}
              />
            </label>

            <label class="block md:col-span-2">
              <span class="text-sm font-medium text-gray-700">Alergias</span>
              <textarea
                class="mt-2 min-h-28 w-full rounded-xl border border-yellow-300 bg-white px-4 py-3"
                value={props.form.allergies}
                onInput={(event) => props.onFieldChange('allergies', event.currentTarget.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}
