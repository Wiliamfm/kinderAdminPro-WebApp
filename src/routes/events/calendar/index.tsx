import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { Calendar } from "fullcalendar/index.js";
import esLocale from "@fullcalendar/core/locales/es";
import FormModal from "~/components/common/modal/formModal/formModal";
import {
  FormSubmitSuccessDetail,
  routeAction$,
  routeLoader$,
  z,
  zod$,
} from "@builder.io/qwik-city";
import {
  createCalendarEvent,
  getCalendarEvents,
} from "~/services/payroll.service";
import { CalendarEvent } from "~/types/payroll.types";

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

export const useCreateEvent = routeAction$(
  async (data, event) => {
    const isAllDay = data.isAllDay ?? false;
    if (
      data.isAllDay === false &&
      (data.startTime == undefined || data.endTime == undefined)
    ) {
      return event.fail(400, {
        message:
          "La fecha de inicio y finalización son obligatorias cuando el evento no es todo el día!",
      });
    }
    const startDate = isAllDay
      ? new Date(
          data.startDate.getFullYear(),
          data.startDate.getMonth(),
          data.startDate.getDate() + 1,
          0,
          0,
        )
      : new Date(
          data.startDate.getFullYear(),
          data.startDate.getMonth(),
          data.startDate.getDate() + 1,
          Number(data.startTime!.substring(0, 2)),
          Number(data.startTime!.substring(3)),
        );
    const endDate = isAllDay
      ? new Date(
          data.endDate.getFullYear(),
          data.endDate.getMonth(),
          data.endDate.getDate() + 1,
          12,
          0,
        )
      : new Date(
          data.endDate.getFullYear(),
          data.endDate.getMonth(),
          data.endDate.getDate() + 1,
          Number(data.endTime!.substring(0, 2)),
          Number(data.endTime!.substring(3)),
        );
    if (startDate >= endDate || startDate < new Date()) {
      return event.fail(400, {
        message: `La fecha de inicio (${startDate}) debe ser menor a la fecha de finalización (${endDate}!`,
      });
    }

    const request: CalendarEvent = {
      title: data.title,
      description: data.description,
      startDate: startDate,
      endDate: endDate,
      isAllDay: isAllDay,
    };

    const response = await createCalendarEvent(request);

    event.status(201);
    return response;
  },
  zod$({
    title: z.string().min(3, "Título requerido"),
    description: z.string().min(3, "Descripción requerida"),
    startDate: z.coerce.date(),
    startTime: z.string().optional(),
    endDate: z.coerce.date(),
    endTime: z.string().optional(),
    isAllDay: z.coerce.boolean().optional(),
  }),
);

