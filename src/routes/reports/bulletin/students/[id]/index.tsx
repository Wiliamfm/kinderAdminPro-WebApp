import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  routeAction$,
  routeLoader$,
  useLocation,
  z,
  zod$,
} from "@builder.io/qwik-city";
import Table, { TableHeader } from "~/components/common/table/table";
import {
  createStudentBulletinValue,
  getBulletins,
  getBulletinsByGrade,
  getSemesters,
  getStudentBulletinValue,
  updateStudentBulletinValue,
} from "~/services/report.service";
import { BulletinWithValue } from "~/types/report.types";

export const useGetBulletin = routeLoader$(async (event) => {
  const gradeId = event.query.get("grade_id");
  let bulletins;
  if (gradeId) {
    bulletins = await getBulletinsByGrade(Number(gradeId));
  } else {
    bulletins = await getBulletins();
  }
  if (!bulletins) {
    return [];
  }

  return bulletins;
});

export const useGetSemesters = routeLoader$(async () => {
  const response = await getSemesters();
  if (!response) {
    return [];
  }

  return response;
});

export const useUpdateStudentBulletinValue = routeAction$(
  async (data, event) => {
    const studentId = event.params.id;
    const studentBulletin = await getStudentBulletinValue(
      Number(studentId),
      Number(data.bulletinId),
      Number(data.semesterId),
    );
    let response;
    if (Number(data.value) <= 0 || Number(data.value) > 5) {
      return event.fail(400, {
        message: "La valoración debe estar entre 1 y 5",
      });
    }
    if (studentBulletin) {
      response = await updateStudentBulletinValue(
        Number(studentId),
        Number(data.bulletinId),
        Number(data.value),
        Number(data.semesterId),
      );
    } else {
      response = await createStudentBulletinValue(
        Number(studentId),
        Number(data.bulletinId),
        Number(data.value),
        Number(data.semesterId),
      );
    }

    return !!response;
  },
  zod$({
    bulletinId: z.coerce.number(),
    semesterId: z.coerce.number(),
    value: z.coerce.string().min(1),
  }),
);

export default component$(() => {
  const bulletinLoader = useGetBulletin();
  const semestersLoader = useGetSemesters();
  const location = useLocation();

  const updateStudentBulletinAction = useUpdateStudentBulletinValue();

  const semester = useSignal(
    semestersLoader.value.find((semester) => semester.isActive)?.id,
  );
  const filteredBulletins = useSignal<BulletinWithValue[]>([]);

  useTask$(async ({ track }) => {
    track(() => semester.value);
    filteredBulletins.value = [];
    for (const bulletin of bulletinLoader.value) {
      if (!semester.value) {
        console.error("Semester not found");
        continue;
      }
      const bulletinValue = await getStudentBulletinValue(
        Number(location.params.id),
        bulletin.id,
        semester.value,
      );
      filteredBulletins.value.push({
        ...bulletin,
        value: bulletinValue?.value ?? null,
        semesterId: semester.value,
      });
    }
  });

  const tableHeaders: TableHeader[] = [
    { name: "Id", key: "id" },
    { name: "Tipo", key: "type" },
    { name: "Descripción", key: "name" },
    { name: "Valoración", key: "actions" },
  ];
  const bulletins = filteredBulletins.value?.map((bulletin) => {
    return {
      ...bulletin,
      actions: [
        <div class="mb-6">
          <form>
            <input type="hidden" name="bulletinId" value={bulletin.id} />
            <label
              for="default-input"
              class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              Valoración
            </label>
            <input
              type="number"
              min="0"
              max="5"
              name="value"
              value={bulletin.value}
              class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              onBlur$={async (event, element) => {
                if (!element.value) {
                  return;
                }
                const response = await updateStudentBulletinAction.submit({
                  bulletinId: bulletin.id,
                  semesterId: semester.value ? Number(semester.value) : 0,
                  value: element.value,
                });
                if (!response.value) {
                  return;
                }
                if (response.value.failed) {
                  alert(response.value.message);
                  console.error(response.value);
                  element.value = "";
                  return;
                }
              }}
            />
          </form>
        </div>,
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
          Periodo Académico
        </label>
        <select
          id="semesterId"
          name="semesterId"
          required
          class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900"
          onChange$={(_, event) => {
            semester.value = Number(event.value);
          }}
        >
          {semestersLoader.value.map((semester) => (
            <option
              key={semester.id}
              value={semester.id}
              selected={semester.isActive}
            >
              {semester.semester}
            </option>
          ))}
        </select>
      </div>

      <Table headers={tableHeaders} data={bulletins ?? []} />
    </div>
  );
});
