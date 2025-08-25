import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import Table, { TableHeader } from "~/components/common/table/table";
import { getBulletins } from "~/services/report.service";

export const useGetBulletin = routeLoader$(async () => {
  return await getBulletins();
});

export default component$(() => {
  const bulletinLoader = useGetBulletin();
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
        <a href={`${bulletin.id}`}>
          <svg
            class="h-6 w-6 text-gray-800 dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fill-rule="evenodd"
              d="M5 8a4 4 0 1 1 7.796 1.263l-2.533 2.534A4 4 0 0 1 5 8Zm4.06 5H7a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h2.172a2.999 2.999 0 0 1-.114-1.588l.674-3.372a3 3 0 0 1 .82-1.533L9.06 13Zm9.032-5a2.907 2.907 0 0 0-2.056.852L9.967 14.92a1 1 0 0 0-.273.51l-.675 3.373a1 1 0 0 0 1.177 1.177l3.372-.675a1 1 0 0 0 .511-.273l6.07-6.07a2.91 2.91 0 0 0-.944-4.742A2.907 2.907 0 0 0 18.092 8Z"
              clip-rule="evenodd"
            />
          </svg>
        </a>,
        <button
          class="cursor-pointer"
          onClick$={async () => {
            /**
           *           const response = await deleteBulletinAction.submit({ id: bulletin.id });
          if (response.value.failed) {
            alert(response.value.message);
            console.error(response.value);
            return;
          }
          alert("Boletin Eliminado!");
           */
          }}
        >
          <svg
            class="h-6 w-6 text-gray-800 dark:text-white"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fill-rule="evenodd"
              d="M5 8a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-2 9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Zm13-6a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-4Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>,
      ],
    };
  });
  return (
    <div>
      <Table headers={tableHeaders} data={bulletins ?? []} />
    </div>
  );
});
