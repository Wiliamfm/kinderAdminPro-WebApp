import { $, component$ } from '@builder.io/qwik';
import { DocumentHead } from '@builder.io/qwik-city';
import Table, { TableHeader } from '~/components/common/table/table';
import Title from '~/components/common/title/title';
import { useAcceptStudentApplication, useDeleteStudentApplication, useGetGrades, useGetGuardianTypes, useGetStudentApplications } from '~/services/enrollment.service';

export { useGetGrades, useGetGuardianTypes, useGetStudentApplications, useDeleteStudentApplication, useAcceptStudentApplication };

export default component$(() => {
  const gradesLoader = useGetGrades();
  const guardianTypesLoader = useGetGuardianTypes();
  const studentApplicationsLoader = useGetStudentApplications();

  const deleteApplicationAction = useDeleteStudentApplication();
  const acceptApplicationAction = useAcceptStudentApplication();

  const tableHeaders: TableHeader[] = [
    { name: "ID", key: "id" },
    { name: "Nombre del Estudiante", key: "studentName" },
    { name: "Fecha de Nacimiento", key: "birthDate", format: $((date: string) => new Date(date).toLocaleDateString()) },
    {
      name: "Grado", key: "gradeId", format: $((gradeId: number) => {
        return gradesLoader.value.find((grade) => grade.id === gradeId)?.displayName ?? "N/A";
      })
    },
    { name: "Documento del Estudiante", key: "studentDocument" },
    { name: "Peso", key: "weight" },
    { name: "Altura", key: "height" },
    {
      name: "Alergias", key: "allergies", format: $((allergies: string[]) => {
        return <ul>
          {allergies.map((allergie, index) => (
            <li key={index}>{allergie}</li>
          ))}
        </ul>

      })
    },
    { name: "Nombre del Acudiente", key: "guardianName" },
    { name: "Documento del Acudiente", key: "guardianDocument" },
    {
      name: "Parentezco", key: "typeId", format: $((typeId: number) => {
        return guardianTypesLoader.value.find((type) => type.id === typeId)?.displayName ?? "N/A";
      })
    },
    { name: "Profesión del Acudiente", key: "profession" },
    { name: "Empresa del Acudiente", key: "company" },
    { name: "Acciones", key: "actions" },
  ];
  const studentApplications = studentApplicationsLoader.value.map((studentApplication) => {
    return {
      ...studentApplication, actions: [
        <button class="cursor-pointer" onClick$={async () => {
          const response = await acceptApplicationAction.submit({ id: studentApplication.id });
          if (!response.value) return;
          if (response.value.failed) {
            alert("Error al aceptar la solicitud");
            console.error(response.value.message);
            return;
          }
          alert(`Estudiante ${studentApplication.studentName} Aceptado!`);
        }}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H7Zm8-1a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 0 1-1-1Z" clip-rule="evenodd" />
          </svg>
        </button >,
        <button class="cursor-pointer" onClick$={async () => {
          const response = await deleteApplicationAction.submit({ id: studentApplication.id });
          if (!response.value) return;
          if (response.value.failed) {
            alert("Error al Eliminar");
            console.error(response.value.message);
            return;
          }
          alert(`Estudiante ${studentApplication.studentName} Rechazado!`);
        }}>
          <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fill-rule="evenodd" d="M5 8a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-2 9a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1Zm13-6a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-4Z" clip-rule="evenodd" />
          </svg>
        </button>,
      ]
    }
  });
  return (
    <div>
      <Title title="Solicitudes de Admisión" />

      <Table headers={tableHeaders} data={studentApplications} />
    </div>
  );
});

export const head: DocumentHead = {
  title: "Solicitudes",
  meta: [
    {
      name: "description",
      content: "Student applications",
    },
  ],
};
