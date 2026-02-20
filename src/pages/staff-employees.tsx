import { createResource, For, Show } from 'solid-js';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import { listEmployees } from '../lib/pocketbase/employees';

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

function formatText(value: string): string {
  return value.trim().length > 0 ? value : '—';
}

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo cargar la lista de empleados.';
}

export default function StaffEmployeesPage() {
  const [employees] = createResource(listEmployees);

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-6xl rounded-xl border border-yellow-300 bg-white p-6">
        <h1 class="text-2xl font-semibold">Gestion de personal</h1>
        <p class="mt-2 text-gray-600">
          Aquí puedes consultar el listado actual de empleados y acceder a acciones rápidas.
        </p>

        <Show when={employees.error}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(employees.error)}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[980px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold">Salario</th>
                <th class="px-4 py-3 font-semibold">Cargo</th>
                <th class="px-4 py-3 font-semibold">Correo</th>
                <th class="px-4 py-3 font-semibold">Teléfono</th>
                <th class="px-4 py-3 font-semibold">Dirección</th>
                <th class="px-4 py-3 font-semibold">Contacto de emergencia</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!employees.loading} fallback={
                <tr>
                  <td class="px-4 py-4 text-gray-600" colSpan={8}>
                    Cargando personal...
                  </td>
                </tr>
              }>
                <Show
                  when={(employees() ?? []).length > 0}
                  fallback={
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={8}>
                        No hay empleados registrados.
                      </td>
                    </tr>
                  }
                >
                  <For each={employees() ?? []}>
                    {(employee) => (
                      <tr class="border-t border-yellow-100 align-top">
                        <td class="px-4 py-3">{formatText(employee.name)}</td>
                        <td class="px-4 py-3">{formatSalary(employee.salary)}</td>
                        <td class="px-4 py-3">{formatText(employee.job)}</td>
                        <td class="px-4 py-3">{formatText(employee.email)}</td>
                        <td class="px-4 py-3">{formatText(employee.phone)}</td>
                        <td class="px-4 py-3">{formatText(employee.address)}</td>
                        <td class="px-4 py-3">{formatText(employee.emergency_contact)}</td>
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                              aria-label={`Editar ${employee.name || 'empleado'}`}
                              onClick={() => window.alert(`Editar empleado: ${employee.name || 'Sin nombre'}`)}
                            >
                              <i class="bi bi-pencil-square" aria-hidden="true"></i>
                            </button>

                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                              aria-label={`Eliminar ${employee.name || 'empleado'}`}
                              onClick={() => window.alert(`Eliminar empleado: ${employee.name || 'Sin nombre'}`)}
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
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
