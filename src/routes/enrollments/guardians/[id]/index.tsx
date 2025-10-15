import { component$ } from "@builder.io/qwik";
import { Form, routeLoader$, useNavigate } from "@builder.io/qwik-city";
import {
  getGuardian,
  useGetGuardianTypes,
  useUpdateGuardian,
} from "~/services/enrollment.service";

export { useUpdateGuardian, useGetGuardianTypes };

export const useGetGuardian = routeLoader$(async (event) => {
  return getGuardian(Number(event.params.id)).catch((error) => {
    return event.fail(404, { message: error.message });
  });
});

export default component$(() => {
  const navigation = useNavigate();

  const guardianLoader = useGetGuardian();
  const guardianTypesLoader = useGetGuardianTypes();

  const updateGuardianAction = useUpdateGuardian();

  return (
    <div>
      <Form
        action={updateGuardianAction}
        class="mx-auto max-w-3xl space-y-6 rounded-xl bg-white p-6 shadow"
        onSubmitCompleted$={async () => {
          if (!updateGuardianAction.value) return;
          if (updateGuardianAction.value.failed) {
            if (updateGuardianAction.value.message) {
              console.error(updateGuardianAction.value.message);
              alert("Error al actualizar el tutor");
            }
            console.error("Unable to update guardian.");
            return;
          }
          alert("Tutor Actualizado!");
          await navigation("/enrollments/guardians");
        }}
      >
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Tutor</h2>
        <input type="hidden" name="id" value={guardianLoader.value.id} />

        <div>
          <label
            for="fullName"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Nombre completo
          </label>
          <input
            value={guardianLoader.value.name}
            type="text"
            id="fullName"
            name="fullName"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          {updateGuardianAction.value?.failed &&
            updateGuardianAction.value.fieldErrors?.documentNumber && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {updateGuardianAction.value.fieldErrors.documentNumber}
              </div>
            )}
          <label
            for="documentNumber"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Numero de Documento
          </label>
          <input
            value={guardianLoader.value.documentNumber}
            type="text"
            id="documentNumber"
            name="documentNumber"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          {updateGuardianAction.value?.failed &&
            updateGuardianAction.value.fieldErrors?.phone && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {updateGuardianAction.value.fieldErrors.phone}
              </div>
            )}
          <label
            for="phone"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Teléfono
          </label>
          <input
            value={guardianLoader.value.phone}
            type="tel"
            id="phone"
            name="phone"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            placeholder="+57 300 0000000"
          />
        </div>

        <div>
          <label
            for="profession"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Profeción
          </label>
          <input
            value={guardianLoader.value.profession}
            type="text"
            id="profession"
            name="profession"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="company"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Empresa
          </label>
          <input
            value={guardianLoader.value.company}
            type="text"
            id="company"
            name="company"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          {updateGuardianAction.value?.failed &&
            updateGuardianAction.value.fieldErrors?.email && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {updateGuardianAction.value.fieldErrors.email}
              </div>
            )}
          <label
            for="email"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            value={guardianLoader.value.email}
            type="email"
            id="email"
            name="email"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label
            for="address"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Dirección
          </label>
          <input
            value={guardianLoader.value.address}
            type="text"
            id="address"
            name="address"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="typeId"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Tipo
          </label>
          <select
            id="typeId"
            name="typeId"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          >
            {guardianTypesLoader.value.map((type) => (
              <option
                key={type.id}
                value={type.id}
                selected={guardianLoader.value.typeId === type.id}
              >
                {type.displayName}
              </option>
            ))}
          </select>
        </div>

        <div class="pt-4">
          <button
            type="submit"
            class="group relative me-2 mb-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 p-0.5 text-sm font-medium text-gray-900 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 focus:ring-4 focus:ring-red-100 focus:outline-none dark:text-white dark:hover:text-gray-900 dark:focus:ring-red-400"
          >
            <span class="relative rounded-md bg-white px-5 py-2.5 transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent">
              Guardar
            </span>
          </button>
        </div>
      </Form>
    </div>
  );
});
