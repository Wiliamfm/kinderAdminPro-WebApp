import { component$ } from "@builder.io/qwik";
import { Form } from "@builder.io/qwik-city";
import {
  useCreateStudentRequest,
  useGetBloodTypes,
  useGetGrades,
  useGetGuardianTypes,
} from "~/services/enrollment.service";

export {
  useGetGrades,
  useGetBloodTypes,
  useGetGuardianTypes,
  useCreateStudentRequest,
};

export default component$(() => {
  const gradesLoader = useGetGrades();
  const bloodTypesLoader = useGetBloodTypes();
  const guardianTypesLoader = useGetGuardianTypes();

  const registerStudentAction = useCreateStudentRequest();
  return (
    <div>
      <div>
        {registerStudentAction.value?.failed &&
          registerStudentAction.value.message && (
            <div
              class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
              role="alert"
            >
              {registerStudentAction.value.message}
            </div>
          )}
      </div>
      <Form
        action={registerStudentAction}
        class="mx-auto max-w-4xl space-y-6 rounded-xl bg-white p-6 shadow"
        onSubmitCompleted$={(_, element) => {
          if (!registerStudentAction.value) return;
          if (registerStudentAction.value.failed) {
            console.error(registerStudentAction.value);
            alert("Error al crear el estudiante");
            return;
          }
          element.reset();
          alert("Solicitud creada exitosamente");
        }}
      >
        <h2 class="text-2xl font-bold text-gray-900">Registrar Estudiante</h2>
        <input type="hidden" name="id" />

        <div>
          <label
            for="studentName"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Nombre Completo
          </label>
          <input
            type="text"
            id="studentName"
            name="studentName"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="birthDate"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Fecha de Nacimiento
          </label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
          {registerStudentAction.value?.failed &&
            registerStudentAction.value.fieldErrors?.birthDate && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {registerStudentAction.value.fieldErrors.birthDate}
              </div>
            )}
        </div>

        <div>
          <label
            for="birthPlace"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Lugar de Nacimiento
          </label>
          <input
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
            type="text"
            id="department"
            name="department"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
        </div>

        <div>
          <label
            for="studentDocument"
            class="mb-2 block text-sm font-medium text-gray-900"
          >
            Número de Documento
          </label>
          <input
            type="text"
            id="studentDocument"
            name="studentDocument"
            required
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          />
          {registerStudentAction.value?.failed &&
            registerStudentAction.value.fieldErrors?.studentDocument && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {registerStudentAction.value.fieldErrors.studentDocument}
              </div>
            )}
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
          >
            {bloodTypesLoader.value.map((bloodType) => (
              <option key={bloodType.id} value={bloodType.id}>
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
            type="text"
            id="allergies"
            name="allergies"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            placeholder="e.g. maní, polen"
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
          >
            {gradesLoader.value.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.displayName}
              </option>
            ))}
          </select>
        </div>

        <h2 class="text-2xl font-bold text-gray-900">Datos del acudiente</h2>

        <div>
          <div>
            <label
              for="guardianName"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Nombre Completo
            </label>
            <input
              type="text"
              id="guardianName"
              name="guardianName"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            />
          </div>

          <div>
            <label
              for="guardianDocument"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Número de documento
            </label>
            <input
              type="text"
              id="guardianDocument"
              name="guardianDocument"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            />
            {registerStudentAction.value?.failed &&
              registerStudentAction.value.fieldErrors?.guardianDocument && (
                <div
                  class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  <span class="font-medium">Campo inválido!</span>{" "}
                  {registerStudentAction.value.fieldErrors?.guardianDocument}
                </div>
              )}
          </div>

          <div>
            <label
              for="phone"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
              placeholder="+57 300 0000000"
            />
            {registerStudentAction.value?.failed &&
              registerStudentAction.value.fieldErrors?.phone && (
                <div
                  class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  <span class="font-medium">Campo inválido!</span>{" "}
                  {registerStudentAction.value.fieldErrors.phone}
                </div>
              )}
          </div>

          <div>
            <label
              for="profession"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Profesión
            </label>
            <input
              type="text"
              id="profession"
              name="profession"
              required
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
              type="text"
              id="company"
              name="company"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            />
          </div>

          <div>
            <label
              for="email"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
              placeholder="example@email.com"
            />
            {registerStudentAction.value?.failed &&
              registerStudentAction.value.fieldErrors?.email && (
                <div
                  class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  <span class="font-medium">Campo inválido!</span>{" "}
                  {registerStudentAction.value.fieldErrors.email}
                </div>
              )}
          </div>

          <div>
            <label
              for="address"
              class="mb-2 block text-sm font-medium text-gray-900"
            >
              Dirrección
            </label>
            <input
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
              Parentesco
            </label>
            <select
              id="typeId"
              name="typeId"
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
            >
              {guardianTypesLoader.value.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="pt-4">
          <button
            type="submit"
            class="group relative me-2 mb-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 p-0.5 text-sm font-medium text-gray-900 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 focus:ring-4 focus:ring-red-100 focus:outline-none dark:text-white dark:hover:text-gray-900 dark:focus:ring-red-400"
          >
            <span class="relative rounded-md bg-white px-5 py-2.5 transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent">
              Registrar
            </span>
          </button>
        </div>
      </Form>
    </div>
  );
});
