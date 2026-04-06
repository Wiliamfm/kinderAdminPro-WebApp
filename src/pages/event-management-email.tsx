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
import {
  buildEmailPreviewHtml,
  type EmailRecipientSourceKind,
  type ResolvedEmailRecipient,
} from '../lib/event-email-messaging';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import { canAccessModule } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  listEmailMessageRecipients,
  listEmailMessages,
  resolveEmployeeRecipients,
  resolveFatherRecipients,
  sendEventEmail,
  type EmailMessageRecord,
  type EmailMessageRecipientRecord,
} from '../lib/pocketbase/event-email-messaging';
import { listActiveEmployees, type EmployeeRecord } from '../lib/pocketbase/employees';
import { listGrades, type GradeRecord } from '../lib/pocketbase/grades';
import { listActiveStudents, type StudentRecord } from '../lib/pocketbase/students';

type ComposeForm = {
  subject: string;
  bodyText: string;
};

type ComposeField = keyof ComposeForm;

const COMPOSE_FIELDS = ['subject', 'bodyText'] as const;
const emptyComposeForm: ComposeForm = {
  subject: '',
  bodyText: '',
};

type FilterOptions = {
  employees: EmployeeRecord[];
  students: StudentRecord[];
  grades: GradeRecord[];
};

const emptyFilterOptions: FilterOptions = {
  employees: [],
  students: [],
  grades: [],
};

const GENERIC_EMAIL_MESSAGING_LOAD_MESSAGE = 'La mensajería no está disponible en este momento.';
const GENERIC_EMAIL_MESSAGING_SEND_MESSAGE = 'No se pudo enviar el correo en este momento. Intenta de nuevo.';

function isNotFoundError(error: unknown): boolean {
  const normalized = error as PocketBaseRequestError | undefined;
  return normalized?.status === 404;
}

function logEmailMessagingError(context: string, error: unknown): void {
  console.error(`[event-email-messaging] ${context}`, error);
}

function formatText(value: string): string {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : '—';
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function readSelectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions)
    .map((option) => option.value.trim())
    .filter((value) => value.length > 0);
}

function validateComposeForm(
  form: ComposeForm,
): FieldErrorMap<ComposeField> {
  const errors: FieldErrorMap<ComposeField> = {};

  if (form.subject.trim().length < 3) {
    errors.subject = 'El asunto debe tener al menos 3 caracteres.';
  }

  if (form.bodyText.trim().length === 0) {
    errors.bodyText = 'El cuerpo del correo es obligatorio.';
  }

  return errors;
}

function formatSourceLabel(recipient: ResolvedEmailRecipient): string {
  if (recipient.sources.length === 0) {
    return recipient.recipientType === 'employee' ? 'Empleado' : 'Padre / tutor';
  }

  return recipient.sources
    .map((source) => (
      source.kind === 'employee'
        ? 'Empleado'
        : source.kind === 'student'
          ? `Estudiante: ${source.label}`
          : `Grado: ${source.label}`
    ))
    .join(' · ');
}

function includesSourceKind(
  recipient: ResolvedEmailRecipient,
  sourceKind: EmailRecipientSourceKind,
): boolean {
  return recipient.sources.some((source) => source.kind === sourceKind);
}

function getHistoryRecipientMessage(recipient: EmailMessageRecipientRecord): string | null {
  if (recipient.status === 'missing_email') {
    return 'El destinatario no tiene correo registrado.';
  }

  if (recipient.status === 'failed') {
    return 'No se pudo entregar el correo.';
  }

  if (recipient.status === 'skipped') {
    return 'El destinatario no estuvo disponible al momento del envío.';
  }

  if (recipient.errorMessage.trim().length > 0) {
    return 'No se pudo completar la operación para este destinatario.';
  }

  return null;
}

