import { useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Show,
} from 'solid-js';
import InlineFieldAlert from '../../../components/InlineFieldAlert';
import Modal from '../../../components/Modal';
import PaginationControls from '../../../components/PaginationControls';
import SortableHeaderCell from '../../../components/SortableHeaderCell';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../../../lib/forms/realtime-validation';
import { toggleSort, type SortState } from '../../../lib/table/sorting';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../../../lib/table/pagination';
import { canAccessModule } from '../../../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../../../lib/pocketbase/errors';
import { getEmployeeByUserId } from '../../../lib/pocketbase/employees';
import {
  createEmployeeLeave,
  hasLeaveOverlap,
  listEmployeeLeaves,
  updateEmployeeLeave,
  type LeaveCreateInput,
  type LeaveRecord,
  type LeaveSortField,
} from '../../../lib/pocketbase/leaves';
import { getCurrentSemester, listSemesterOptions } from '../../../lib/pocketbase/semesters';
import { getAuthUserId } from '../../../lib/pocketbase/users';

const LEAVE_FIELDS = ['semesterId', 'start_datetime', 'end_datetime'] as const;
type LeaveField = (typeof LEAVE_FIELDS)[number];

const emptyLeaveForm: LeaveCreateInput = {
  employeeId: '',
  semesterId: '',
  start_datetime: '',
  end_datetime: '',
};

