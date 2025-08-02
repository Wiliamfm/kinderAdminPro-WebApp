import { component$, useSignal } from '@builder.io/qwik';
import { Form, routeAction$, routeLoader$, z, zod$ } from '@builder.io/qwik-city';
import Title from '~/components/common/title/title';
import { getGuardians, sendNotification } from '~/services/events.service';

export const useGetGuardians = routeLoader$(async () => {
  return await getGuardians();
})

export const useSendNotification = routeAction$(async (request, event) => {
  if (request.to.includes("All")) {
    const guardians = await getGuardians();
    request.to = guardians.map(guardian => guardian.email);
  }

  const response = await sendNotification(request.to, request.subject, request.body);
  if (response != "OK") {
    return event.fail(500, { message: "Error al enviar la notificación" });
  }
  return true;
}, zod$({
  to: z.array(z.string()).min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
}));

export default component$(() => {
  const guardiansLoader = useGetGuardians();

  const sendNotificationAction = useSendNotification();

  const recipients = useSignal<string[]>([]);

  return (
    <div>
      <Title title="Enviar Notificación" />

      <Form class="max-w-sm mx-auto">
        <div class="mb-5">
          <label for="recipients" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Seleccione los destinatarios</label>
          <select multiple id="recipients" name="recipients" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" onChange$={(_, event) => {
            recipients.value = [];
            for (let i = 0; i < event.options.length; i++) {
              if (event.options.item(i)?.selected) {
                if (event.options.item(i)?.value) {
                  recipients.value.push(event.options.item(i)?.value!);
                }
              }
            }
          }}>
            <option selected>All</option>
            {guardiansLoader.value.map((guardian) => (
              <option key={guardian.id} value={guardian.email}>{guardian.email}</option>
            ))}
          </select>
        </div>
        <div class="mb-5">
          <label for="subject" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Asunto</label>
          <input type="text" id="subject" name="subject" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
        </div>
        <div class="mb-5">
          <label for="body" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Contenido</label>
          <textarea id="body" name="body" rows={4} class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Contenido....."></textarea>
        </div>

        <button type="button" class="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-500 group-hover:to-pink-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-purple-800" onClick$={async () => {
          console.log(recipients.value);
          const action = await sendNotificationAction.submit({
            to: recipients.value,
            subject: (document.getElementById('subject') as HTMLInputElement)?.value,
            body: (document.getElementById('body') as HTMLInputElement)?.value
          });
          if (action.value?.failed) {
            alert(action.value.message);
            return;
          }
          alert("Mensaje enviado.");
        }}>
          <span class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
            Enviar
          </span>
        </button>
      </Form>
    </div>
  );
});
