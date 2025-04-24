import { $, component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { Calendar } from 'fullcalendar/index.js';
import esLocale from '@fullcalendar/core/locales/es';
import FormModal from '~/components/common/modal/formModal/formModal';
import { FormSubmitSuccessDetail, routeAction$, routeLoader$, z, zod$ } from '@builder.io/qwik-city';
import { createCalendarEvent, getCalendarEvents } from '~/services/payroll.service';
import { CalendarEvent } from '~/types/payroll.types';

export const useGetCalendarEvents = routeLoader$(async () => {
  const events = await getCalendarEvents();
  return events.map((e: CalendarEvent) => {
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.startDate,
      end: e.endDate,
    };
  });
});

export const useCreateEvent = routeAction$(async (data, event) => {
  const isAllDay = data.isAllDay ?? false;
  if (data.isAllDay === false && (data.startTime == undefined || data.endTime == undefined)) {
    return event.fail(400, { message: "La fecha de inicio y finalización son obligatorias cuando el evento no es todo el día!" });
  }
  const startDate = isAllDay ? new Date(data.startDate.getFullYear(), data.startDate.getMonth(), data.startDate.getDate() + 1, 0, 0) : new Date(data.startDate.getFullYear(), data.startDate.getMonth(), data.startDate.getDate() + 1, Number(data.startTime!.substring(0, 2)), Number(data.startTime!.substring(3)));
  const endDate = isAllDay ? new Date(data.endDate.getFullYear(), data.endDate.getMonth(), data.endDate.getDate() + 1, 12, 0) : new Date(data.endDate.getFullYear(), data.endDate.getMonth(), data.endDate.getDate() + 1, Number(data.endTime!.substring(0, 2)), Number(data.endTime!.substring(3)));
  if (startDate >= endDate || startDate < new Date()) {
    return event.fail(400, { message: `La fecha de inicio (${startDate}) debe ser menor a la fecha de finalización (${endDate}!` });
  }

  const request: CalendarEvent = {
    title: data.title,
    description: data.description,
    startDate: startDate,
    endDate: endDate,
    isAllDay: isAllDay,
  }

  const response = await createCalendarEvent(request);

  event.status(201);
  return response;
}, zod$({
  title: z.string().min(3),
  description: z.string().min(3),
  startDate: z.coerce.date(),
  startTime: z.string().optional(),
  endDate: z.coerce.date(),
  endTime: z.string().optional(),
  isAllDay: z.coerce.boolean().optional(),
}));

const createEventFormHandler = $((data: CustomEvent<FormSubmitSuccessDetail<any>>, element: HTMLFormElement) => {
  console.log("data: ", data.detail);
  //element.reset();
});

export default component$(() => {
  const calendarRef = useSignal<HTMLDivElement>();
  const calendarEventModalRef = useSignal<HTMLButtonElement>();

  const eventDateCheckBox = useSignal(false);

  const calendarEventsLoader = useGetCalendarEvents();

  const createEventAction = useCreateEvent();

  useVisibleTask$(() => {
    if (!calendarEventModalRef.value) return;
    calendarEventModalRef.value.style.display = "none";
    console.log("creating calendar with events: ", calendarEventsLoader.value);
    const calendar = new Calendar(calendarRef.value!, {
      initialView: "dayGridMonth",
      height: "auto",
      selectable: true,
      editable: true,
      locale: esLocale,
      nextDayThreshold: "00:00:00",
      events: calendarEventsLoader.value,
      customButtons: {
        eventBtn: {
          text: "Nuevo Evento",
          click: function() {
            calendarEventModalRef.value?.click();
          },
        },
      },
      headerToolbar: {
        center: "eventBtn",
      },
      dateClick: (data) => {
        console.log(data);
      }
    });
    calendar.render();
  });

  return (
    <div>
      <h1 class="mt-18 text-4xl text-center">Calendario</h1>
      <div ref={calendarRef} class="m-30">
      </div>
      <FormModal btnModalRef={calendarEventModalRef} modalId="event-modal" modalTitle="Nuevo Evento" modalBtnName="Nuevo Evento" formBtnClass="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400" formAction={createEventAction} formOnSubmitFn={createEventFormHandler}>
        <div class="relative z-0 w-full mb-5 group">
          <input type="text" name="title" id="title" class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer" placeholder=" " required />
          <label for="title" class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">Título del evento</label>
        </div>
        <div class="relative z-0 w-full mb-5 group">
          <label for="description" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Descripción</label>
          <textarea id="description" name="description" rows={3} class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Descripción del evento"></textarea>
        </div>
        <div class="relative z-0 w-full mb-5 group">

          <div class="flex items-center">
            <div class="flex-grow">
              <input name="startDate" type="date" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Fecha final" />
            </div>
            <span class="mx-4 text-gray-500">to</span>
            <div class="flex-grow">
              <input name="endDate" type="date" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Fecha final" />
            </div>
          </div>
        </div>
        <div class="grid md:grid-cols-2 md:gap-6">
          <div class="flex items-center">
            <input bind:checked={eventDateCheckBox} name="isAllDay" id="allDayCheckbox" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label for="checked-checkbox" class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Todo el día</label>
          </div></div>
        {!eventDateCheckBox.value &&
          <div class="grid md:grid-cols-2 md:gap-6">
            <div class="relative z-0 w-full mb-5 group">
              <label for="start-time" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Hora de inicio:</label>
              <div class="relative">
                <div class="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input name="startTime" type="time" id="start-time" class="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value="00:00" required />
              </div>
            </div>
            <div class="relative z-0 w-full mb-5 group">
              <label for="end-time" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Hora de salida:</label>
              <div class="relative">
                <div class="absolute inset-y-0 end-0 top-0 flex items-center pe-3.5 pointer-events-none">
                  <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input name="endTime" type="time" id="end-time" class="bg-gray-50 border leading-none border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" value="00:00" required />
              </div>
            </div>
          </div>
        }
        <span q:slot="formSlot" class="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
          Crear Evento
        </span>
      </FormModal >
    </div>
  );
});
