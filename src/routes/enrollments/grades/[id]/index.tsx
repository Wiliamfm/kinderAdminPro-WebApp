import { component$ } from "@builder.io/qwik";
import { Form, routeLoader$, useNavigate } from "@builder.io/qwik-city";
import { useGetEmployees } from "~/routes/payroll/employees";
import { getGrade, useUpdateGrade } from "~/services/enrollment.service";

export { useUpdateGrade, useGetEmployees };

export const useGetGrade = routeLoader$(async (event) => {
  const grade = await getGrade(Number(event.params.id));
  if (!grade) {
    return event.fail(404, { message: "Grade not found" });
  }

  return grade;
});

export default component$(() => {
  const navigation = useNavigate();

  const gradeLoader = useGetGrade();
  const professorsLoader = useGetEmployees();

  const updateGradeAction = useUpdateGrade();

  return (
    <div>
      <Form
        action={updateGradeAction}
        class="mx-auto max-w-3xl space-y-6 rounded-xl bg-white p-6 shadow"
        onSubmitCompleted$={async () => {
          if (!updateGradeAction.value) return;
          if (updateGradeAction.value.failed) {
            console.error(updateGradeAction.value.message);
            alert("Error al actualizar el grado");
            return;
          }
          alert("Grado Actualizado!");
          await navigation("/enrollments/grades");
        }}
      >
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Curso</h2>
        <input type="hidden" name="id" value={gradeLoader.value.id} />

        <div>
          <label
            for="name"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Curso
          </label>
          <input
            value={gradeLoader.value.displayName}
            type="text"
            id="name"
            name="name"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="professors"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Seleccione un docente
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
