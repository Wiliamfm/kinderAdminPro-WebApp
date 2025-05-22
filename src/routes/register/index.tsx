import { component$ } from '@builder.io/qwik';
import { Form } from '@builder.io/qwik-city';
import { useCreateStudentRequest, useGetBloodTypes, useGetGrades, useGetGuardianTypes } from '~/services/enrollment.service';

export { useGetGrades, useGetBloodTypes, useGetGuardianTypes, useCreateStudentRequest }

export default component$(() => {
  const gradesLoader = useGetGrades();
  const bloodTypesLoader = useGetBloodTypes();
  const guardianTypesLoader = useGetGuardianTypes();

  const registerStudentAction = useCreateStudentRequest();
  return (
    <div>
      <Form action={registerStudentAction} class="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow space-y-6" onSubmitCompleted$={() => {
        if (!registerStudentAction.value) return;
        if (registerStudentAction.value.failed) {
          console.error(registerStudentAction.value.message);
          alert("Error al crear el estudiante");
          return;
        }
        alert("Solicitud creada exitosamente");
      }}>
        <h2 class="text-2xl font-bold text-gray-900">Registrar Estudiante</h2>
        <input type="hidden" name="id" />

        <div>
          <label for="studentName" class="block mb-2 text-sm font-medium text-gray-900">Nombre Completo</label>
          <input type="text" id="studentName" name="studentName" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="birthDate" class="block mb-2 text-sm font-medium text-gray-900">Fecha de Nacimiento</label>
          <input type="date" id="birthDate" name="birthDate" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="birthPlace" class="block mb-2 text-sm font-medium text-gray-900">Lugar de Nacimiento</label>
          <input type="text" id="birthPlace" name="birthPlace" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="department" class="block mb-2 text-sm font-medium text-gray-900">Departamento</label>
          <input type="text" id="department" name="department" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="studentDocument" class="block mb-2 text-sm font-medium text-gray-900">Número de Documento</label>
          <input type="text" id="studentDocument" name="studentDocument" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="weight" class="block mb-2 text-sm font-medium text-gray-900">Peso (kg)</label>
            <input type="number" step="0.1" id="weight" name="weight" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>
          <div>
            <label for="height" class="block mb-2 text-sm font-medium text-gray-900">Altura (cm)</label>
            <input type="number" step="0.1" id="height" name="height" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>
        </div>

        <div>
          <label for="bloodType" class="block mb-2 text-sm font-medium text-gray-900">Tipo de sangre</label>
          <select id="bloodType" name="bloodType" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5">
            {bloodTypesLoader.value.map((bloodType) => (
              <option key={bloodType.id} value={bloodType.id}>{bloodType.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label for="socialSecurity" class="block mb-2 text-sm font-medium text-gray-900">Eps</label>
          <input type="text" id="socialSecurity" name="socialSecurity" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="allergies" class="block mb-2 text-sm font-medium text-gray-900">Alergias (separar por comas)</label>
          <input type="text" id="allergies" name="allergies"
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5"
            placeholder="e.g. peanuts, pollen" />
        </div>

        <div>
          <label for="gradeId" class="block mb-2 text-sm font-medium text-gray-900">Grado</label>
          <select id="gradeId" name="gradeId" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5">
            {gradesLoader.value.map((grade) => (
              <option key={grade.id} value={grade.id}>{grade.displayName}</option>
            ))}
          </select>
        </div>

        <h2 class="text-2xl font-bold text-gray-900">Datos del acudiente</h2>

        <div>
          <div>
            <label for="guardianName" class="block mb-2 text-sm font-medium text-gray-900">Nombre Completo</label>
            <input type="text" id="guardianName" name="guardianName" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>

          <div>
            <label for="guardianDocument" class="block mb-2 text-sm font-medium text-gray-900">Número de documento</label>
            <input type="text" id="guardianDocument" name="guardianDocument" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>

          <div>
            <label for="phone" class="block mb-2 text-sm font-medium text-gray-900">Teléfono</label>
            <input type="tel" id="phone" name="phone" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5"
              placeholder="+57 300 0000000" />
          </div>

          <div>
            <label for="profession" class="block mb-2 text-sm font-medium text-gray-900">Profesión</label>
            <input type="text" id="profession" name="profession" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>

          <div>
            <label for="company" class="block mb-2 text-sm font-medium text-gray-900">Empresa</label>
            <input type="text" id="company" name="company" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>

          <div>
            <label for="email" class="block mb-2 text-sm font-medium text-gray-900">Email</label>
            <input type="email" id="email" name="email" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5"
              placeholder="example@email.com" />
          </div>

          <div>
            <label for="address" class="block mb-2 text-sm font-medium text-gray-900">Dirrección</label>
            <input type="text" id="address" name="address" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>

          <div>
            <label for="typeId" class="block mb-2 text-sm font-medium text-gray-900">Parentesco</label>
            <select id="typeId" name="typeId" class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5">
              {guardianTypesLoader.value.map((type) => (
                <option key={type.id} value={type.id}>{type.displayName}</option>
              ))}
            </select>
          </div>
        </div>

        <div class="pt-4">
          <button type="submit" class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400">
            <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
              Registrar
            </span>
          </button>
        </div>
      </Form>
    </div>
  );
});
