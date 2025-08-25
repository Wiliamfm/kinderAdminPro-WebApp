import { component$ } from '@builder.io/qwik';
import { Form, routeAction$, routeLoader$, useNavigate, z, zod$ } from '@builder.io/qwik-city';
import Title from '~/components/common/title/title';
import { createBulletin, getBulletin, updateBulletin } from '~/services/report.service';

export const useGetBulletinItem = routeLoader$(async (event) => {
  const id = Number(event.params["id"]);
  if (id === 0) {
    return {
      isNew: true,
    }
  }
  const response = await getBulletin(id);
  if (!response) {
    return event.fail(400, { message: "No se pudo obtener la configuración del boletín." });
  }

  return response;
});

export const useUpdateBulletin = routeAction$(async (req, event) => {
  const id = Number(event.params["id"]);
  const response = await updateBulletin(id, req.name, req.type);

  return response;
}, zod$({
  name: z.string().min(3),
  type: z.string().min(3),
}));

export const useCreateBulletin = routeAction$(async (req) => {
  const response = await createBulletin(req.name, req.type);

  return response;
}, zod$({
  name: z.string().min(3),
  type: z.string().min(3),
}));

export default component$(() => {
  const navigateLoader = useNavigate();
  const bulletinLoader = useGetBulletinItem();

  const updateBulletinAction = useUpdateBulletin();
  const createBulletinAction = useCreateBulletin();

  return (
    <div>
      <Title title='Editar' />

      {bulletinLoader.value.id && <Form action={updateBulletinAction} class="m-10" onSubmitCompleted$={async () => {
        if (!updateBulletinAction.value || updateBulletinAction.value.failed) {
          alert("No se pudo actualizar el boletín");
          return;
        }
        alert("Boletín actualizado");
        await navigateLoader("/reports/bulletin");
      }}>
        <div class="mb-6">
          <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre</label>
          <input type="text" name="name" id="name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={bulletinLoader.value.name} />
        </div>
        <div class="mb-6">
          <label for="type" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
          <input type="text" name="type" id="type" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={bulletinLoader.value.type} />
        </div>
        <button class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400">
          <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
            Subir
          </span>
        </button>
      </Form>
      }

      {bulletinLoader.value.isNew && <Form action={createBulletinAction} class="m-10" onSubmitCompleted$={async () => {
        if (!createBulletinAction.value || createBulletinAction.value.failed) {
          alert("No se pudo crear el boletín");
          return;
        }
        alert("Boletín creado");
        await navigateLoader("/reports/bulletin");
      }}>
        <div class="mb-6">
          <label for="name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nombre</label>
          <input type="text" name="name" id="name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={createBulletinAction.formData?.get("name")} placeholder="Actividad" />
        </div>
        <div class="mb-6">
          <label for="type" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Tipo</label>
          <input type="text" name="type" id="type" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value={createBulletinAction.formData?.get("type")} placeholder="Categoría" />
        </div>
        <button class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400">
          <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
            Subir
          </span>
        </button>
      </Form>
      }
    </div>
  );
});
