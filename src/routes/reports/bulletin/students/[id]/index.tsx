import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, z, zod$ } from "@builder.io/qwik-city";
import Table, { TableHeader } from "~/components/common/table/table";
import {
  createStudentBulletinValue,
  getBulletins,
  getStudentBulletinValue,
  updateStudentBulletinValue,
} from "~/services/report.service";

export const useGetBulletin = routeLoader$(async (event) => {
  const studentId = event.params.id;
  const bulletins = await getBulletins();
  if (!bulletins) {
    return [];
  }
  const bulletinWithValues = [];
  for (const bulletin of bulletins) {
    const value = await getStudentBulletinValue(Number(studentId), bulletin.id);
    bulletinWithValues.push({ ...bulletin, value: value?.value });
  }

  return bulletinWithValues;
});

export const useUpdateStudentBulletinValue = routeAction$(
  async (data, event) => {
    const studentId = event.params.id;
    const studentBulletin = await getStudentBulletinValue(
      Number(studentId),
      Number(data.bulletinId),
    );
    let response;
    if (studentBulletin) {
      response = await updateStudentBulletinValue(
        Number(studentId),
        Number(data.bulletinId),
        Number(data.value),
      );
    } else {
      response = await createStudentBulletinValue(
        Number(studentId),
        Number(data.bulletinId),
        Number(data.value),
      );
    }

    return !!response;
  },
  zod$({
    bulletinId: z.coerce.number(),
    value: z.string().min(1),
  }),
);

export default component$(() => {
  const bulletinLoader = useGetBulletin();

  const updateStudentBulletinAction = useUpdateStudentBulletinValue();

  const tableHeaders: TableHeader[] = [
    { name: "Id", key: "id" },
    { name: "Tipo", key: "type" },
    { name: "Descripción", key: "name" },
    { name: "Valoración", key: "actions" },
  ];
  const bulletins = bulletinLoader.value?.map((bulletin) => {
    return {
      ...bulletin,
      actions: [
        <div class="mb-6">
          <form>
            <input type="hidden" name="bulletinId" value={bulletin.id} />
            <label
              for="default-input"
              class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              Valoración
            </label>
            <input
              type="text"
              name="value"
              value={bulletin.value ?? ""}
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              onKeyUp$={async (event, element) => {
                const response = await updateStudentBulletinAction.submit({
                  bulletinId: bulletin.id,
                  value: element.value,
                });
                if (!response.value) {
                  return;
                }
                if (response.value.failed) {
                  alert(response.value.message);
                  console.error(response.value);
                  return;
                }
              }}
            />
          </form>
        </div>,
      ],
    };
  });
  return (
    <div>
      <Table headers={tableHeaders} data={bulletins ?? []} />
    </div>
  );
});
