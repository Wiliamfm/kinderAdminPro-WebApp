import { component$ } from '@builder.io/qwik';
import { Form, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { getGrade, useUpdateGrade } from '~/services/enrollment.service';

export { useUpdateGrade };

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

  const updateGradeAction = useUpdateGrade();

  return (
    <div>
      <Form action={updateGradeAction} class="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow space-y-6" onSubmitCompleted$={async () => {
        if (!updateGradeAction.value) return;
        if (updateGradeAction.value.failed) {
          console.error(updateGradeAction.value.message);
          alert("Error al actualizar el grado");
          return;
        }
        alert("Grado Actualizado!");
        await navigation("/enrollments/grades");
      }}>
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Curso</h2>
        <input type="hidden" name="id" value={gradeLoader.value.id} />

        <div>
          <label for="name" class="block mb-2 text-sm font-medium text-gray-900">Curso</label>
          <input value={gradeLoader.value.displayName} type="text" id="name" name="name" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
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
