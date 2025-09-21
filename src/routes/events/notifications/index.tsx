import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  z,
  zod$,
} from "@builder.io/qwik-city";
import Title from "~/components/common/title/title";
import { useGetGrades } from "~/services/enrollment.service";
import {
  getGuardians,
  getGuardiansByGrade,
  sendNotification,
} from "~/services/events.service";
import { GuardianResponse } from "~/types/enrollment.types";

export { useGetGrades };

export const useGetGuardians = routeLoader$(async () => {
  return await getGuardians();
});

export const useSendNotification = routeAction$(
  async (request, event) => {
    if (request.to.includes("All")) {
      const guardians = await getGuardians();
      request.to = guardians.map((guardian) => guardian.email);
    }

    const response = await sendNotification(
      request.to,
      request.subject,
      request.body,
    );
    if (response != "OK") {
      return event.fail(500, { message: "Error al enviar la notificación" });
    }
    return true;
  },
  zod$({
    to: z.array(z.string()).min(1, "At least one recipient is required"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
  }),
);

export default component$(() => {
  const grade = useSignal(0);
  const guardians = useSignal<GuardianResponse[]>([]);

  //const guardiansLoader = useGetGuardians();
  const gradesLoader = useGetGrades();

  const sendNotificationAction = useSendNotification();

  const recipients = useSignal<string[]>([]);

  useTask$(async ({ track }) => {
    track(() => grade.value); // re-run when postId changes
    guardians.value = await getGuardiansByGrade(grade.value);
  });

  return (
    <div>
      <Title title="Enviar Notificación" />

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

      <Form class="mx-auto max-w-sm">
        <div class="mb-5">
          <label
            for="recipients"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Seleccione los destinatarios
          </label>
          <select
            multiple
            id="recipients"
            name="recipients"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            onChange$={(_, event) => {
              recipients.value = [];
              for (let i = 0; i < event.options.length; i++) {
                if (event.options.item(i)?.selected) {
                  const value = event.options.item(i)?.value;
                  if (value) {
                    recipients.value.push(value);
                  }
                }
              }
            }}
          >
            <option selected>All</option>
            {guardians.value.map((guardian) => (
              <option key={guardian.id} value={guardian.email}>
                {guardian.email}
              </option>
            ))}
          </select>
        </div>
        <div class="mb-5">
          <label
            for="subject"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Asunto
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
          />
        </div>
        <div class="mb-5">
          <label
            for="body"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Contenido
          </label>
          <textarea
            id="body"
            name="body"
            rows={4}
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Contenido....."
          ></textarea>
        </div>

        <button
          type="button"
          class="group relative me-2 mb-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 text-sm font-medium text-gray-900 group-hover:from-purple-500 group-hover:to-pink-500 hover:text-white focus:ring-4 focus:ring-purple-200 focus:outline-none dark:text-white dark:focus:ring-purple-800"
          onClick$={async () => {
            console.log(recipients.value);
            const action = await sendNotificationAction.submit({
              to: recipients.value,
              subject: (document.getElementById("subject") as HTMLInputElement)
                ?.value,
              body: (document.getElementById("body") as HTMLInputElement)
                ?.value,
            });
            if (action.value?.failed) {
              alert(action.value.message);
              return;
            }
            alert("Mensaje enviado.");
          }}
        >
          <span class="relative rounded-md bg-white px-5 py-2.5 transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent">
            Enviar
          </span>
        </button>
      </Form>
    </div>
  );
});
