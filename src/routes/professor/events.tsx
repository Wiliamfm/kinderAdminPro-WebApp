import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import {
  Calendar,
  type CalendarApi,
  type EventClickArg,
  type EventContentArg,
  type EventInput,
} from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import EventPreviewModal from '../../components/EventPreviewModal';
import { canAccessModule } from '../../lib/pocketbase/auth';
import type { CalendarItemRecord } from '../../lib/types/calendar';
import {
  listCalendarEventsInRange,
} from '../../lib/pocketbase/events';
import {
  listEventAssignmentsByEventIds,
  type EventAssignmentRecord,
} from '../../lib/pocketbase/event-assignments';

type CalendarRange = {
  start: string;
  end: string;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getDefaultRange(): CalendarRange {
  const now = new Date();
  return {
    start: startOfMonth(now).toISOString(),
    end: addMonths(startOfMonth(now), 1).toISOString(),
  };
}

async function loadCalendarItems(range: CalendarRange): Promise<CalendarItemRecord[]> {
  const events = await listCalendarEventsInRange(range.start, range.end);
  const assignments = await listEventAssignmentsByEventIds(events.map((event) => event.id));

  const assignmentsByEventId = new Map<string, EventAssignmentRecord[]>();
  for (const assignment of assignments) {
    const current = assignmentsByEventId.get(assignment.eventId) ?? [];
    current.push(assignment);
    assignmentsByEventId.set(assignment.eventId, current);
  }

  return events.map((event) => {
    const assignees = assignmentsByEventId.get(event.id) ?? [];
    return {
      ...event,
      assignees,
      assigneeNames: assignees.map((assignee) => assignee.employeeName).filter((name) => name.length > 0),
    };
  });
}

export default function ProfessorCalendarPage() {
  const navigate = useNavigate();
  let calendarHostRef: HTMLDivElement | undefined;
  let calendarApi: CalendarApi | null = null;

  const [visibleRange, setVisibleRange] = createSignal<CalendarRange>(getDefaultRange());
  const [calendarLoadError, setCalendarLoadError] = createSignal<string | null>(null);
  const [previewEventId, setPreviewEventId] = createSignal<string | null>(null);

  const [calendarItems] = createResource(visibleRange, (range) =>
    loadCalendarItems(range).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'No se pudieron cargar los eventos.';
      setCalendarLoadError(msg);
      return [] as CalendarItemRecord[];
    }),
  );

  createEffect(() => {
    if (!canAccessModule('professor-events')) {
      navigate('/', { replace: true });
    }
  });

  const eventItemsById = createMemo(
    () => new Map((calendarItems() ?? []).map((item) => [item.id, item])),
  );
  const previewEvent = createMemo(() => {
    const previewId = previewEventId();
    return previewId ? eventItemsById().get(previewId) ?? null : null;
  });

  const fullCalendarEvents = createMemo<EventInput[]>(() => (
    (calendarItems() ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      start: item.startDateTime,
      end: item.endDateTime,
      allDay: item.isAllDay,
    }))
  ));

  const renderEventContent = (arg: EventContentArg) => {
    const item = eventItemsById().get(arg.event.id);
    const wrapper = document.createElement('div');
    wrapper.className = [
      'flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-sm',
      item?.kind === 'task'
        ? 'border-blue-300 bg-blue-50 text-blue-900'
        : 'border-emerald-300 bg-emerald-50 text-emerald-900',
    ].join(' ');

    const title = document.createElement('span');
    title.className = 'truncate';
    title.textContent = arg.event.title;
    wrapper.append(title);

    return { domNodes: [wrapper] };
  };

  onMount(() => {
    if (!calendarHostRef) return;

    calendarApi = new Calendar(calendarHostRef, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
      locale: esLocale,
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek',
      },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        list: 'Agenda',
      },
      views: {
        listWeek: {
          buttonText: 'Agenda',
        },
      },
      height: 'auto',
      dayMaxEvents: true,
      editable: false,
      selectable: false,
      events: [],
      eventContent: renderEventContent,
      eventClick: (arg: EventClickArg) => {
        setPreviewEventId(arg.event.id);
      },
      datesSet: (arg) => {
        const nextRange = {
          start: arg.start.toISOString(),
          end: arg.end.toISOString(),
        };

        const current = visibleRange();
        if (current.start !== nextRange.start || current.end !== nextRange.end) {
          setVisibleRange(nextRange);
        }
      },
    });

    calendarApi.render();
  });

  onCleanup(() => {
    calendarApi?.destroy();
    calendarApi = null;
  });

  createEffect(() => {
    const events = fullCalendarEvents();
    calendarApi?.setOption('events', events);
  });

  return (
    <section class="min-h-screen bg-yellow-50 p-4 text-gray-800 sm:p-6 md:p-8">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 class="text-2xl font-semibold">Eventos</h1>
            <p class="mt-1 text-sm text-gray-600">Calendario de eventos de la institución.</p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/')}
          >
            Volver
          </button>
        </div>

        <Show when={calendarLoadError()}>
          <div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los eventos: {calendarLoadError()}
          </div>
        </Show>

        <div ref={calendarHostRef} />

        <EventPreviewModal
          event={previewEvent()}
          onClose={() => setPreviewEventId(null)}
        />
      </div>
    </section>
  );
}
