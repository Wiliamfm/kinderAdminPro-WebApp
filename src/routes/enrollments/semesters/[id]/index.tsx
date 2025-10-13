import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  useNavigate,
  z,
  zod$,
} from "@builder.io/qwik-city";
import { getSemester, updateSemester } from "~/services/report.service";

function dateToInputString(d: Date | undefined | string): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const useGetSemester = routeLoader$(async (event) => {
  const semester = await getSemester(Number(event.params.id));
  if (!semester) {
    return event.fail(404, { message: "Semestre no encontrado" });
  }

  return semester;
});

export const useUpdateSemester = routeAction$(
  async (data, event) => {
    if (data.endDate <= data.startDate) {
      return event.fail(400, {
        message: "La fecha de inicio debe ser menor a la de finalización",
      });
    }

    const response = await updateSemester(
      Number(event.params.id),
      data.name,
      data.startDate,
      data.endDate,
    );

    if (!response) {
      return event.fail(500, { message: "Error al actualizar el grado" });
    }

    return response;
  },
  zod$({
    name: z.string().min(6, "Nombre debe tener al menos 6 caracteres"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }),
);

export default component$(() => {
  const navigation = useNavigate();

  const semesterLoader = useGetSemester();

  const updateSemesterAction = useUpdateSemester();

  return (
    <div>
      <Form
        action={updateSemesterAction}
        class="mx-auto max-w-3xl space-y-6 rounded-xl bg-white p-6 shadow"
        onSubmitCompleted$={async () => {
          if (!updateSemesterAction.value) return;
          if (updateSemesterAction.value.failed) {
            alert(
              `Error al actualizar el semestre: ${updateSemesterAction.value.message}`,
            );
            return;
          }
          alert("Semestre Actualizado!");
          await navigation("/enrollments/semesters");
        }}
      >
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Semestre</h2>
        <input type="hidden" name="id" value={semesterLoader.value.id} />

        <div>
          <label
            for="name"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Semestre
          </label>
          <input
            value={semesterLoader.value.semester}
            type="text"
            id="name"
            name="name"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>
        <div>
          <label
            for="name"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Fecha de Inicio
          </label>
          <input
            value={dateToInputString(semesterLoader.value.startDate)}
            type="date"
            id="startDate"
            name="startDate"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>
        <div>
          <label
            for="name"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Fecha de Cierre
          </label>
          <input
            value={dateToInputString(semesterLoader.value.endDate)}
            type="date"
            id="endDate"
            name="endDate"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
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

export const DocumentHead = () => {
  return {
    title: "Semestre",
  };
};
