import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, Show } from 'solid-js';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
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

const emptyForm: EmployeeUpdateInput = {
  name: '',
  salary: 0,
  job: '',
  email: '',
  phone: '',
  address: '',
  emergency_contact: '',
};

export default function StaffEmployeeEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [employee] = createResource(() => params.id, getEmployeeById);
  const [form, setForm] = createSignal<EmployeeUpdateInput>(emptyForm);
  const [formError, setFormError] = createSignal<string | null>(null);
  const [saveBusy, setSaveBusy] = createSignal(false);

  createEffect(() => {
    const current = employee();
    if (!current) return;

    setForm({
      name: current.name,
      salary: typeof current.salary === 'number' ? current.salary : Number(current.salary) || 0,
      job: current.job,
      email: current.email,
      phone: current.phone,
      address: current.address,
      emergency_contact: current.emergency_contact,
    });
  });

  const setField = (field: keyof EmployeeUpdateInput, value: string) => {
    if (field === 'salary') {
      setForm((prev) => ({ ...prev, salary: Number(value) || 0 }));
      return;
    }

    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setFormError(null);

    const current = form();
    const requiredFields: Array<[string, string]> = [
      ['Nombre', current.name],
      ['Cargo', current.job],
      ['Correo', current.email],
      ['Teléfono', current.phone],
      ['Dirección', current.address],
      ['Contacto de emergencia', current.emergency_contact],
    ];

    const missing = requiredFields.find(([, value]) => value.trim().length === 0);
    if (missing) {
      setFormError(`${missing[0]} es obligatorio.`);
      return;
    }

    if (!Number.isFinite(current.salary) || current.salary < 0) {
      setFormError('El salario debe ser un número válido mayor o igual a 0.');
      return;
    }

    setSaveBusy(true);
    try {
      await updateEmployee(params.id, {
        ...current,
        email: current.email.trim(),
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
                value={form().name}
                onInput={(event) => setField('name', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Salario</span>
              <input
                type="number"
                min="0"
                step="1"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={String(form().salary)}
                onInput={(event) => setField('salary', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Cargo</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().job}
                onInput={(event) => setField('job', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Correo</span>
              <input
                type="email"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().email}
                onInput={(event) => setField('email', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Teléfono</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().phone}
                onInput={(event) => setField('phone', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Dirección</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().address}
                onInput={(event) => setField('address', event.currentTarget.value)}
              />
            </label>

            <label class="text-sm">
              <span class="mb-1 block font-medium text-gray-700">Contacto de emergencia</span>
              <input
                type="text"
                class="w-full rounded-lg border border-yellow-300 px-3 py-2"
                value={form().emergency_contact}
                onInput={(event) => setField('emergency_contact', event.currentTarget.value)}
              />
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
