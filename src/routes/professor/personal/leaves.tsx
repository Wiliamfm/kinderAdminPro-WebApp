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
import { canAccessModule, getAuthUserId } from '../../../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../../../lib/pocketbase/errors';
import { getEmployeeByUserId } from '../../../lib/pocketbase/employees';
import {
  createEmployeeLeave,
  getLeaveFileUrl,
  hasLeaveOverlap,
  listEmployeeLeaves,
  updateEmployeeLeave,
  type LeaveCreateInput,
  type LeaveRecord,
  type LeaveSortField,
} from '../../../lib/pocketbase/leaves';
import { validatePdfFile } from '../../../lib/forms/pdf-file-validation';
import { downloadBlobFile } from '../../../lib/reports/download';
import {
  getCurrentSemester,
  getSemesterById,
  type SemesterRecord,
} from '../../../lib/pocketbase/semesters';

const LEAVE_FIELDS = ['semesterId', 'start_datetime', 'end_datetime'] as const;
type LeaveField = (typeof LEAVE_FIELDS)[number];

const emptyLeaveForm: LeaveCreateInput = {
  employeeId: '',
  semesterId: '',
  start_datetime: '',
  end_datetime: '',
};
const LEAVE_FILE_MAX_SIZE_BYTES = 7 * 1024 * 1024;

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

type LeaveSemesterRange = Pick<SemesterRecord, 'start_date' | 'end_date'>;

