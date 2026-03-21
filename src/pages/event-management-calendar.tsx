import '@fullcalendar/web-component/global';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import {
  type CalendarOptions,
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
  For,
  Show,
} from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import Modal from '../components/Modal';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  listEventAssignmentsByEventIds,
  deleteEventAssignmentsByEventId,
  syncEventAssignments,
  type EventAssignmentRecord,
} from '../lib/pocketbase/event-assignments';
import {
  CALENDAR_EVENT_KINDS,
  CALENDAR_EVENT_STATUSES,
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEventsInRange,
  updateCalendarEvent,
  type CalendarEventKind,
  type CalendarEventRecord,
  type CalendarEventStatus,
} from '../lib/pocketbase/events';
import { listActiveEmployees, type EmployeeRecord } from '../lib/pocketbase/employees';

type FullCalendarElementApi = HTMLElement & {
  options: CalendarOptions | null;
};

type CalendarRange = {
  start: string;
  end: string;
};

type CalendarItemRecord = CalendarEventRecord & {
  assignees: EventAssignmentRecord[];
  assigneeNames: string[];
};

type EventForm = {
  title: string;
  description: string;
  kind: CalendarEventKind;
  status: CalendarEventStatus;
  isAllDay: boolean;
  startValue: string;
  endValue: string;
  assigneeIds: string[];
};

const EVENT_FORM_FIELDS = [
  'title',
  'startValue',
  'endValue',
  'kind',
  'status',
  'assigneeIds',
] as const;

type EventFormField = (typeof EVENT_FORM_FIELDS)[number];