const createEventFormHandler = $(
  (
    data: CustomEvent<FormSubmitSuccessDetail<unknown>>,
    element: HTMLFormElement,
  ) => {
    console.log("data: ", data.detail);
    if (
      !data.detail.value ||
      (data.detail.value as { failed: boolean; message: string }).failed
    ) {
      const message: string | null = (data.detail.value as { message: string })
        .message;
      if (message) {
        alert(`Formulario inválido, ${message ?? "por favor revise de nuevo"}`);
      }
      return;
    }
    element.reset();
    window.location.reload();
  },
);

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
          click: function () {
            calendarEventModalRef.value?.click();
          },
        },
      },
      headerToolbar: {
        center: "eventBtn",
      },
      dateClick: (data) => {
        console.log(data);
      },
    });
    calendar.render();
  });

  return (
    <div>
      <h1 class="mt-18 text-center text-4xl">Calendario</h1>
      <div ref={calendarRef} class="m-30"></div>
      <FormModal
        btnModalRef={calendarEventModalRef}
        modalId="event-modal"
        modalTitle="Nuevo Evento"
        modalBtnName="Nuevo Evento"
        formBtnClass="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-red-200 via-red-300 to-yellow-200 group-hover:from-red-200 group-hover:via-red-300 group-hover:to-yellow-200 dark:text-white dark:hover:text-gray-900 focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400"
        formAction={createEventAction}
        formOnSubmitFn={createEventFormHandler}
      >
        <div class="group relative z-0 mb-5 w-full">
          {createEventAction.value?.failed &&
            createEventAction.value.fieldErrors?.title && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {createEventAction.value.fieldErrors.title}
              </div>
            )}
          <input
            type="text"
            name="title"
            id="title"
            class="peer block w-full appearance-none border-0 border-b-2 border-gray-300 bg-transparent px-0 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:ring-0 focus:outline-none dark:border-gray-600 dark:text-white dark:focus:border-blue-500"
            placeholder=" "
            required
          />
          <label
            for="title"
            class="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-gray-500 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:start-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:font-medium peer-focus:text-blue-600 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4 dark:text-gray-400 peer-focus:dark:text-blue-500"
          >
            Título del evento
          </label>
        </div>
        <div class="group relative z-0 mb-5 w-full">
          {createEventAction.value?.failed &&
            createEventAction.value.fieldErrors?.description && (
              <div
                class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                role="alert"
              >
                <span class="font-medium">Campo inválido!</span>{" "}
                {createEventAction.value.fieldErrors.description}
              </div>
            )}
          <label
            for="description"
            class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
          >
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Descripción del evento"
          ></textarea>
        </div>
        <div class="group relative z-0 mb-5 w-full">
          <div class="flex items-center">
            <div class="flex-grow">
              {createEventAction.value?.failed &&
                createEventAction.value.fieldErrors?.startTime && (
                  <div
                    class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                    role="alert"
                  >
                    <span class="font-medium">Campo inválido!</span>{" "}
                    {createEventAction.value.fieldErrors.startTime}
                  </div>
                )}
              <input
                name="startDate"
                type="date"
                class="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 ps-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                placeholder="Fecha final"
                required
              />
            </div>
            <span class="mx-4 text-gray-500">to</span>
            <div class="flex-grow">
              {createEventAction.value?.failed &&
                createEventAction.value.fieldErrors?.endTime && (
                  <div
                    class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400"
                    role="alert"
                  >
                    <span class="font-medium">Campo inválido!</span>{" "}
                    {createEventAction.value.fieldErrors.endTime}
                  </div>
                )}
              <input
                name="endDate"
                type="date"
                class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 ps-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                placeholder="Fecha final"
                required
              />
            </div>
          </div>
        </div>
        <div class="grid md:grid-cols-2 md:gap-6">
          <div class="flex items-center">
            <input
              bind:checked={eventDateCheckBox}
              name="isAllDay"
              id="allDayCheckbox"
              type="checkbox"
              class="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
            />
            <label
              for="checked-checkbox"
              class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              Todo el día
            </label>
          </div>
        </div>
        {!eventDateCheckBox.value && (
          <div class="grid md:grid-cols-2 md:gap-6">
            <div class="group relative z-0 mb-5 w-full">
              <label
                for="start-time"
                class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
              >
                Hora de inicio:
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5">
                  <svg
                    class="h-4 w-4 text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  name="startTime"
                  type="time"
                  id="start-time"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm leading-none text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                  value="00:00"
                  required
                />
              </div>
            </div>
            <div class="group relative z-0 mb-5 w-full">
              <label
                for="end-time"
                class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
              >
                Hora de salida:
              </label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 end-0 top-0 flex items-center pe-3.5">
                  <svg
                    class="h-4 w-4 text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  name="endTime"
                  type="time"
                  id="end-time"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm leading-none text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                  value="00:00"
                  required
                />
              </div>
            </div>
          </div>
        )}
        <span
          q:slot="formSlot"
          class="relative rounded-md bg-white px-5 py-2.5 transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
        >
          Crear Evento
        </span>
      </FormModal>
    </div>
  );
});