function extractSemesterDatePart(value: string): string | null {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function extractSemesterOffset(value: string): string {
  const match = value.trim().match(/(Z|[+-]\d{2}:\d{2})$/);
  return match?.[1] ?? 'Z';
}

function toSemesterBoundaryDate(value: string, boundary: 'start' | 'end'): Date | null {
  const datePart = extractSemesterDatePart(value);
  if (datePart) {
    const timePart = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
    const boundaryDate = new Date(`${datePart}${timePart}${extractSemesterOffset(value)}`);
    if (!Number.isNaN(boundaryDate.getTime())) return boundaryDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const normalized = new Date(parsed);
  if (boundary === 'start') {
    normalized.setHours(0, 0, 0, 0);
  } else {
    normalized.setHours(23, 59, 59, 999);
  }

  return normalized;
}

function formatSemesterDate(value: string): string {
  const datePart = extractSemesterDatePart(value);
  if (datePart) {
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

function buildSemesterBoundaryMessage(semester: LeaveSemesterRange): string {
  return `La fecha debe estar dentro del trimestre (${formatSemesterDate(semester.start_date)} - ${formatSemesterDate(semester.end_date)}).`;
}

function validateLeaveFile(file: File | null): string | undefined {
  return validatePdfFile(file, {
    maxSizeBytes: LEAVE_FILE_MAX_SIZE_BYTES,
    maxSizeMessage: 'El archivo debe ser menor a 7MB',
  });
}

function validateLeaveForm(
  current: LeaveCreateInput,
  semester: LeaveSemesterRange | null,
  semesterId: string,
): FieldErrorMap<LeaveField> {
  const errors: FieldErrorMap<LeaveField> = {};
  if (semesterId.length === 0) {
    errors.semesterId = 'Trimestre es obligatorio.';
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

  if (semester) {
    const semesterStart = toSemesterBoundaryDate(semester.start_date, 'start');
    const semesterEnd = toSemesterBoundaryDate(semester.end_date, 'end');

    if (semesterStart && semesterEnd) {
      const boundaryMessage = buildSemesterBoundaryMessage(semester);

      if (start.getTime() < semesterStart.getTime() || start.getTime() > semesterEnd.getTime()) {
        errors.start_datetime = boundaryMessage;
      }

      if (end.getTime() < semesterStart.getTime() || end.getTime() > semesterEnd.getTime()) {
        errors.end_datetime = boundaryMessage;
      }
    }
  }

  if (!errors.end_datetime && end.getTime() <= start.getTime()) {
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

function formatLeaveFileName(value: unknown): string {
  if (typeof value !== 'string') return 'soporte-ausencia.pdf';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'soporte-ausencia.pdf';
}

async function fetchFileBlob(fileUrl: string): Promise<Blob> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('No se pudo descargar el archivo.');
  }

  return response.blob();
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
  const [leaveFile, setLeaveFile] = createSignal<File | null>(null);
  const [leaveFileTouched, setLeaveFileTouched] = createSignal(false);
  const [editingLeaveId, setEditingLeaveId] = createSignal<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [previewLeave, setPreviewLeave] = createSignal<LeaveRecord | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = createSignal('');
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [previewError, setPreviewError] = createSignal('');
  const [previewDownloadBusy, setPreviewDownloadBusy] = createSignal(false);
  const [previewDownloadError, setPreviewDownloadError] = createSignal('');
  let leaveFileInputRef: HTMLInputElement | undefined;
  let previewRequestId = 0;

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

  const [currentSemester] = createResource(
    () => {
      const eid = employeeId();
      if (!createModalOpen() || editingLeaveId() || !eid) return undefined;
      return eid;
    },
    async () => {
      setLeaveSemesterLoadError(null);

      try {
        return await getCurrentSemester();
      } catch (error) {
        setLeaveSemesterLoadError(getErrorMessage(error));
        return null;
      }
    },
  );
  const [editingLeaveSemester] = createResource(
    () => {
      const eid = employeeId();
      const editId = editingLeaveId();
      const semesterId = leaveForm().semesterId.trim();
      if (!createModalOpen() || !eid || !editId || semesterId.length === 0) return undefined;
      return semesterId;
    },
    async (semesterId) => {
      setLeaveSemesterLoadError(null);

      try {
        return await getSemesterById(semesterId);
      } catch (error) {
        setLeaveSemesterLoadError(getErrorMessage(error));
        return null;
      }
    },
  );

  const activeLeaveSemester = createMemo(() => {
    if (editingLeaveId()) return editingLeaveSemester() ?? null;
    return currentSemester() ?? null;
  });

  const leaveSemesterAvailabilityError = createMemo(() => {
    if (!createModalOpen()) return undefined;
    if (leaveSemesterLoadError()) return leaveSemesterLoadError() ?? undefined;

    if (editingLeaveId()) {
      if (!editingLeaveSemester.loading && !editingLeaveSemester()) {
        return 'No se pudo cargar el trimestre asociado a esta ausencia.';
      }
      return undefined;
    }

    if (!currentSemester.loading && !currentSemester()) {
      return 'No hay un trimestre activo configurado. Contacta al administrador.';
    }

    return undefined;
  });

  const leaveSemesterDisplayValue = createMemo(() => {
    const semester = activeLeaveSemester();
    if (semester) return semester.name;
    if (editingLeaveId()) {
      return editingLeaveSemester.loading ? 'Cargando trimestre...' : 'Trimestre no disponible';
    }

    return currentSemester.loading ? 'Cargando trimestre actual...' : 'Trimestre no disponible';
  });

  const resolvedLeaveSemesterId = createMemo(() => {
    const formSemesterId = leaveForm().semesterId.trim();
    if (formSemesterId.length > 0) return formSemesterId;
    return activeLeaveSemester()?.id.trim() ?? '';
  });

  const leaveFieldErrors = createMemo(() => (
    validateLeaveForm(leaveForm(), activeLeaveSemester(), resolvedLeaveSemesterId())
  ));

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

  const leaveFileError = createMemo(() => {
    if (!leaveFileTouched()) return undefined;
    return validateLeaveFile(leaveFile());
  });

  const resetLeaveFileState = () => {
    setLeaveFile(null);
    setLeaveFileTouched(false);
    if (leaveFileInputRef) leaveFileInputRef.value = '';
  };

  createEffect(() => {
    if (!createModalOpen() || editingLeaveId()) return;

    const eid = employeeId();
    const semester = currentSemester();
    if (!eid || !semester) return;

    setLeaveForm((current) => {
      if (current.employeeId === eid && current.semesterId === semester.id) {
        return current;
      }

      return {
        ...current,
        employeeId: eid,
        semesterId: semester.id,
      };
    });
  });

  const openCreate = () => {
    setLeaveSemesterLoadError(null);
    setLeaveForm({
      employeeId: employeeId(),
      semesterId: '',
      start_datetime: '',
      end_datetime: '',
    });
    setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
    setLeaveError(null);
    setLeaveAsyncError(null);
    setEditingLeaveId(null);
    resetLeaveFileState();
    setCreateModalOpen(true);
  };

  const openEdit = (leave: LeaveRecord) => {
    setLeaveSemesterLoadError(null);
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
    resetLeaveFileState();
    setCreateModalOpen(true);
  };

  const closeLeaveModal = () => {
    if (leaveBusy()) return;
    setCreateModalOpen(false);
    setEditingLeaveId(null);
    setLeaveSemesterLoadError(null);
    resetLeaveFileState();
  };

  const updateLeaveField = (field: keyof LeaveCreateInput, value: string) => {
    setLeaveForm((current) => ({ ...current, [field]: value }));
    if (field !== 'employeeId') {
      setLeaveTouched((current) => touchField(current, field as LeaveField));
    }
    setLeaveError(null);
    setLeaveAsyncError(null);
  };

  const closePreviewModal = () => {
    previewRequestId += 1;
    setPreviewLeave(null);
    setPreviewFileUrl('');
    setPreviewLoading(false);
    setPreviewError('');
    setPreviewDownloadBusy(false);
    setPreviewDownloadError('');
  };

  const openPreviewModal = async (leave: LeaveRecord) => {
    if (leave.file.trim().length === 0) return;

    const requestId = ++previewRequestId;
    setPreviewLeave(leave);
    setPreviewFileUrl('');
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewDownloadError('');

    try {
      const fileUrl = await getLeaveFileUrl(leave.id);
      if (requestId !== previewRequestId) return;
      setPreviewFileUrl(fileUrl);
    } catch (error) {
      if (requestId !== previewRequestId) return;
      setPreviewError(getErrorMessage(error));
    } finally {
      if (requestId === previewRequestId) {
        setPreviewLoading(false);
      }
    }
  };

  const downloadLeaveFile = async (leave: LeaveRecord, fileUrl?: string) => {
    const resolvedFileUrl = fileUrl && fileUrl.length > 0
      ? fileUrl
      : await getLeaveFileUrl(leave.id);
    const blob = await fetchFileBlob(resolvedFileUrl);
    downloadBlobFile(formatLeaveFileName(leave.file), blob);
  };

  const handlePreviewDownload = async () => {
    const leave = previewLeave();
    if (!leave || previewDownloadBusy()) return;

    setPreviewDownloadBusy(true);
    setPreviewDownloadError('');

    try {
      await downloadLeaveFile(leave, previewFileUrl() || undefined);
    } catch (error) {
      setPreviewDownloadError(getErrorMessage(error));
    } finally {
      setPreviewDownloadBusy(false);
    }
  };

  const submitLeave = async () => {
    const touched = touchAllFields(leaveTouched());
    setLeaveTouched(touched);
    setLeaveFileTouched(true);

    if (!editingLeaveId() && currentSemester.loading) {
      setLeaveError('Cargando trimestre actual. Intenta nuevamente.');
      return;
    }

    if (editingLeaveId() && editingLeaveSemester.loading) {
      setLeaveError('Cargando trimestre. Intenta nuevamente.');
      return;
    }

    const semesterAvailabilityError = leaveSemesterAvailabilityError();
    if (semesterAvailabilityError) {
      setLeaveError(semesterAvailabilityError);
      return;
    }
    if (hasAnyError(leaveFieldErrors())) return;

    const fileValidationError = validateLeaveFile(leaveFile());
    if (fileValidationError) return;

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
        setLeaveAsyncError('Ya existe una ausencia que se superpone con las fechas seleccionadas.');
        return;
      }

      const payload: LeaveCreateInput = {
        employeeId: employeeId(),
        semesterId: resolvedLeaveSemesterId(),
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        file: editingLeaveId() ? undefined : leaveFile() ?? undefined,
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
        semesterId: currentSemester()?.id ?? '',
        start_datetime: '',
        end_datetime: '',
      });
      setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
      resetLeaveFileState();
    } catch (error) {
      console.error(error);
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
  const leaveConfirmDisabled = createMemo(() => {
    if (leaveBusy()) return true;
    if (editingLeaveId()) {
      return editingLeaveSemester.loading || !!leaveSemesterAvailabilityError();
    }

    return currentSemester.loading || !!leaveSemesterAvailabilityError();
  });

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Registrar ausencia</h1>
            <p class="mt-2 text-gray-600">Consulta y registra tus ausencias.</p>
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
                Nueva ausencia
              </button>
            </div>

            <div class="mt-4 overflow-x-auto rounded-lg border border-yellow-200">
              <table class="min-w-[640px] w-full text-left text-sm">
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
                    <th class="px-4 py-3 font-semibold">Archivo</th>
                    <th class="px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <Show
                    when={!leaves.loading}
                    fallback={
                      <tr>
                        <td class="px-4 py-4 text-gray-600" colSpan={4}>
                          Cargando ausencias...
                        </td>
                      </tr>
                    }
                  >
                    <Show
                      when={!leaves.error}
                      fallback={
                        <tr>
                          <td class="px-4 py-4 text-red-700" colSpan={4}>
                            {getErrorMessage(leaves.error)}
                          </td>
                        </tr>
                      }
                    >
                      <Show
                        when={leaveRows().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={4}>
                              No hay ausencias registradas.
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
                                <Show
                                  when={leave.file.trim().length > 0}
                                  fallback={<span class="text-gray-400">—</span>}
                                >
                                  <button
                                    type="button"
                                    class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-yellow-300 bg-yellow-100 px-3 text-xs text-gray-700 transition-colors hover:bg-yellow-200"
                                    aria-label={`Ver archivo de la ausencia ${leave.id}`}
                                    onClick={() => void openPreviewModal(leave)}
                                  >
                                    <i class="bi bi-paperclip" aria-hidden="true"></i>
                                    Ver archivo
                                  </button>
                                </Show>
                              </td>
                              <td class="px-4 py-3">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label="Editar ausencia"
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
        title={editingLeaveId() ? 'Editar ausencia' : 'Nueva ausencia'}
        confirmLabel={editingLeaveId() ? 'Guardar cambios' : 'Registrar ausencia'}
        busy={leaveBusy()}
        onConfirm={submitLeave}
        onClose={closeLeaveModal}
        footer={(
          <div class="mt-6 flex shrink-0 justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={leaveBusy()}
              onClick={closeLeaveModal}
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={leaveConfirmDisabled()}
              onClick={submitLeave}
            >
              {leaveBusy() ? 'Procesando...' : editingLeaveId() ? 'Guardar cambios' : 'Registrar ausencia'}
            </button>
          </div>
        )}
      >
        <div class="space-y-3">
          <Show when={leaveError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {leaveError()}
            </div>
          </Show>

          <label class="block">
            <span class="text-sm text-gray-700">Trimestre</span>
            <div
              class="mt-1 rounded-lg border px-3 py-2 text-sm"
              classList={{
                'border-red-300 bg-red-50 text-red-700': !!leaveFieldError('semesterId'),
                'border-gray-300 bg-gray-50 text-gray-700': !leaveFieldError('semesterId'),
              }}
              aria-invalid={!!leaveFieldError('semesterId')}
              aria-describedby={leaveFieldError('semesterId') ? 'leave-semester-error' : undefined}
            >
              {leaveSemesterDisplayValue()}
            </div>
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

          <Show when={!editingLeaveId()}>
            <label class="block">
              <span class="text-sm text-gray-700">Soporte en PDF (opcional)</span>
              <input
                ref={leaveFileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                classList={{ 'field-input-invalid': !!leaveFileError() }}
                disabled={leaveBusy()}
                aria-invalid={!!leaveFileError()}
                aria-describedby={leaveFileError() ? 'leave-file-error' : undefined}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setLeaveFile(file);
                  setLeaveFileTouched(true);
                  setLeaveError(null);
                }}
              />
              <InlineFieldAlert id="leave-file-error" message={leaveFileError()} />
            </label>
          </Show>

          <Show when={!editingLeaveId() && leaveFile()}>
            <p class="text-xs text-gray-600">
              Archivo seleccionado: {leaveFile()?.name}
            </p>
          </Show>
        </div>
      </Modal>

      <Modal
        open={previewLeave() !== null}
        title={formatLeaveFileName(previewLeave()?.file)}
        description="Vista previa del soporte en PDF."
        confirmLabel="Descargar"
        size="xl"
        onConfirm={() => {}}
        onClose={closePreviewModal}
        footer={(
          <div class="mt-6 flex shrink-0 justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
              onClick={closePreviewModal}
            >
              Cerrar
            </button>
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={previewLoading() || previewFileUrl().length === 0 || previewDownloadBusy()}
              onClick={() => void handlePreviewDownload()}
            >
              {previewDownloadBusy() ? 'Descargando...' : 'Descargar'}
            </button>
          </div>
        )}
      >
        <div class="space-y-4">
          <Show when={previewDownloadError().length > 0}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {previewDownloadError()}
            </div>
          </Show>

          <Show
            when={!previewLoading()}
            fallback={(
              <div class="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-6 text-sm text-gray-700">
                Cargando vista previa...
              </div>
            )}
          >
            <Show
              when={previewError().length === 0}
              fallback={(
                <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
                  {previewError()}
                </div>
              )}
            >
              <Show
                when={previewFileUrl().length > 0}
                fallback={(
                  <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-6 text-sm text-red-700">
                    No se encontró el archivo de la ausencia.
                  </div>
                )}
              >
                <iframe
                  class="h-[65vh] w-full rounded-lg border border-yellow-200 bg-white"
                  src={previewFileUrl()}
                  title={`Vista previa de ${formatLeaveFileName(previewLeave()?.file)}`}
                />
              </Show>
            </Show>
          </Show>
        </div>
      </Modal>
    </section>
  );
}
