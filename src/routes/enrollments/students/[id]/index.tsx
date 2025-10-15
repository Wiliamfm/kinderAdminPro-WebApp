import { component$, useSignal } from "@builder.io/qwik";
import { Form, routeLoader$, useNavigate } from "@builder.io/qwik-city";
import {
  useGetGuardians,
  getStudent,
  useGetGrades,
  useUpdateStudent,
  useGetBloodTypes,
} from "~/services/enrollment.service";

export { useUpdateStudent, useGetGrades, useGetGuardians, useGetBloodTypes };

export const useGetStudent = routeLoader$(async (event) => {
  const response = await getStudent(Number(event.params.id)).catch((error) => {
    return event.fail(404, { message: error.message });
  });

  return response;
});

export default component$(() => {
  const navigation = useNavigate();

  const studentLoader = useGetStudent();
  const guardiansLoader = useGetGuardians();
  const gradesLoader = useGetGrades();
  const bloodTypes = useGetBloodTypes();

  const updateStudentAction = useUpdateStudent();

  const guardianInputRef = useSignal<HTMLInputElement>();

  return (
    <div>
      <Form
        action={updateStudentAction}
        class="mx-auto max-w-4xl space-y-6 rounded-xl bg-white p-6 shadow"
        onSubmitCompleted$={() => {
          if (!updateStudentAction.value) return;
          if (updateStudentAction.value.failed) {
            if (updateStudentAction.value.message) {
              console.error(updateStudentAction.value.message);
              alert("Error al actualizar el estudiante");
            }
            return;
          }
          navigation("/enrollments/students");
        }}
      >
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Estudiante</h2>
        <input type="hidden" value={studentLoader.value.id} name="id" />

        <div>
          <label
            for="fullName"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Nombre Completo
          </label>
          <input
            value={studentLoader.value.fullName}
            type="text"
            id="fullName"
            name="fullName"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          {updateStudentAction.value?.failed &&
            updateStudentAction.value.fieldErrors?.birthDate && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {updateStudentAction.value.fieldErrors.birthDate}
              </div>
            )}
          <label
            for="birthDate"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Fecha de Nacimiento
          </label>
          <input
            value={
              new Date(studentLoader.value.birthDate ?? new Date())
                .toISOString()
                .split("T")[0]
            }
            type="date"
            id="birthDate"
            name="birthDate"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="birthPlace"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Lugar de Nacimiento
          </label>
          <input
            value={studentLoader.value.birthPlace}
            type="text"
            id="birthPlace"
            name="birthPlace"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="department"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Departamento
          </label>
          <input
            value={studentLoader.value.department}
            type="text"
            id="department"
            name="department"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          {updateStudentAction.value?.failed &&
            updateStudentAction.value.fieldErrors?.documentNumber && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {updateStudentAction.value.fieldErrors.documentNumber}
              </div>
            )}
          <label
            for="documentNumber"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Número de Documento
          </label>
          <input
            value={studentLoader.value.documentNumber}
            type="text"
            id="documentNumber"
            name="documentNumber"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              for="weight"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Peso (kg)
            </label>
            <input
              value={studentLoader.value.weight}
              type="number"
              step="0.1"
              id="weight"
              name="weight"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            />
          </div>
          <div>
            <label
              for="height"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Altura (cm)
            </label>
            <input
              value={studentLoader.value.height}
              type="number"
              step="0.1"
              id="height"
              name="height"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label
            for="bloodType"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Tipo de sangre
          </label>
          <select
            id="bloodType"
            name="bloodType"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            onChange$={(_, element) => {
              studentLoader.value.bloodType = element.value;
            }}
          >
            {bloodTypes.value.map((bloodType) => (
              <option
                key={bloodType.id}
                value={bloodType.id}
                selected={studentLoader.value.bloodType === bloodType.id}
              >
                {bloodType.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            for="socialSecurity"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Eps
          </label>
          <input
            value={studentLoader.value.socialSecurity}
            type="text"
            id="socialSecurity"
            name="socialSecurity"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="allergies"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Alergias (separar por comas)
          </label>
          <input
            value={studentLoader.value.allergies}
            type="text"
            id="allergies"
            name="allergies"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            placeholder="e.g. peanuts, pollen"
          />
        </div>

        <div>
          <label
            for="gradeId"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Grado
          </label>
          <select
            id="gradeId"
            name="gradeId"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            onChange$={(_, element) => {
              studentLoader.value.gradeId = Number(element.value);
            }}
          >
            {gradesLoader.value.map((grade) => (
              <option
                key={grade.id}
                value={grade.id}
                selected={studentLoader.value.gradeId === grade.id}
              >
                {grade.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* <div>
          <input
            ref={guardianInputRef}
            type="hidden"
            value={studentLoader.value.guardians?.map((g) => g.id).join(",")}
            name="guardianIds"
          />
          <label
            for="guardianIds"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Acudientes
          </label>
          <select
            id="guardianIds"
            multiple
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            onChange$={(_, element) => {
              const options = [...element.selectedOptions];
              if (!guardianInputRef.value) return;
              guardianInputRef.value.value = options
                .map((option) => option.value)
                .join(",");
            }}
          >
            {guardiansLoader.value.map((guardian) => (
              <option
                key={guardian.id}
                value={guardian.id}
                selected={
                  studentLoader.value.guardians?.find(
                    (g) => g.id === guardian.id,
                  )
                    ? true
                    : false
                }
              >
                {guardian.name}
              </option>
            ))}
          </select>
          <p class="mt-1 text-sm text-gray-500">
            Presione Ctrl (o Cmd) para seleccionar varios
          </p>
        </div> */}

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
