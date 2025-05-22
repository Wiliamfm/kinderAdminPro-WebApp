import { component$ } from '@builder.io/qwik';
import { Form, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { getGuardian, useGetGuardianTypes, useUpdateGuardian } from '~/services/enrollment.service';

export { useUpdateGuardian, useGetGuardianTypes };

export const useGetGuardian = routeLoader$(async (event) => {
  return getGuardian(Number(event.params.id)).catch(error => {
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
      <Form action={updateGuardianAction} class="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow space-y-6" onSubmitCompleted$={async () => {
        if (!updateGuardianAction.value) return;
        if (updateGuardianAction.value.failed) {
          console.error(updateGuardianAction.value.message);
          alert("Error al actualizar el tutor");
          return;
        }
        alert("Tutor Actualizado!");
        await navigation("/enrollments/guardians");
      }}>
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Tutor</h2>
        <input type="hidden" name="id" value={guardianLoader.value.id} />

        <div>
          <label for="fullName" class="block mb-2 text-sm font-medium text-gray-900">Nombre completo</label>
          <input value={guardianLoader.value.name} type="text" id="fullName" name="fullName" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="documentNumber" class="block mb-2 text-sm font-medium text-gray-900">Numero de Documento</label>
          <input value={guardianLoader.value.documentNumber} type="text" id="documentNumber" name="documentNumber" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="phone" class="block mb-2 text-sm font-medium text-gray-900">Teléfono</label>
          <input value={guardianLoader.value.phone} type="tel" id="phone" name="phone" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5"
            placeholder="+57 300 0000000" />
        </div>

        <div>
          <label for="profession" class="block mb-2 text-sm font-medium text-gray-900">Profeción</label>
          <input value={guardianLoader.value.profession} type="text" id="profession" name="profession"
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="company" class="block mb-2 text-sm font-medium text-gray-900">Empresa</label>
          <input value={guardianLoader.value.company} type="text" id="company" name="company"
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="email" class="block mb-2 text-sm font-medium text-gray-900">Email</label>
          <input value={guardianLoader.value.email} type="email" id="email" name="email" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5"
            placeholder="example@email.com" />
        </div>

        <div>
          <label for="address" class="block mb-2 text-sm font-medium text-gray-900">Dirección</label>
          <input value={guardianLoader.value.address} type="text" id="address" name="address" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="typeId" class="block mb-2 text-sm font-medium text-gray-900">Tipo</label>
          <select id="typeId" name="typeId" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5">
            {guardianTypesLoader.value.map((type) => (
              <option key={type.id} value={type.id} selected={guardianLoader.value.typeId === type.id}>{type.displayName}</option>
            ))}
          </select>
        </div>

        <div class="pt-4">
          <button type="submit" class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400">
            <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
              Guardar
            </span>
          </button>
        </div>
      </Form>
    </div>
  );
});
