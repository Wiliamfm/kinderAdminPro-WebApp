import { $, component$ } from "@builder.io/qwik";
import FormModal from "~/components/common/modal/formModal/formModal";
import Table, { TableProps } from "~/components/common/table/table";
import { useGetEmployees } from "~/routes/payroll/employees";
import {
  useCreateGrade,
  useDeleteGrade,
  useGetGrades,
} from "~/services/enrollment.service";

export {
  useGetGrades,
  useCreateGrade,
  useDeleteGrade,
} from "~/services/enrollment.service";
export { useGetEmployees } from "~/routes/payroll/employees";

export default component$(() => {
  const gradesLoader = useGetGrades();
  const professorsLoader = useGetEmployees();

  const createGradeAction = useCreateGrade();
  const deleteGradeAction = useDeleteGrade();

  const gradesTable = gradesLoader.value.map((j) => {
    return {
      ...j,
      actions: [
        <a href={`/enrollments/grades/${j.id}`} class="cursor-pointer">
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
              d="M11.32 6.176H5c-1.105 0-2 .949-2 2.118v10.588C3 20.052 3.895 21 5 21h11c1.105 0 2-.948 2-2.118v-7.75l-3.914 4.144A2.46 2.46 0 0 1 12.81 16l-2.681.568c-1.75.37-3.292-1.263-2.942-3.115l.536-2.839c.097-.512.335-.983.684-1.352l2.914-3.086Z"
              clip-rule="evenodd"
            />
            <path
              fill-rule="evenodd"
              d="M19.846 4.318a2.148 2.148 0 0 0-.437-.692 2.014 2.014 0 0 0-.654-.463 1.92 1.92 0 0 0-1.544 0 2.014 2.014 0 0 0-.654.463l-.546.578 2.852 3.02.546-.579a2.14 2.14 0 0 0 .437-.692 2.244 2.244 0 0 0 0-1.635ZM17.45 8.721 14.597 5.7 9.82 10.76a.54.54 0 0 0-.137.27l-.536 2.84c-.07.37.239.696.588.622l2.682-.567a.492.492 0 0 0 .255-.145l4.778-5.06Z"
              clip-rule="evenodd"
            />
          </svg>
        </a>,
        <button
          class="cursor-pointer"
          onClick$={async () => {
            const response = await deleteGradeAction.submit({ id: j.id });
            if (response.value?.failed) {
              alert(response.value?.message);
              return;
            }
            alert(`Grado ${j.id} eliminado correctamente`);
            window.location.reload();
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
              d="M8.586 2.586A2 2 0 0 1 10 2h4a2 2 0 0 1 2 2v2h3a1 1 0 1 1 0 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 0-2h3V4a2 2 0 0 1 .586-1.414ZM10 6h4V4h-4v2Zm1 4a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Zm4 0a1 1 0 1 0-2 0v8a1 1 0 1 0 2 0v-8Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>,
      ],
    };
  });
  const tableProps: TableProps = {
    headers: [
      { name: "Id", key: "id" },
      { name: "Nombre", key: "displayName" },
      { name: "Profesor", key: "professorId" },
      { name: "Acciones", key: "actions" },
    ],
    data: gradesTable,
  };

  return (
    <div class="flex h-full flex-col place-items-center space-y-10">
      <h1 class="mt-18 text-4xl">Gestion de Cursos</h1>

      <FormModal
        modalId="job-form-modal"
        modalTitle={"Agregar Curso"}
        modalBtnName={"Agregar Curso"}
        modalBtnClass="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400"
        formBtnName="Crear Curso"
        formBtnClass="w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        formAction={createGradeAction}
        formOnSubmitFn={$((_: unknown, element: HTMLFormElement) => {
          if (createGradeAction.value?.failed) {
            alert(createGradeAction.value.message);
            return;
          }
          element.reset();
        })}
      >
        <div>
          <label
            for="name"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Curso
          </label>
          <input
            type="text"
            name="name"
            id="name"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-500 dark:bg-gray-600 dark:text-white dark:placeholder-gray-400"
            placeholder="Curso"
            required
          />
        </div>
        <div>
          <label
            for="professors"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Seleccione una opción
          </label>
          <select
            id="professors"
            name="professorId"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          >
            {professorsLoader.value.employees.map((professor) => (
              <option value={professor.id} key={professor.id}>
                {professor.name}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      <Table {...tableProps} />
    </div>
  );
});

export const DocumentHead = () => {
  return {
    title: "Grados",
  };
};
