import { Show, type JSX } from 'solid-js';
import type { CalendarItemRecord } from '../lib/types/calendar';
import Modal from './Modal';

type EventPreviewModalProps = {
  event: CalendarItemRecord | null;
  onClose: () => void;
  footer?: JSX.Element;
};

export function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(parsed);
}

export default function EventPreviewModal(props: EventPreviewModalProps) {
  const defaultFooter = (
    <div class="mt-6 flex shrink-0 justify-end">
      <button
        type="button"
        class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
        onClick={props.onClose}
      >
        Cerrar
      </button>
    </div>
  );

  return (
    <Modal
      open={Boolean(props.event)}
      title={props.event?.title ?? 'Detalle del elemento'}
      confirmLabel="Cerrar"
      footer={props.footer ?? defaultFooter}
      onConfirm={props.onClose}
      onClose={props.onClose}
    >
      <Show when={props.event}>
        {(event) => (
          <div class="space-y-4 text-sm text-gray-700">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-yellow-700">Tipo</p>
                <p class="mt-1 font-medium text-gray-900">
                  {event().kind === 'task' ? 'Tarea' : 'Evento'}
                </p>
              </div>

              <div class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-yellow-700">Estado</p>
                <p class="mt-1 font-medium text-gray-900">
                  {event().status === 'planned' ? 'Planificado' : event().status === 'done' ? 'Realizado' : 'Cancelado'}
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-gray-200 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-gray-500">Horario</p>
              <p class="mt-1 font-medium text-gray-900">
                {event().isAllDay
                  ? `${formatDate(event().startDateTime)} (todo el día)`
                  : `${formatDateTime(event().startDateTime)} - ${formatDateTime(event().endDateTime)}`}
              </p>
            </div>

            <div class="rounded-xl border border-gray-200 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-gray-500">Responsables</p>
              <p class="mt-1 text-gray-900">
                {event().assigneeNames.length > 0 ? event().assigneeNames.join(', ') : 'Sin responsables'}
              </p>
            </div>

            <div class="rounded-xl border border-gray-200 px-4 py-3">
              <p class="text-xs uppercase tracking-wide text-gray-500">Descripción</p>
              <p class="mt-1 whitespace-pre-wrap text-gray-900">
                {event().description || 'Sin descripción.'}
              </p>
            </div>
          </div>
        )}
      </Show>
    </Modal>
  );
}