export default function EventManagementEmailPage() {
  const navigate = useNavigate();
  const [employeeIds, setEmployeeIds] = createSignal<string[]>([]);
  const [studentIds, setStudentIds] = createSignal<string[]>([]);
  const [gradeIds, setGradeIds] = createSignal<string[]>([]);
  const [selectedRecipientKeys, setSelectedRecipientKeys] = createSignal<string[]>([]);
  const [composeForm, setComposeForm] = createSignal<ComposeForm>(emptyComposeForm);
  const [composeTouched, setComposeTouched] = createSignal(
    createInitialTouchedMap(COMPOSE_FIELDS),
  );
  const [submitError, setSubmitError] = createSignal<string | null>(null);
  const [submitNotice, setSubmitNotice] = createSignal<string | null>(null);
  const [sendBusy, setSendBusy] = createSignal(false);
  const [historySelectionId, setHistorySelectionId] = createSignal<string | null>(null);
  const [backendSetupNotice, setBackendSetupNotice] = createSignal<string | null>(null);

  const [filterOptions] = createResource(async (): Promise<FilterOptions> => {
    if (!canAccessModule('events')) return emptyFilterOptions;

    const [employees, students, grades] = await Promise.all([
      listActiveEmployees(),
      listActiveStudents({ includeFatherNames: false }),
      listGrades(),
    ]);

    return { employees, students, grades };
  });

  const [messageHistory, { refetch: refetchHistory }] = createResource(async (): Promise<EmailMessageRecord[]> => {
    if (!canAccessModule('events')) return [];

    try {
      const history = await listEmailMessages();
      setBackendSetupNotice(null);
      return history;
    } catch (error) {
      logEmailMessagingError('load history failed', error);

      if (isNotFoundError(error)) {
        setBackendSetupNotice(GENERIC_EMAIL_MESSAGING_LOAD_MESSAGE);
        return [];
      }

      setBackendSetupNotice(GENERIC_EMAIL_MESSAGING_LOAD_MESSAGE);
      return [];
    }
  });

  const [historyRecipients] = createResource(historySelectionId, async (messageId) => {
    if (!messageId) return [];

    try {
      return await listEmailMessageRecipients(messageId);
    } catch (error) {
      logEmailMessagingError('load history recipients failed', error);

      if (isNotFoundError(error)) {
        setBackendSetupNotice(GENERIC_EMAIL_MESSAGING_LOAD_MESSAGE);
        return [];
      }

      setBackendSetupNotice(GENERIC_EMAIL_MESSAGING_LOAD_MESSAGE);
      return [];
    }
  });

  const [resolvedRecipients, { refetch: refetchRecipients }] = createResource(
    () => ({
      employeeIds: employeeIds(),
      studentIds: studentIds(),
      gradeIds: gradeIds(),
    }),
    async (filters): Promise<ResolvedEmailRecipient[]> => {
      if (!canAccessModule('events')) return [];

      const [employeeRecipients, fatherRecipients] = await Promise.all([
        resolveEmployeeRecipients(filters.employeeIds),
        resolveFatherRecipients({
          studentIds: filters.studentIds,
          gradeIds: filters.gradeIds,
        }),
      ]);

      return [...employeeRecipients, ...fatherRecipients];
    },
  );

  createEffect(() => {
    if (!canAccessModule('events')) {
      navigate('/event-management', { replace: true });
    }
  });

  createEffect(() => {
    const history = messageHistory();
    if (!history || history.length === 0) return;
    if (historySelectionId()) return;
    setHistorySelectionId(history[0].id);
  });

  createEffect(() => {
    if (backendSetupNotice()) {
      setHistorySelectionId(null);
    }
  });

  createEffect(() => {
    const recipients = resolvedRecipients() ?? [];
    const validKeys = new Set(recipients.map((recipient) => recipient.key));
    setSelectedRecipientKeys((current) => current.filter((key) => validKeys.has(key)));
  });

  const composeErrors = createMemo(() => validateComposeForm(composeForm()));
  const subjectError = createMemo(() => (
    composeTouched().subject ? composeErrors().subject : undefined
  ));
  const bodyTextError = createMemo(() => (
    composeTouched().bodyText ? composeErrors().bodyText : undefined
  ));

  const selectedRecipients = createMemo(() => {
    const selectedKeys = new Set(selectedRecipientKeys());
    return (resolvedRecipients() ?? []).filter((recipient) => selectedKeys.has(recipient.key));
  });

  const selectedSendableRecipients = createMemo(() => (
    selectedRecipients().filter((recipient) => recipient.hasEmail)
  ));

  const resolvedMissingEmailRecipients = createMemo(() => (
    (resolvedRecipients() ?? []).filter((recipient) => !recipient.hasEmail)
  ));

  const recipientCountBySource = createMemo(() => {
    const recipients = resolvedRecipients() ?? [];
    return {
      employee: recipients.filter((recipient) => includesSourceKind(recipient, 'employee')).length,
      student: recipients.filter((recipient) => includesSourceKind(recipient, 'student')).length,
      grade: recipients.filter((recipient) => includesSourceKind(recipient, 'grade')).length,
    };
  });

  const previewHtml = createMemo(() => buildEmailPreviewHtml(composeForm().bodyText));

  const setComposeField = <K extends ComposeField>(field: K, value: ComposeForm[K]) => {
    setComposeForm((current) => ({
      ...current,
      [field]: value,
    }));
    setComposeTouched((current) => touchField(current, field));
  };

  const toggleRecipientSelection = (recipientKey: string) => {
    setSelectedRecipientKeys((current) => (
      current.includes(recipientKey)
        ? current.filter((value) => value !== recipientKey)
        : [...current, recipientKey]
    ));
  };

  const selectRecipientsBySource = (sourceKind: EmailRecipientSourceKind) => {
    const nextKeys = (resolvedRecipients() ?? [])
      .filter((recipient) => includesSourceKind(recipient, sourceKind))
      .map((recipient) => recipient.key);

    setSelectedRecipientKeys((current) => Array.from(new Set([...current, ...nextKeys])));
  };

  const clearSelection = () => {
    setSelectedRecipientKeys([]);
  };

  const handleSend = async () => {
    setComposeTouched((current) => touchAllFields(current));
    setSubmitError(null);
    setSubmitNotice(null);

    if (backendSetupNotice()) {
      setSubmitError(GENERIC_EMAIL_MESSAGING_SEND_MESSAGE);
      return;
    }

    if (hasAnyError(composeErrors())) {
      setSubmitError('Corrige el asunto y el cuerpo antes de enviar.');
      return;
    }

    if (selectedSendableRecipients().length === 0) {
      setSubmitError('Selecciona al menos un destinatario con correo disponible.');
      return;
    }

    setSendBusy(true);

    try {
      const summary = await sendEventEmail({
        subject: composeForm().subject,
        bodyText: composeForm().bodyText,
        recipients: selectedSendableRecipients(),
      });

      setSubmitNotice(
        `Envío registrado. Enviados: ${summary.totalSent}, fallidos: ${summary.totalFailed}, omitidos: ${summary.totalSkipped}, sin correo: ${summary.totalMissingEmail}.`,
      );
      setComposeForm(emptyComposeForm);
      setComposeTouched(createInitialTouchedMap(COMPOSE_FIELDS));
      clearSelection();
      await refetchHistory();
      await refetchRecipients();
      if (summary.messageId) {
        setHistorySelectionId(summary.messageId);
      }
    } catch (error) {
      logEmailMessagingError('send failed', error);

      if (isNotFoundError(error)) {
        setBackendSetupNotice(GENERIC_EMAIL_MESSAGING_LOAD_MESSAGE);
        setSubmitError(GENERIC_EMAIL_MESSAGING_SEND_MESSAGE);
      } else {
        setSubmitError(GENERIC_EMAIL_MESSAGING_SEND_MESSAGE);
      }
    } finally {
      setSendBusy(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 px-4 py-6 text-gray-800 sm:px-6 lg:px-8">
      <div class="mx-auto flex max-w-7xl flex-col gap-6">
        <header class="rounded-2xl border border-yellow-300 bg-white p-6 shadow-sm">
          <p class="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
            Gestión de eventos
          </p>
          <h1 class="mt-2 text-3xl font-semibold text-gray-900">Mensajería administrativa</h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Selecciona empleados y padres o tutores activos, revisa los destinatarios disponibles
            y envía el correo desde la ruta segura de PocketBase.
          </p>
        </header>

        <Show when={backendSetupNotice()}>
          {(notice) => (
            <div class="rounded-2xl border border-amber-300 bg-amber-100 px-5 py-4 text-sm text-amber-950">
              {notice()}
            </div>
          )}
        </Show>

        <Show when={!filterOptions.loading} fallback={<p class="text-sm text-gray-600">Cargando opciones…</p>}>
          <div class="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div class="space-y-6">
              <section class="rounded-2xl border border-yellow-300 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900">Filtros y destinatarios</h2>
                <p class="mt-2 text-sm text-gray-600">
                  Puedes mezclar empleados con padres o tutores filtrados por estudiante o por grado.
                </p>

                <div class="mt-6 grid gap-4 md:grid-cols-3">
                  <label class="block text-sm text-gray-700" for="event-email-employees">
                    Empleados
                    <select
                      id="event-email-employees"
                      multiple
                      size="7"
                      class="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setEmployeeIds(readSelectedValues(event.currentTarget))}
                    >
                      <For each={filterOptions()?.employees ?? []}>
                        {(employee) => (
                          <option value={employee.id}>
                            {employee.name} · {employee.documentId}
                          </option>
                        )}
                      </For>
                    </select>
                  </label>

                  <label class="block text-sm text-gray-700" for="event-email-students">
                    Estudiantes
                    <select
                      id="event-email-students"
                      multiple
                      size="7"
                      class="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setStudentIds(readSelectedValues(event.currentTarget))}
                    >
                      <For each={filterOptions()?.students ?? []}>
                        {(student) => (
                          <option value={student.id}>
                            {student.name} · {student.grade_name || student.grade_id}
                          </option>
                        )}
                      </For>
                    </select>
                  </label>

                  <label class="block text-sm text-gray-700" for="event-email-grades">
                    Grados
                    <select
                      id="event-email-grades"
                      multiple
                      size="7"
                      class="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                      onChange={(event) => setGradeIds(readSelectedValues(event.currentTarget))}
                    >
                      <For each={filterOptions()?.grades ?? []}>
                        {(grade) => (
                          <option value={grade.id}>
                            {grade.name}
                          </option>
                        )}
                      </For>
                    </select>
                  </label>
                </div>

                <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p class="text-xs uppercase tracking-wide text-amber-700">Resueltos</p>
                    <p class="mt-2 text-2xl font-semibold text-gray-900">{resolvedRecipients()?.length ?? 0}</p>
                  </div>
                  <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p class="text-xs uppercase tracking-wide text-amber-700">Seleccionados</p>
                    <p class="mt-2 text-2xl font-semibold text-gray-900">{selectedRecipients().length}</p>
                  </div>
                  <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p class="text-xs uppercase tracking-wide text-amber-700">Enviables</p>
                    <p class="mt-2 text-2xl font-semibold text-gray-900">{selectedSendableRecipients().length}</p>
                  </div>
                  <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p class="text-xs uppercase tracking-wide text-amber-700">Sin correo</p>
                    <p class="mt-2 text-2xl font-semibold text-gray-900">{resolvedMissingEmailRecipients().length}</p>
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
                    onClick={() => selectRecipientsBySource('employee')}
                    disabled={recipientCountBySource().employee === 0}
                  >
                    Seleccionar empleados ({recipientCountBySource().employee})
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
                    onClick={() => selectRecipientsBySource('student')}
                    disabled={recipientCountBySource().student === 0}
                  >
                    Seleccionar padres por estudiante ({recipientCountBySource().student})
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
                    onClick={() => selectRecipientsBySource('grade')}
                    disabled={recipientCountBySource().grade === 0}
                  >
                    Seleccionar padres por grado ({recipientCountBySource().grade})
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={clearSelection}
                    disabled={selectedRecipientKeys().length === 0}
                  >
                    Limpiar selección
                  </button>
                </div>

                <div class="mt-6 space-y-4">
                  <Show
                    when={!resolvedRecipients.loading}
                    fallback={<p class="text-sm text-gray-500">Resolviendo destinatarios…</p>}
                  >
                    <Show
                      when={(resolvedRecipients()?.length ?? 0) > 0}
                      fallback={<p class="text-sm text-gray-500">Selecciona filtros para resolver destinatarios.</p>}
                    >
                      <div class="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
                        <div class="space-y-3">
                          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">
                            Destinatarios disponibles
                          </h3>
                          <For each={resolvedRecipients() ?? []}>
                            {(recipient) => (
                              <label class="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <input
                                  type="checkbox"
                                  class="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600"
                                  checked={selectedRecipientKeys().includes(recipient.key)}
                                  onChange={() => toggleRecipientSelection(recipient.key)}
                                />
                                <div class="min-w-0 flex-1">
                                  <div class="flex flex-wrap items-center gap-2">
                                    <p class="font-medium text-gray-900">{recipient.recipientName}</p>
                                    <span class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                                      {recipient.recipientType === 'employee' ? 'Empleado' : 'Padre / tutor'}
                                    </span>
                                    <Show when={!recipient.hasEmail}>
                                      <span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                        Sin correo
                                      </span>
                                    </Show>
                                  </div>
                                  <p class="mt-1 text-sm text-gray-600">{formatText(recipient.recipientEmail)}</p>
                                  <p class="mt-1 text-xs text-gray-500">{formatSourceLabel(recipient)}</p>
                                </div>
                              </label>
                            )}
                          </For>
                        </div>

                        <div class="space-y-3">
                          <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">
                            Destinatarios sin correo
                          </h3>
                          <Show
                            when={resolvedMissingEmailRecipients().length > 0}
                            fallback={<p class="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">Todos los destinatarios resueltos tienen correo.</p>}
                          >
                            <div class="space-y-3">
                              <For each={resolvedMissingEmailRecipients()}>
                                {(recipient) => (
                                  <div class="rounded-xl border border-red-200 bg-red-50 p-3">
                                    <p class="font-medium text-red-900">{recipient.recipientName}</p>
                                    <p class="mt-1 text-sm text-red-700">{formatSourceLabel(recipient)}</p>
                                  </div>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </div>
                    </Show>
                  </Show>
                </div>
              </section>

              <section class="rounded-2xl border border-yellow-300 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900">Historial reciente</h2>
                <p class="mt-2 text-sm text-gray-600">
                  Revisa los últimos envíos y el resultado por destinatario.
                </p>

                <div class="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div class="space-y-3">
                    <Show
                      when={!messageHistory.loading}
                      fallback={<p class="text-sm text-gray-500">Cargando historial…</p>}
                    >
                      <Show
                        when={(messageHistory()?.length ?? 0) > 0}
                        fallback={<p class="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">Todavía no hay envíos registrados.</p>}
                      >
                        <For each={messageHistory() ?? []}>
                          {(message) => (
                            <button
                              type="button"
                              class="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-yellow-50"
                              classList={{
                                'border-amber-400 bg-amber-50': historySelectionId() === message.id,
                                'border-gray-200 bg-white': historySelectionId() !== message.id,
                              }}
                              onClick={() => setHistorySelectionId(message.id)}
                            >
                              <p class="font-medium text-gray-900">{message.subject}</p>
                              <p class="mt-1 text-xs text-gray-500">
                                {formatDateTime(message.createdAt)} · {message.createdByName}
                              </p>
                              <p class="mt-2 text-xs text-gray-600">
                                Enviados {message.totalSent} · Fallidos {message.totalFailed} · Sin correo {message.totalMissingEmail}
                              </p>
                            </button>
                          )}
                        </For>
                      </Show>
                    </Show>
                  </div>

                  <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <Show
                      when={historySelectionId()}
                      fallback={<p class="text-sm text-gray-500">Selecciona un envío para ver el detalle.</p>}
                    >
                      <Show
                        when={!historyRecipients.loading}
                        fallback={<p class="text-sm text-gray-500">Cargando destinatarios…</p>}
                      >
                        <div class="space-y-3">
                          <For each={historyRecipients() ?? []}>
                            {(recipient) => {
                              const historyRecipientMessage = getHistoryRecipientMessage(recipient);

                              return (
                                <div class="rounded-xl border border-gray-200 bg-white p-3">
                                  <div class="flex flex-wrap items-center gap-2">
                                    <p class="font-medium text-gray-900">{recipient.recipientName}</p>
                                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                      {recipient.status}
                                    </span>
                                  </div>
                                  <p class="mt-1 text-sm text-gray-600">{formatText(recipient.recipientEmail)}</p>
                                  <p class="mt-1 text-xs text-gray-500">
                                    {recipient.sources.length > 0
                                      ? recipient.sources.map((source) => source.label).join(' · ')
                                      : recipient.sourceKind}
                                  </p>
                                  <Show when={historyRecipientMessage}>
                                    <p class="mt-2 text-xs text-red-700">{historyRecipientMessage}</p>
                                  </Show>
                                </div>
                              );
                            }}
                          </For>
                        </div>
                      </Show>
                    </Show>
                  </div>
                </div>
              </section>
            </div>

            <div class="space-y-6">
              <section class="rounded-2xl border border-yellow-300 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900">Redactar correo</h2>

                <div class="mt-6 space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700" for="event-email-subject">
                      Asunto
                    </label>
                    <input
                      id="event-email-subject"
                      type="text"
                      class="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      classList={{ 'field-input-invalid': Boolean(subjectError()) }}
                      value={composeForm().subject}
                      onInput={(event) => setComposeField('subject', event.currentTarget.value)}
                      aria-invalid={Boolean(subjectError())}
                      aria-describedby={subjectError() ? 'event-email-subject-error' : undefined}
                    />
                    <InlineFieldAlert id="event-email-subject-error" message={subjectError()} />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700" for="event-email-body">
                      Cuerpo
                    </label>
                    <textarea
                      id="event-email-body"
                      rows="10"
                      class="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                      classList={{ 'field-input-invalid': Boolean(bodyTextError()) }}
                      value={composeForm().bodyText}
                      onInput={(event) => setComposeField('bodyText', event.currentTarget.value)}
                      aria-invalid={Boolean(bodyTextError())}
                      aria-describedby={bodyTextError() ? 'event-email-body-error' : undefined}
                    />
                    <InlineFieldAlert id="event-email-body-error" message={bodyTextError()} />
                  </div>
                </div>

                <Show when={submitError()}>
                  {(error) => (
                    <div class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error()}
                    </div>
                  )}
                </Show>

                <Show when={submitNotice()}>
                  {(notice) => (
                    <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {notice()}
                    </div>
                  )}
                </Show>

                <div class="mt-6 flex items-center justify-between gap-3">
                  <p class="text-sm text-gray-600">
                    Destinatarios listos para envío: <span class="font-semibold text-gray-900">{selectedSendableRecipients().length}</span>
                  </p>
                  <button
                    type="button"
                    class="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                    disabled={sendBusy() || Boolean(backendSetupNotice())}
                    onClick={handleSend}
                  >
                    {sendBusy() ? 'Enviando…' : 'Enviar correo'}
                  </button>
                </div>
              </section>

              <section class="rounded-2xl border border-yellow-300 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900">Vista previa</h2>
                <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p class="text-sm font-semibold text-gray-900">
                    {composeForm().subject.trim() || 'Sin asunto'}
                  </p>
                  <div
                    class="prose prose-sm mt-4 max-w-none text-gray-700"
                    innerHTML={previewHtml()}
                  />
                </div>
              </section>
            </div>
          </div>
        </Show>
      </div>
    </section>
  );
}