function parseLocalDateTime(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateTimeLocalValue(isoValue: string): string {
  if (!isoValue) return '';
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return '';

  const tzOffsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function validateLeaveForm(current: LeaveCreateInput): FieldErrorMap<LeaveField> {
  const errors: FieldErrorMap<LeaveField> = {};
  if (current.semesterId.trim().length === 0) {
    errors.semesterId = 'Semestre es obligatorio.';
  }

  const startValue = current.start_datetime.trim();
  const endValue = current.end_datetime.trim();

  if (!startValue || !endValue) {
    const message = 'Debes completar fecha y hora de inicio y fin.';
    if (!startValue) errors.start_datetime = message;
    if (!endValue) errors.end_datetime = message;
    return errors;
  }

  const start = parseLocalDateTime(startValue);
  const end = parseLocalDateTime(endValue);
  if (!start || !end) {
    errors.end_datetime = 'Las fechas ingresadas no son válidas.';
    return errors;
  }

  if (end.getTime() <= start.getTime()) {
    errors.end_datetime = 'La fecha de fin debe ser posterior a la fecha de inicio.';
  }

  return errors;
}

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') return normalized.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operación.';
}

type LeaveSortKey = LeaveSortField;
const DEFAULT_LEAVE_SORT: SortState<LeaveSortKey> = { key: 'start_datetime', direction: 'desc' };

export default function ProfessorLeavesPage() {
  const navigate = useNavigate();

  createEffect(() => {
    if (!canAccessModule('professor-personal')) {
      navigate('/', { replace: true });
    }
  });

  const userId = () => getAuthUserId() ?? '';
  const [employee] = createResource(
    () => (userId().length > 0 ? userId() : undefined),
    (uid) => getEmployeeByUserId(uid),
  );

  const [leavePage, setLeavePage] = createSignal(1);
  const [leaveSort, setLeaveSort] = createSignal<SortState<LeaveSortKey>>(DEFAULT_LEAVE_SORT);
  const [leaveForm, setLeaveForm] = createSignal<LeaveCreateInput>(emptyLeaveForm);
  const [leaveTouched, setLeaveTouched] = createSignal(createInitialTouchedMap(LEAVE_FIELDS));
  const [leaveBusy, setLeaveBusy] = createSignal(false);
  const [leaveError, setLeaveError] = createSignal<string | null>(null);
  const [leaveAsyncError, setLeaveAsyncError] = createSignal<string | null>(null);
  const [leaveSemesterLoadError, setLeaveSemesterLoadError] = createSignal<string | null>(null);
  const [editingLeaveId, setEditingLeaveId] = createSignal<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = createSignal(false);

  const employeeId = () => employee()?.id ?? '';

  const [leaves, { refetch: refetchLeaves }] = createResource(
    () => {
      const eid = employeeId();
      if (!eid) return undefined;
      return { employeeId: eid, page: leavePage(), sortField: leaveSort().key, sortDirection: leaveSort().direction };
    },
    ({ employeeId: eid, page, sortField, sortDirection }) =>
      listEmployeeLeaves(eid, page, DEFAULT_TABLE_PAGE_SIZE, { sortField, sortDirection }),
  );

  const [leaveSemesters] = createResource(
    () => {
      const eid = employeeId();
      if (!createModalOpen() || !eid) return undefined;
      return eid;
    },
    async () => {
      setLeaveSemesterLoadError(null);

      try {
        return await listSemesterOptions();
      } catch (error) {
        setLeaveSemesterLoadError(getErrorMessage(error));
        return [];
      }
    },
  );
  const [currentSemesterData] = createResource(
    () => {
      const eid = employeeId();
      if (!createModalOpen() || editingLeaveId() || !eid) return undefined;
      return eid;
    },
    async () => {
      try {
        return await getCurrentSemester();
      } catch {
        return null;
      }
    },
  );

  const leaveSemesterOptions = () => leaveSemesters() ?? [];
  const leaveSemesterAvailabilityError = createMemo(() => {
    if (!createModalOpen()) return undefined;
    if (leaveSemesterLoadError()) return leaveSemesterLoadError() ?? undefined;
    if (!leaveSemesters.loading && leaveSemesterOptions().length === 0) {
      return 'No hay semestres registrados. Debes crear uno antes de guardar una salida.';
    }

    return undefined;
  });

  const currentLeaveSemester = createMemo(() => {
    const current = currentSemesterData();
    const options = leaveSemesterOptions();
    if (current) return options.find((s) => s.id === current.id) ?? null;
    if (options.length > 0) return options[0];
    return null;
  });

  const leaveFieldErrors = createMemo(() => validateLeaveForm(leaveForm()));

  const leaveFieldError = (field: LeaveField): string | undefined => {
    if (field === 'semesterId') {
      return leaveSemesterAvailabilityError()
        ?? (leaveTouched().semesterId ? leaveFieldErrors().semesterId : undefined);
    }

    const clientError = leaveTouched()[field] ? leaveFieldErrors()[field] : undefined;
    if (field === 'end_datetime' && !clientError && leaveTouched().end_datetime) {
      return leaveAsyncError() ?? undefined;
    }

    return clientError;
  };

  createEffect(() => {
    if (!createModalOpen() || editingLeaveId()) return;

    const eid = employeeId();
    const currentSemester = currentLeaveSemester();
    if (!eid || !currentSemester) return;

    setLeaveForm((current) => {
      if (current.employeeId !== eid || current.semesterId.trim().length > 0) {
        return current;
      }

      return {
        ...current,
        semesterId: currentSemester.id,
      };
    });
  });

  const openCreate = () => {
    const currentSemester = currentLeaveSemester();
    setLeaveForm({
      employeeId: employeeId(),
      semesterId: currentSemester?.id ?? '',
      start_datetime: '',
      end_datetime: '',
    });
    setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
    setLeaveError(null);
    setLeaveAsyncError(null);
    setEditingLeaveId(null);
    setCreateModalOpen(true);
  };

  const openEdit = (leave: LeaveRecord) => {
    setLeaveForm({
      employeeId: employeeId(),
      semesterId: leave.semesterId,
      start_datetime: toDateTimeLocalValue(leave.start_datetime),
      end_datetime: toDateTimeLocalValue(leave.end_datetime),
    });
    setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
    setLeaveError(null);
    setLeaveAsyncError(null);
    setEditingLeaveId(leave.id);
    setCreateModalOpen(true);
  };

  const closeLeaveModal = () => {
    if (leaveBusy()) return;
    setCreateModalOpen(false);
    setEditingLeaveId(null);
  };

  const updateLeaveField = (field: keyof LeaveCreateInput, value: string) => {
    setLeaveForm((current) => ({ ...current, [field]: value }));
    if (field !== 'employeeId') {
      setLeaveTouched((current) => touchField(current, field as LeaveField));
    }
    setLeaveError(null);
    setLeaveAsyncError(null);
  };

  const submitLeave = async () => {
    const touched = touchAllFields(leaveTouched());
    setLeaveTouched(touched);
    if (leaveSemesters.loading) {
      setLeaveError('Cargando semestres. Intenta nuevamente.');
      return;
    }
    const semesterAvailabilityError = leaveSemesterAvailabilityError();
    if (semesterAvailabilityError) {
      setLeaveError(semesterAvailabilityError);
      return;
    }
    if (hasAnyError(leaveFieldErrors())) return;

    const start = parseLocalDateTime(leaveForm().start_datetime.trim());
    const end = parseLocalDateTime(leaveForm().end_datetime.trim());
    if (!start || !end) return;

    setLeaveBusy(true);
    setLeaveError(null);
    setLeaveAsyncError(null);

    try {
      const overlap = await hasLeaveOverlap(
        employeeId(),
        start.toISOString(),
        end.toISOString(),
        editingLeaveId() ?? undefined,
      );

      if (overlap) {
        setLeaveAsyncError('Ya existe una salida que se superpone con las fechas seleccionadas.');
        return;
      }

      const payload: LeaveCreateInput = {
        employeeId: employeeId(),
        semesterId: leaveForm().semesterId.trim(),
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      };

      const editId = editingLeaveId();
      if (editId) {
        await updateEmployeeLeave(editId, payload);
      } else {
        await createEmployeeLeave(payload);
      }

      await refetchLeaves();
      const totalPages = leaves()?.totalPages ?? 1;
      if (leavePage() > totalPages) setLeavePage(clampPage(leavePage(), totalPages));
      setCreateModalOpen(false);
      setEditingLeaveId(null);
      setLeaveForm({
        employeeId: employeeId(),
        semesterId: currentLeaveSemester()?.id ?? '',
        start_datetime: '',
        end_datetime: '',
      });
      setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
    } catch (error) {
      setLeaveError(getErrorMessage(error));
    } finally {
      setLeaveBusy(false);
    }
  };

  const handleLeaveSort = (key: LeaveSortKey) => {
    setLeaveSort((current) => toggleSort(current, key));
    setLeavePage(1);
  };

  const leaveRows = () => leaves()?.items ?? [];

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Registrar salida</h1>
            <p class="mt-2 text-gray-600">Consulta y registra tus salidas.</p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/professor/personal')}
          >
            Volver
          </button>
        </div>

        <Show when={!employee.loading}>
          <Show
            when={employee() !== null && employee() !== undefined}
            fallback={
              <div class="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                No se encontró un registro de empleado vinculado a tu usuario. Contacta al administrador.
              </div>
            }
          >
            <div class="mt-4 flex justify-end">
              <button
                type="button"
                class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
                onClick={openCreate}
              >
                Nueva salida
              </button>
            </div>

            <div class="mt-4 overflow-x-auto rounded-lg border border-yellow-200">
              <table class="min-w-[520px] w-full text-left text-sm">
                <thead class="bg-yellow-100 text-gray-700">
                  <tr>
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Inicio"
                      columnKey="start_datetime"
                      sort={leaveSort()}
                      onSort={handleLeaveSort}
                    />
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Fin"
                      columnKey="end_datetime"
                      sort={leaveSort()}
                      onSort={handleLeaveSort}
                    />
                    <th class="px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={!leaves.loading}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={3}>
                          Cargando salidas...
                        </td>
                      </tr>
                    }
                  >
                    <Show
                      when={!leaves.error}
                      fallback={
                        <tr>
                          <td class="px-4 py-4 text-red-700" colSpan={3}>
                            {getErrorMessage(leaves.error)}
                          </td>
                        </tr>
                      }
                    >
                      <Show
                        when={leaveRows().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={3}>
                              No hay salidas registradas.
                            </td>
                          </tr>
                        }
                      >
                        <For each={leaveRows()}>
                          {(leave) => (
                            <tr class="border-t border-yellow-100 align-top">
                              <td class="px-4 py-3">{formatDateTime(leave.start_datetime)}</td>
                              <td class="px-4 py-3">{formatDateTime(leave.end_datetime)}</td>
                              <td class="px-4 py-3">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label="Editar salida"
                                  onClick={() => openEdit(leave)}
                                >
                                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                                </button>
                              </td>
                            </tr>
                          )}
                        </For>
                      </Show>
                    </Show>
                  </Show>
                </tbody>
              </table>
            </div>
            <PaginationControls
              class="mt-3 flex items-center justify-between"
              page={leaves()?.page ?? 1}
              totalPages={leaves()?.totalPages ?? 1}
              busy={leaves.loading || leaveBusy()}
              onPageChange={(nextPage) => setLeavePage(nextPage)}
            />
          </Show>
        </Show>
      </div>

      <Modal
        open={createModalOpen()}
        title={editingLeaveId() ? 'Editar salida' : 'Nueva salida'}
        confirmLabel={editingLeaveId() ? 'Guardar cambios' : 'Registrar salida'}
        busy={leaveBusy()}
        onConfirm={submitLeave}
        onClose={closeLeaveModal}
      >
        <div class="space-y-3">
          <Show when={leaveError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {leaveError()}
            </div>
          </Show>

          <label class="block">
            <span class="text-sm text-gray-700">Semestre</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!leaveFieldError('semesterId') }}
              value={leaveForm().semesterId}
              onChange={(event) => updateLeaveField('semesterId', event.currentTarget.value)}
              disabled={leaveBusy() || leaveSemesters.loading || !!leaveSemesterAvailabilityError()}
              aria-invalid={!!leaveFieldError('semesterId')}
              aria-describedby={leaveFieldError('semesterId') ? 'leave-semester-error' : undefined}
            >
              <option value="">
                {leaveSemesters.loading ? 'Cargando semestres...' : 'Selecciona un semestre'}
              </option>
              <For each={leaveSemesterOptions()}>
                {(semester) => (
                  <option value={semester.id}>{semester.name}</option>
                )}
              </For>
            </select>
            <InlineFieldAlert id="leave-semester-error" message={leaveFieldError('semesterId')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Fecha y hora de inicio</span>
            <input
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!leaveFieldError('start_datetime') }}
              value={leaveForm().start_datetime}
              onInput={(event) => updateLeaveField('start_datetime', event.currentTarget.value)}
              disabled={leaveBusy()}
              aria-invalid={!!leaveFieldError('start_datetime')}
              aria-describedby={leaveFieldError('start_datetime') ? 'leave-start-error' : undefined}
            />
            <InlineFieldAlert id="leave-start-error" message={leaveFieldError('start_datetime')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Fecha y hora de fin</span>
            <input
              type="datetime-local"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!leaveFieldError('end_datetime') }}
              value={leaveForm().end_datetime}
              onInput={(event) => updateLeaveField('end_datetime', event.currentTarget.value)}
              disabled={leaveBusy()}
              aria-invalid={!!leaveFieldError('end_datetime')}
              aria-describedby={leaveFieldError('end_datetime') ? 'leave-end-error' : undefined}
            />
            <InlineFieldAlert id="leave-end-error" message={leaveFieldError('end_datetime')} />
          </label>
        </div>
      </Modal>
    </section>
  );
}
