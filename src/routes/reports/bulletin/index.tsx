import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, zod$, z } from "@builder.io/qwik-city";
import Table, { TableHeader } from "~/components/common/table/table";
import Title from "~/components/common/title/title";
import { useGetGrades } from "~/services/enrollment.service";
import { getUserStatus } from "~/services/identity.service";
import {
  deleteBulletin,
  deleteStudentBulletin,
  getBulletinsByGrade,
  getGradesByProfessor,
  getStudentsByGrade,
  getStudentsByProfessor,
} from "~/services/report.service";
import { StudentResponse } from "~/types/enrollment.types";
import { Bulletin } from "~/types/report.types";

export { useGetGrades };

export const useGetGradesByProfessor = routeLoader$(async (event) => {
  const loginStatus = await event.resolveValue(useLoginStatus);
  if (!loginStatus) {
    return null;
  }
  return await getGradesByProfessor(loginStatus.id, true);
});

export const useGetStudentsByProfessor = routeLoader$(async (event) => {
  const loginStatus = await event.resolveValue(useLoginStatus);
  if (!loginStatus) {
    return null;
  }
  return await getStudentsByProfessor(loginStatus.id);
});

export const useLoginStatus = routeLoader$(async (event) => {
  return await getUserStatus(event.cookie.get("username")?.value);
});

export const useDeleteRow = routeAction$(
  async (data, event) => {
    const response = await deleteBulletin(data.id);
    if (!response) {
      return event.fail(500, {
        message: "Error al eliminar el boletin. Trate nuevamente.",
      });
    }

    return true;
  },
  zod$({
    id: z.coerce.number(),
  }),
);

export const useDeleteStudentBulletin = routeAction$(
  async (data, event) => {
    const response = await deleteStudentBulletin(data.id);
    if (!response) {
      return event.fail(500, {
        message:
          "Error al eliminar el boletin del estudiante. Trate nuevamente.",
      });
    }

    return true;
  },
  zod$({
    id: z.coerce.number(),
  }),
);

export default component$(() => {
  const grade = useSignal(1);
  const bulletinsSignal = useSignal<Bulletin[] | null>([]);
  const studentsByGradeSignal = useSignal<StudentResponse[] | null>([]);

  const loginStatusLoader = useLoginStatus();
  const gradesLoader = useGetGrades();
  const gradesByProfessorLoader = useGetGradesByProfessor();
  const studentsByProfessorLoader = useGetStudentsByProfessor();

  const deleteBulletinAction = useDeleteRow();
  const deleteStudentBulletin = useDeleteStudentBulletin();

  useTask$(async ({ track }) => {
    track(() => grade.value); // re-run when postId changes
    bulletinsSignal.value = await getBulletinsByGrade(grade.value);
    studentsByGradeSignal.value = await getStudentsByGrade(grade.value);
  });

  const tableHeaders: TableHeader[] = [
    { name: "Id", key: "id" },
    { name: "Tipo", key: "type" },
    { name: "Descripción", key: "name" },
    { name: "Acciones", key: "actions" },
  ];
  const bulletins = bulletinsSignal.value?.map((bulletin) => {
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
            const response = await deleteBulletinAction.submit({
              id: bulletin.id,
            });
            if (response.value.failed) {
              alert(response.value.message);
              console.error(response.value);
              return;
            }
            alert("Boletin Eliminado!");
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

  const professorTableHeaders: TableHeader[] = [
    { name: "Id", key: "id" },
    { name: "Nombre Completo", key: "fullName" },
    {
      name: "Grado",
      key: "gradeId",
      format: $((id: number) => {
        if (!gradesByProfessorLoader.value) {
          return id;
        }
        const grade = gradesByProfessorLoader.value.find((x) => x.id === id);
        if (!grade) {
          return id;
        }
        return grade.displayName;
      }),
    },
    { name: "Acciones", key: "actions" },
  ];
  const studentsByProfessor = studentsByProfessorLoader.value?.map(
    (student) => {
      return {
        ...student,
        actions: [
          <a href={`students/${student.id}`}>
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
                d="M3.559 4.544c.355-.35.834-.544 1.33-.544H19.11c.496 0 .975.194 1.33.544.356.35.559.829.559 1.331v9.25c0 .502-.203.981-.559 1.331-.355.35-.834.544-1.33.544H15.5l-2.7 3.6a1 1 0 0 1-1.6 0L8.5 17H4.889c-.496 0-.975-.194-1.33-.544A1.868 1.868 0 0 1 3 15.125v-9.25c0-.502.203-.981.559-1.331ZM7.556 7.5a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2h-8Zm0 3.5a1 1 0 1 0 0 2H12a1 1 0 1 0 0-2H7.556Z"
                clip-rule="evenodd"
              />
            </svg>
          </a>,
          <button
            class="cursor-pointer"
            onClick$={async () => {
              const response = await deleteStudentBulletin.submit({
                id: student.id,
              });
              if (response.value.failed) {
                alert(response.value.message);
                console.error(response.value);
                return;
              }
              alert("Boletin del estudiante eliminado!");
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
    },
  );

  const studentsByGrade = studentsByGradeSignal.value?.map((student) => {
    return {
      ...student,
      actions: [
        <a href={`students/${student.id}`}>
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
              d="M3.559 4.544c.355-.35.834-.544 1.33-.544H19.11c.496 0 .975.194 1.33.544.356.35.559.829.559 1.331v9.25c0 .502-.203.981-.559 1.331-.355.35-.834.544-1.33.544H15.5l-2.7 3.6a1 1 0 0 1-1.6 0L8.5 17H4.889c-.496 0-.975-.194-1.33-.544A1.868 1.868 0 0 1 3 15.125v-9.25c0-.502.203-.981.559-1.331ZM7.556 7.5a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2h-8Zm0 3.5a1 1 0 1 0 0 2H12a1 1 0 1 0 0-2H7.556Z"
              clip-rule="evenodd"
            />
          </svg>
        </a>,
        <button
          class="cursor-pointer"
          onClick$={async () => {
            const response = await deleteStudentBulletin.submit({
              id: student.id,
            });
            if (response.value.failed) {
              alert(response.value.message);
              console.error(response.value);
              return;
            }
            alert("Boletin del estudiante eliminado!");
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

  return (
    <div>
      <div class="mx-auto my-10 max-w-sm">
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
          onChange$={(_, event) => {
            grade.value = Number(event.value);
          }}
        >
          {gradesLoader.value.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.displayName}
            </option>
          ))}
        </select>
      </div>

      {loginStatusLoader.value?.role === "admin" && (
        <div>
          <div>
            <Title title="Configuración del boletin." />

            <button
              class="group relative me-2 mb-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 p-0.5 text-sm font-medium text-gray-900 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 focus:ring-4 focus:ring-red-100 focus:outline-none dark:text-white dark:hover:text-gray-900 dark:focus:ring-red-400"
              type="button"
            >
              <span class="relative rounded-md bg-white px-5 py-2.5 transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent">
                <a href="0">Crear nuevo </a>
              </span>
            </button>
            <Table headers={tableHeaders} data={bulletins ?? []} />
          </div>

          <div>
            {studentsByGradeSignal.value && (
              <div>
                <Title title="Boletin de estudiantes" />
                <Table
                  headers={professorTableHeaders}
                  data={studentsByGrade ?? []}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {studentsByProfessorLoader.value && (
        <div>
          <Title title="Boletin de estudiantes" />
          <Table
            headers={professorTableHeaders}
            data={studentsByProfessor ?? []}
          />
        </div>
      )}
    </div>
  );
});
