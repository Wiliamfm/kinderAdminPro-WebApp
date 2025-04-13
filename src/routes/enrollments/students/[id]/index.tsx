import { component$, useSignal } from '@builder.io/qwik';
import { Form, routeLoader$, useNavigate } from '@builder.io/qwik-city';
import { getGuardians, getStudent, useGetGrades, useUpdateStudent } from '~/services/enrollment.service';

export { useUpdateStudent, useGetGrades };

export const useGetStudent = routeLoader$(async (event) => {
  const response = await getStudent(event.params.id).catch(error => {
    return event.fail(404, { message: error.message });
  });

  return response;
});

export const useGetGuardians = routeLoader$(async () => {
  const response = await getGuardians();
  return response;
});

export default component$(() => {
  const navigation = useNavigate();

  const studentLoader = useGetStudent();
  const guardiansLoader = useGetGuardians();
  const gradesLoader = useGetGrades();

  const updateStudentAction = useUpdateStudent();

  const guardianInputRef = useSignal<HTMLInputElement>();

  const bloodTypes = [
    { id: "A+", name: "A+" },
    { id: "A-", name: "A-" },
    { id: "B+", name: "B+" },
    { id: "B-", name: "B-" },
    { id: "AB+", name: "AB+" },
    { id: "AB-", name: "AB-" },
    { id: "O+", name: "O+" },
    { id: "O-", name: "O-" },
  ];

  return (
    <div>
      <Form action={updateStudentAction} class="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow space-y-6" onSubmitCompleted$={() => {
        if (!updateStudentAction.value) return;
        if (updateStudentAction.value.failed) {
          console.error(updateStudentAction.value.message);
          alert("Error al actualizar el estudiante");
          return;
        }
        navigation("/enrollments/students");
      }}>
        <h2 class="text-2xl font-bold text-gray-900">Actualizar Estudiante</h2>
        <input type="hidden" value={studentLoader.value.id} name="id" />

        <div>
          <label for="fullName" class="block mb-2 text-sm font-medium text-gray-900">Nombre Completo</label>
          <input value={studentLoader.value.fullName} type="text" id="fullName" name="fullName" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="birthDate" class="block mb-2 text-sm font-medium text-gray-900">Fecha de Nacimiento</label>
          <input value={studentLoader.value.birthDate?.toISOString().split('T')[0]} type="date" id="birthDate" name="birthDate" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="birthPlace" class="block mb-2 text-sm font-medium text-gray-900">Lugar de Nacimiento</label>
          <input value={studentLoader.value.birthPlace} type="text" id="birthPlace" name="birthPlace" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="department" class="block mb-2 text-sm font-medium text-gray-900">Departamento</label>
          <input value={studentLoader.value.department} type="text" id="department" name="department" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="documentNumber" class="block mb-2 text-sm font-medium text-gray-900">Número de Documento</label>
          <input value={studentLoader.value.documentNumber} type="text" id="documentNumber" name="documentNumber" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="weight" class="block mb-2 text-sm font-medium text-gray-900">Peso (kg)</label>
            <input value={studentLoader.value.weight} type="number" step="0.1" id="weight" name="weight" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>
          <div>
            <label for="height" class="block mb-2 text-sm font-medium text-gray-900">Altura (cm)</label>
            <input value={studentLoader.value.height} type="number" step="0.1" id="height" name="height" required
              class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
          </div>
        </div>

        <div>
          <label for="bloodType" class="block mb-2 text-sm font-medium text-gray-900">Tipo de sangre</label>
          <select id="bloodType" name="bloodType" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" onChange$={(_, element) => {
              studentLoader.value.bloodType = element.value;
            }}>
            {bloodTypes.map((bloodType) => (
              <option key={bloodType.id} value={bloodType.id} selected={studentLoader.value.bloodType === bloodType.id}>{bloodType.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label for="socialSecurity" class="block mb-2 text-sm font-medium text-gray-900">Eps</label>
          <input value={studentLoader.value.socialSecurity} type="text" id="socialSecurity" name="socialSecurity" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" />
        </div>

        <div>
          <label for="allergies" class="block mb-2 text-sm font-medium text-gray-900">Alergias (separar por comas)</label>
          <input value={studentLoader.value.allergies} type="text" id="allergies" name="allergies"
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5"
            placeholder="e.g. peanuts, pollen" />
        </div>

        <div>
          <label for="gradeId" class="block mb-2 text-sm font-medium text-gray-900">Grado</label>
          <select id="gradeId" name="gradeId" required
            class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" onChange$={(_, element) => {
              studentLoader.value.gradeId = element.value;
            }}>
            {gradesLoader.value.map((grade) => (
              <option key={grade.id} value={grade.id} selected={studentLoader.value.gradeId === grade.id}>{grade.name}</option>
            ))}
          </select>
        </div>

        <div>
          <input ref={guardianInputRef} type="hidden" value={studentLoader.value.guardians?.map(g => g.id).join(',')} name="guardianIds" />
          <label for="guardianIds" class="block mb-2 text-sm font-medium text-gray-900">Acudientes</label>
          <select id="guardianIds" multiple class="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg block w-full p-2.5" onChange$={(_, element) => {
            const options = [...element.selectedOptions];
            if (!guardianInputRef.value) return;
            guardianInputRef.value.value = options.map((option) => option.value).join(',');
          }} >
            {guardiansLoader.value.map((guardian) => (
              <option key={guardian.id} value={guardian.id} selected={studentLoader.value.guardians?.find(g => g.id === guardian.id) ? true : false}>{guardian.name}</option>
            ))}
          </select>
          <p class="mt-1 text-sm text-gray-500">Presione Ctrl (o Cmd) para seleccionar varios</p>
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