const emptyEventForm: EventForm = {
  title: '',
  description: '',
  kind: 'event',
  status: 'planned',
  isAllDay: false,
  startValue: '',
  endValue: '',
  assigneeIds: [],
};

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateForInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeLocalForInput(date: Date): string {
  return `${formatDateForInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + amount,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateTimeLocalForInput(parsed);
}

function toDateValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateForInput(parsed);
}

function toAllDayEndDateValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return formatDateForInput(addDays(parsed, -1));
}

function toIsoFromDateTimeLocal(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function toAllDayStartIso(value: string): string {
  const parsed = new Date(`${value}T00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function toAllDayEndIso(value: string): string {
  const parsed = new Date(`${value}T00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : addDays(parsed, 1).toISOString();
}

function getDefaultRange(): CalendarRange {
  const now = new Date();
  return {
    start: startOfMonth(now).toISOString(),
    end: addMonths(startOfMonth(now), 1).toISOString(),
  };
}

function buildDateClickPrefill(arg: DateClickArg): Pick<EventForm, 'isAllDay' | 'startValue' | 'endValue'> {
  if (arg.allDay) {
    const selectedDate = formatDateForInput(arg.date);
    return {
      isAllDay: true,
      startValue: selectedDate,
      endValue: selectedDate,
    };
  }

  const start = new Date(arg.date);
  const end = new Date(arg.date.getTime() + (60 * 60 * 1000));

  return {
    isAllDay: false,
    startValue: formatDateTimeLocalForInput(start),
    endValue: formatDateTimeLocalForInput(end),
  };
}

function buildPayload(form: EventForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    kind: form.kind,
    status: form.status,
    isAllDay: form.isAllDay,
    startDateTime: form.isAllDay ? toAllDayStartIso(form.startValue) : toIsoFromDateTimeLocal(form.startValue),
    endDateTime: form.isAllDay ? toAllDayEndIso(form.endValue) : toIsoFromDateTimeLocal(form.endValue),
  };
}

function validateEventForm(form: EventForm): FieldErrorMap<EventFormField> {
  const errors: FieldErrorMap<EventFormField> = {};

  if (form.title.trim().length < 3) {
    errors.title = 'El título debe tener al menos 3 caracteres.';
  }

  if (form.kind !== 'event' && form.kind !== 'task') {
    errors.kind = 'Selecciona un tipo válido.';
  }

  if (!CALENDAR_EVENT_STATUSES.includes(form.status)) {
    errors.status = 'Selecciona un estado válido.';
  }

  if (!form.startValue.trim()) {
    errors.startValue = form.isAllDay ? 'La fecha de inicio es obligatoria.' : 'La fecha y hora de inicio es obligatoria.';
  }

  if (!form.endValue.trim()) {
    errors.endValue = form.isAllDay ? 'La fecha de fin es obligatoria.' : 'La fecha y hora de fin es obligatoria.';
  }

  if (!errors.startValue && !errors.endValue) {
    if (form.isAllDay) {
      const start = new Date(`${form.startValue}T00:00`);
      const end = new Date(`${form.endValue}T00:00`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        errors.startValue = 'Debes seleccionar fechas válidas.';
      } else if (end.getTime() < start.getTime()) {
        errors.endValue = 'La fecha final no puede ser anterior a la fecha inicial.';
      }
    } else {
      const start = new Date(form.startValue);
      const end = new Date(form.endValue);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        errors.startValue = 'Debes seleccionar fechas y horas válidas.';
      } else if (end.getTime() <= start.getTime()) {
        errors.endValue = 'La fecha y hora final debe ser posterior a la inicial.';
      }
    }
  }

  if (form.kind === 'task' && form.assigneeIds.length === 0) {
    errors.assigneeIds = 'Selecciona al menos un responsable para la tarea.';
  }

  return errors;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(parsed);
}

function buildTooltip(item: CalendarItemRecord): string {
  const assignees = item.assigneeNames.length > 0 ? item.assigneeNames.join(', ') : 'Sin responsables';
  const timeLabel = item.isAllDay
    ? `Todo el día: ${formatDate(item.startDateTime)}`
    : `${formatDateTime(item.startDateTime)} - ${formatDateTime(item.endDateTime)}`;

  return [
    item.title,
    timeLabel,
    `Tipo: ${item.kind === 'task' ? 'Tarea' : 'Evento'}`,
    `Estado: ${item.status === 'planned' ? 'Planificado' : item.status === 'done' ? 'Realizado' : 'Cancelado'}`,
    `Responsables: ${assignees}`,
  ].join('\n');
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

export default function EventManagementCalendarPage() {
  const navigate = useNavigate();
  let calendarRef: FullCalendarElementApi | undefined;

  const [visibleRange, setVisibleRange] = createSignal<CalendarRange>(getDefaultRange());
  const [actionError, setActionError] = createSignal<string | null>(null);

  const [formOpen, setFormOpen] = createSignal(false);
  const [formBusy, setFormBusy] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);
  const [eventForm, setEventForm] = createSignal<EventForm>(emptyEventForm);
  const [eventTouched, setEventTouched] = createSignal(createInitialTouchedMap(EVENT_FORM_FIELDS));
  const [editingEventId, setEditingEventId] = createSignal<string | null>(null);

  const [previewEventId, setPreviewEventId] = createSignal<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = createSignal<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = createSignal(false);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  const [calendarItems, { refetch: refetchCalendarItems }] = createResource(
    visibleRange,
    loadCalendarItems,
  );
  const [employees] = createResource(
    () => (isAuthUserAdmin() ? true : undefined),
    () => listActiveEmployees(),
  );

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/event-management', { replace: true });
    }
  });

  const eventFieldErrors = createMemo(() => validateEventForm(eventForm()));
  const eventItemsById = createMemo(
    () => new Map((calendarItems() ?? []).map((item) => [item.id, item])),
  );
  const editingEvent = createMemo(() => {
    const editingId = editingEventId();
    return editingId ? eventItemsById().get(editingId) ?? null : null;
  });
  const previewEvent = createMemo(() => {
    const previewId = previewEventId();
    return previewId ? eventItemsById().get(previewId) ?? null : null;
  });
  const deleteTarget = createMemo(() => {
    const targetId = deleteTargetId();
    return targetId ? eventItemsById().get(targetId) ?? null : null;
  });

  const fullCalendarEvents = createMemo<EventInput[]>(() => (
    (calendarItems() ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      start: item.startDateTime,
      end: item.endDateTime,
      allDay: item.isAllDay,
      extendedProps: {
        kind: item.kind,
        status: item.status,
        assigneeNames: item.assigneeNames,
        tooltip: buildTooltip(item),
      },
    }))
  ));

  const employeeOptions = createMemo(() => employees() ?? []);

  const titleError = () => (eventTouched().title ? eventFieldErrors().title : undefined);
  const startValueError = () => (eventTouched().startValue ? eventFieldErrors().startValue : undefined);
  const endValueError = () => (eventTouched().endValue ? eventFieldErrors().endValue : undefined);
  const assigneeIdsError = () => (eventTouched().assigneeIds ? eventFieldErrors().assigneeIds : undefined);

  const closeFormModal = (force = false) => {
    if (formBusy() && !force) return;

    setFormOpen(false);
    setEditingEventId(null);
    setEventForm(emptyEventForm);
    setEventTouched(createInitialTouchedMap(EVENT_FORM_FIELDS));
    setFormError(null);
  };

  const openCreateModal = (prefill?: Partial<EventForm>) => {
    setPreviewEventId(null);
    setEditingEventId(null);
    setFormOpen(true);
    setFormError(null);
    setEventTouched(createInitialTouchedMap(EVENT_FORM_FIELDS));
    setEventForm({
      ...emptyEventForm,
      ...prefill,
    });
  };

  const openEditModal = (item: CalendarItemRecord) => {
    setPreviewEventId(null);
    setEditingEventId(item.id);
    setFormOpen(true);
    setFormError(null);
    setEventTouched(createInitialTouchedMap(EVENT_FORM_FIELDS));
    setEventForm({
      title: item.title,
      description: item.description,
      kind: item.kind,
      status: item.status,
      isAllDay: item.isAllDay,
      startValue: item.isAllDay ? toDateValue(item.startDateTime) : toDateTimeLocalValue(item.startDateTime),
      endValue: item.isAllDay ? toAllDayEndDateValue(item.endDateTime) : toDateTimeLocalValue(item.endDateTime),
      assigneeIds: item.assignees.map((assignee) => assignee.employeeId),
    });
  };

  const openDeleteConfirm = () => {
    const current = previewEvent();
    if (!current) return;

    setDeleteTargetId(current.id);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteBusy()) return;

    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const setEventField = <TField extends keyof EventForm>(field: TField, value: EventForm[TField]) => {
    setEventForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'title' || field === 'startValue' || field === 'endValue' || field === 'kind' || field === 'status') {
      setEventTouched((current) => touchField(current, field as EventFormField));
    }

    setFormError(null);
  };

  const toggleAssignee = (employeeId: string) => {
    setEventForm((current) => {
      const selected = current.assigneeIds.includes(employeeId)
        ? current.assigneeIds.filter((value) => value !== employeeId)
        : [...current.assigneeIds, employeeId];

      return {
        ...current,
        assigneeIds: selected,
      };
    });
    setEventTouched((current) => touchField(current, 'assigneeIds'));
    setFormError(null);
  };

  const toggleAllDay = (checked: boolean) => {
    setEventForm((current) => {
      if (checked) {
        const nextStart = current.startValue ? current.startValue.slice(0, 10) : formatDateForInput(new Date());
        const nextEnd = current.endValue ? current.endValue.slice(0, 10) : nextStart;

        return {
          ...current,
          isAllDay: true,
          startValue: nextStart,
          endValue: nextEnd,
        };
      }

      const nextStartDate = current.startValue || formatDateForInput(new Date());
      const nextEndDate = current.endValue || nextStartDate;

      return {
        ...current,
        isAllDay: false,
        startValue: `${nextStartDate}T08:00`,
        endValue: `${nextEndDate}T09:00`,
      };
    });

    setEventTouched((current) => ({
      ...current,
      startValue: true,
      endValue: true,
    }));
    setFormError(null);
  };

  const submitEventForm = async () => {
    const touched = touchAllFields(eventTouched());
    setEventTouched(touched);
    if (hasAnyError(eventFieldErrors())) return;

    const payload = buildPayload(eventForm());
    setFormBusy(true);
    setFormError(null);
    setActionError(null);

    try {
      if (editingEventId()) {
        await updateCalendarEvent(editingEventId()!, payload);
        await syncEventAssignments(
          editingEventId()!,
          eventForm().kind === 'task' ? eventForm().assigneeIds : [],
        );
      } else {
        const created = await createCalendarEvent(payload);
        await syncEventAssignments(
          created.id,
          eventForm().kind === 'task' ? eventForm().assigneeIds : [],
        );
      }

      closeFormModal(true);
      try {
        await refetchCalendarItems();
      } catch (error) {
        setActionError(getErrorMessage(error));
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setFormBusy(false);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) {
      closeDeleteConfirm();
      return;
    }

    setDeleteBusy(true);
    setActionError(null);

    try {
      await deleteEventAssignmentsByEventId(target.id);
      await deleteCalendarEvent(target.id);
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      setPreviewEventId(null);
      try {
        await refetchCalendarItems();
      } catch (error) {
        setActionError(getErrorMessage(error));
      }
    } catch (error) {
      setActionError(getErrorMessage(error));
      setDeleteConfirmOpen(false);
    } finally {
      setDeleteBusy(false);
    }
  };

  const renderEventContent = (arg: EventContentArg) => {
    const item = eventItemsById().get(arg.event.id);
    const wrapper = document.createElement('div');
    wrapper.className = [
      'flex min-w-0 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium shadow-sm',
      item?.kind === 'task'
        ? 'border-blue-300 bg-blue-50 text-blue-900'
        : 'border-emerald-300 bg-emerald-50 text-emerald-900',
    ].join(' ');

    const title = document.createElement('span');
    title.className = 'truncate';
    title.textContent = arg.event.title;
    wrapper.append(title);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/80 bg-white/80 text-gray-700 transition-colors hover:bg-white';
    button.setAttribute('aria-label', `Editar ${arg.event.title}`);
    button.innerHTML = '<i class="bi bi-pencil-square" aria-hidden="true"></i>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const record = eventItemsById().get(arg.event.id);
      if (record) {
        openEditModal(record);
      }
    });
    wrapper.append(button);

    return { domNodes: [wrapper] };
  };

  createEffect(() => {
    if (!calendarRef) return;

    calendarRef.options = {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
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
      events: fullCalendarEvents(),
      eventContent: renderEventContent,
      eventDidMount: (arg) => {
        const tooltip = typeof arg.event.extendedProps.tooltip === 'string'
          ? arg.event.extendedProps.tooltip
          : '';

        if (tooltip) {
          arg.el.setAttribute('title', tooltip);
        }
      },
      eventClick: (arg: EventClickArg) => {
        setPreviewEventId(arg.event.id);
      },
      dateClick: (arg: DateClickArg) => {
        openCreateModal({
          kind: 'event',
          status: 'planned',
          assigneeIds: [],
          ...buildDateClickPrefill(arg),
        });
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
    };
  });

  return (
    <section class="min-h-screen bg-yellow-50 p-4 text-gray-800 sm:p-6 md:p-8">
      <div class="mx-auto max-w-7xl rounded-[1.75rem] border border-yellow-300 bg-white p-4 shadow-sm sm:p-6">
        <div class="flex flex-col gap-4 border-b border-yellow-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-700">
              Gestión de eventos
            </p>
            <h1 class="mt-2 text-2xl font-semibold sm:text-3xl">Calendario institucional</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Organiza eventos y tareas administrativas en una sola vista. Las tareas pueden
              asignarse a varios empleados y el botón de lápiz abre la edición en cualquier
              dispositivo.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-500 bg-yellow-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-yellow-200"
              onClick={() => openCreateModal()}
            >
              <i class="bi bi-plus-circle" aria-hidden="true"></i>
              Nuevo evento o tarea
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => navigate('/event-management')}
            >
              Volver al módulo
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-3 rounded-2xl bg-yellow-50/80 p-4 text-sm text-gray-700 md:grid-cols-3">
          <div class="rounded-2xl border border-blue-200 bg-white px-4 py-3">
            <p class="font-medium text-blue-900">Tareas</p>
            <p class="mt-1 text-xs text-gray-600">
              Se muestran con tono azul y permiten responsables múltiples.
            </p>
          </div>
          <div class="rounded-2xl border border-emerald-200 bg-white px-4 py-3">
            <p class="font-medium text-emerald-900">Eventos</p>
            <p class="mt-1 text-xs text-gray-600">
              Pueden existir sin responsables cuando son informativos.
            </p>
          </div>
          <div class="rounded-2xl border border-yellow-200 bg-white px-4 py-3">
            <p class="font-medium text-yellow-900">Interacciones</p>
            <p class="mt-1 text-xs text-gray-600">
              Haz clic en un día para crear, pulsa el evento para ver detalles y usa el lápiz para editar.
            </p>
          </div>
        </div>

        <Show when={actionError()}>
          <div class="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError()}
          </div>
        </Show>

        <Show when={calendarItems.error}>
          <div class="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getErrorMessage(calendarItems.error)}
          </div>
        </Show>

        <div class="mt-5 overflow-hidden rounded-[1.5rem] border border-yellow-200">
          <div class="border-b border-yellow-200 bg-yellow-100 px-4 py-3 text-sm text-yellow-900">
            <Show when={calendarItems.loading} fallback="Vista de calendario lista.">
              Cargando eventos del rango visible...
            </Show>
          </div>

          <div class="event-management-calendar-shell bg-white p-3 sm:p-4">
            <full-calendar ref={calendarRef} />
          </div>
        </div>
      </div>

      <Modal
        open={formOpen()}
        title={editingEvent() ? 'Editar elemento del calendario' : 'Nuevo elemento del calendario'}
        description="Completa los datos básicos, define si es evento o tarea y asigna responsables cuando aplique."
        confirmLabel={editingEvent() ? 'Guardar cambios' : 'Crear elemento'}
        cancelLabel="Cancelar"
        busy={formBusy()}
        size="xl"
        onConfirm={submitEventForm}
        onClose={closeFormModal}
      >
        <div class="space-y-5">
          <Show when={formError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError()}
            </div>
          </Show>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block md:col-span-2">
              <span class="text-sm font-medium text-gray-700">Título</span>
              <input
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                classList={{ 'field-input-invalid': Boolean(titleError()) }}
                type="text"
                value={eventForm().title}
                onInput={(event) => setEventField('title', event.currentTarget.value)}
              />
              <InlineFieldAlert when={Boolean(titleError())}>{titleError()}</InlineFieldAlert>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Tipo</span>
              <select
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                value={eventForm().kind}
                onChange={(event) => setEventField('kind', event.currentTarget.value as CalendarEventKind)}
              >
                <For each={CALENDAR_EVENT_KINDS}>
                  {(kind) => (
                    <option value={kind}>
                      {kind === 'task' ? 'Tarea' : 'Evento'}
                    </option>
                  )}
                </For>
              </select>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">Estado</span>
              <select
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                value={eventForm().status}
                onChange={(event) => setEventField('status', event.currentTarget.value as CalendarEventStatus)}
              >
                <For each={CALENDAR_EVENT_STATUSES}>
                  {(status) => (
                    <option value={status}>
                      {status === 'planned' ? 'Planificado' : status === 'done' ? 'Realizado' : 'Cancelado'}
                    </option>
                  )}
                </For>
              </select>
            </label>

            <label class="block md:col-span-2">
              <span class="text-sm font-medium text-gray-700">Descripción</span>
              <textarea
                class="mt-1 min-h-28 w-full rounded-xl border border-gray-300 px-3 py-2"
                value={eventForm().description}
                onInput={(event) => setEventField('description', event.currentTarget.value)}
              />
            </label>
          </div>

          <label class="inline-flex items-center gap-2 rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={eventForm().isAllDay}
              onChange={(event) => toggleAllDay(event.currentTarget.checked)}
            />
            Todo el día
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="block">
              <span class="text-sm font-medium text-gray-700">
                {eventForm().isAllDay ? 'Fecha inicial' : 'Inicio'}
              </span>
              <input
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                classList={{ 'field-input-invalid': Boolean(startValueError()) }}
                type={eventForm().isAllDay ? 'date' : 'datetime-local'}
                value={eventForm().startValue}
                onInput={(event) => setEventField('startValue', event.currentTarget.value)}
              />
              <InlineFieldAlert when={Boolean(startValueError())}>{startValueError()}</InlineFieldAlert>
            </label>

            <label class="block">
              <span class="text-sm font-medium text-gray-700">
                {eventForm().isAllDay ? 'Fecha final' : 'Fin'}
              </span>
              <input
                class="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
                classList={{ 'field-input-invalid': Boolean(endValueError()) }}
                type={eventForm().isAllDay ? 'date' : 'datetime-local'}
                value={eventForm().endValue}
                onInput={(event) => setEventField('endValue', event.currentTarget.value)}
              />
              <InlineFieldAlert when={Boolean(endValueError())}>{endValueError()}</InlineFieldAlert>
            </label>
          </div>

          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-medium text-gray-900">Responsables</h3>
                <p class="mt-1 text-xs text-gray-600">
                  Obligatorio para tareas. Los eventos informativos pueden quedar sin responsables.
                </p>
              </div>
              <Show when={eventForm().kind === 'task'}>
                <span class="rounded-full border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
                  Requerido
                </span>
              </Show>
            </div>

            <div class="mt-4 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              <For each={employeeOptions()}>
                {(employee: EmployeeRecord) => (
                  <label class="flex items-start gap-3 rounded-xl border border-white bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={eventForm().assigneeIds.includes(employee.id)}
                      onChange={() => toggleAssignee(employee.id)}
                    />
                    <span>
                      <span class="block font-medium text-gray-900">{employee.name}</span>
                      <span class="text-xs text-gray-500">{employee.jobName || 'Sin cargo'}</span>
                    </span>
                  </label>
                )}
              </For>
            </div>

            <Show when={employeeOptions().length === 0}>
              <p class="mt-4 text-sm text-gray-500">
                No hay empleados activos disponibles para asignar.
              </p>
            </Show>

            <InlineFieldAlert when={Boolean(assigneeIdsError())}>{assigneeIdsError()}</InlineFieldAlert>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(previewEvent())}
        title={previewEvent()?.title ?? 'Detalle del elemento'}
        description="Revisa la información principal antes de editar."
        confirmLabel="Editar"
        cancelLabel="Cerrar"
        footer={(
          <div class="mt-6 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deleteBusy()}
              onClick={openDeleteConfirm}
            >
              <i class="bi bi-trash" aria-hidden="true"></i>
              Eliminar
            </button>

            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteBusy()}
                onClick={() => setPreviewEventId(null)}
              >
                Cerrar
              </button>
              <button
                type="button"
                class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteBusy()}
                onClick={() => {
                  const current = previewEvent();
                  if (!current) return;
                  openEditModal(current);
                }}
              >
                Editar
              </button>
            </div>
          </div>
        )}
        onConfirm={() => {
          const current = previewEvent();
          if (!current) return;
          openEditModal(current);
        }}
        onClose={() => setPreviewEventId(null)}
      >
        <Show when={previewEvent()}>
          {(item) => (
            <div class="space-y-4 text-sm text-gray-700">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p class="text-xs uppercase tracking-wide text-yellow-700">Tipo</p>
                  <p class="mt-1 font-medium text-gray-900">
                    {item().kind === 'task' ? 'Tarea' : 'Evento'}
                  </p>
                </div>

                <div class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p class="text-xs uppercase tracking-wide text-yellow-700">Estado</p>
                  <p class="mt-1 font-medium text-gray-900">
                    {item().status === 'planned' ? 'Planificado' : item().status === 'done' ? 'Realizado' : 'Cancelado'}
                  </p>
                </div>
              </div>

              <div class="rounded-xl border border-gray-200 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-gray-500">Horario</p>
                <p class="mt-1 font-medium text-gray-900">
                  {item().isAllDay
                    ? `${formatDate(item().startDateTime)} (todo el día)`
                    : `${formatDateTime(item().startDateTime)} - ${formatDateTime(item().endDateTime)}`}
                </p>
              </div>

              <div class="rounded-xl border border-gray-200 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-gray-500">Responsables</p>
                <p class="mt-1 text-gray-900">
                  {item().assigneeNames.length > 0 ? item().assigneeNames.join(', ') : 'Sin responsables'}
                </p>
              </div>

              <div class="rounded-xl border border-gray-200 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-gray-500">Descripción</p>
                <p class="mt-1 whitespace-pre-wrap text-gray-900">
                  {item().description || 'Sin descripción.'}
                </p>
              </div>
            </div>
          )}
        </Show>
      </Modal>

      <Modal
        open={deleteConfirmOpen()}
        title="Eliminar elemento"
        description="Esta acción eliminará permanentemente el elemento del calendario y quitará sus responsables asignados."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={deleteBusy()}
        onConfirm={confirmDelete}
        onClose={closeDeleteConfirm}
      >
        <p class="text-sm text-gray-700">
          {deleteTarget()
            ? `Confirma que deseas eliminar "${deleteTarget()!.title}".`
            : 'Confirma la eliminación del elemento seleccionado.'}
        </p>
      </Modal>
    </section>
  );
}
