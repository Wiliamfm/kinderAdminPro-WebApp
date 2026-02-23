import { useNavigate } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import Modal from '../components/Modal';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  deactivateEmployee,
  listActiveEmployees,
  type EmployeeRecord,
} from '../lib/pocketbase/employees';
import {
  createEmployeeLeave,
  hasLeaveOverlap,
  listEmployeeLeaves,
  updateEmployeeLeave,
  type LeaveCreateInput,
  type LeaveRecord,
} from '../lib/pocketbase/leaves';
import { createInvoice, listEmployeeInvoices, type InvoiceRecord } from '../lib/pocketbase/invoices';
import { createInvoiceFile } from '../lib/pocketbase/invoice-files';

function formatSalary(value: number | string): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return '—';
}

function formatText(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
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
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo cargar la lista de empleados.';
}

const LEAVES_PAGE_SIZE = 10;
const INVOICES_PAGE_SIZE = 10;
const emptyLeaveForm: LeaveCreateInput = {
  employeeId: '',
  start_datetime: '',
  end_datetime: '',
};

export default function StaffEmployeesPage() {
  const navigate = useNavigate();
  const canManageAdminActions = () => isAuthUserAdmin();

  const [employees, { refetch }] = createResource(listActiveEmployees);
  const [deleteTarget, setDeleteTarget] = createSignal<EmployeeRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [leaveTarget, setLeaveTarget] = createSignal<EmployeeRecord | null>(null);
  const [leaveForm, setLeaveForm] = createSignal<LeaveCreateInput>(emptyLeaveForm);
  const [leavePage, setLeavePage] = createSignal(1);
  const [leaveBusy, setLeaveBusy] = createSignal(false);
  const [leaveError, setLeaveError] = createSignal<string | null>(null);
  const [editingLeaveId, setEditingLeaveId] = createSignal<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = createSignal<EmployeeRecord | null>(null);
  const [invoicePage, setInvoicePage] = createSignal(1);
  const [invoiceBusy, setInvoiceBusy] = createSignal(false);
  const [invoiceError, setInvoiceError] = createSignal<string | null>(null);
  const [invoiceFile, setInvoiceFile] = createSignal<File | null>(null);
  let invoiceFileInputRef: HTMLInputElement | undefined;

  const [leaves, { refetch: refetchLeaves }] = createResource(
    () => {
      const target = leaveTarget();
      if (!target) return undefined;

      return {
        employeeId: target.id,
        page: leavePage(),
      };
    },
    ({ employeeId, page }) => listEmployeeLeaves(employeeId, page, LEAVES_PAGE_SIZE),
  );
  const [invoices, { refetch: refetchInvoices }] = createResource(
    () => {
      const target = invoiceTarget();
      if (!target) return undefined;

      return {
        employeeId: target.id,
        page: invoicePage(),
      };
    },
    ({ employeeId, page }) => listEmployeeInvoices(employeeId, page, INVOICES_PAGE_SIZE),
  );

  const confirmDeactivateEmployee = async () => {
    const target = deleteTarget();
    if (!target) return;

    setDeleteBusy(true);
    setActionError(null);

    try {
      await deactivateEmployee(target.id);
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const openLeavesModal = (employee: EmployeeRecord) => {
    setLeaveTarget(employee);
    setLeavePage(1);
    setLeaveError(null);
    setEditingLeaveId(null);
    setLeaveForm({
      employeeId: employee.id,
      start_datetime: '',
      end_datetime: '',
    });
  };

  const openInvoiceModal = (employee: EmployeeRecord) => {
    setInvoiceTarget(employee);
    setInvoicePage(1);
    setInvoiceError(null);
    setInvoiceFile(null);
    if (invoiceFileInputRef) invoiceFileInputRef.value = '';
  };

  const closeLeavesModal = () => {
    if (leaveBusy()) return;
    setLeaveTarget(null);
    setLeavePage(1);
    setLeaveError(null);
    setEditingLeaveId(null);
    setLeaveForm(emptyLeaveForm);
  };

  const closeInvoiceModal = () => {
    if (invoiceBusy()) return;
    setInvoiceTarget(null);
    setInvoicePage(1);
    setInvoiceError(null);
    setInvoiceFile(null);
    if (invoiceFileInputRef) invoiceFileInputRef.value = '';
  };

  const toDateTimeLocalValue = (isoValue: string): string => {
    if (!isoValue) return '';
    const parsed = new Date(isoValue);
    if (Number.isNaN(parsed.getTime())) return '';

    const tzOffsetMs = parsed.getTimezoneOffset() * 60_000;
    return new Date(parsed.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const startEditLeave = (leave: LeaveRecord) => {
    setEditingLeaveId(leave.id);
    setLeaveError(null);
    setLeaveForm((current) => ({
      ...current,
      start_datetime: toDateTimeLocalValue(leave.start_datetime),
      end_datetime: toDateTimeLocalValue(leave.end_datetime),
    }));
  };

  const updateLeaveField = (field: 'start_datetime' | 'end_datetime', value: string) => {
    setLeaveForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const parseLocalDateTime = (value: string): Date | null => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const validateLeaveForm = (): { start: Date; end: Date; target: LeaveCreateInput } | null => {
    const employee = leaveTarget();
    if (!employee) {
      setLeaveError('No se encontró el empleado seleccionado.');
      return null;
    }

    const startValue = leaveForm().start_datetime.trim();
    const endValue = leaveForm().end_datetime.trim();

    if (!startValue || !endValue) {
      setLeaveError('Debes completar fecha y hora de inicio y fin.');
      return null;
    }

    const start = parseLocalDateTime(startValue);
    const end = parseLocalDateTime(endValue);
    if (!start || !end) {
      setLeaveError('Las fechas ingresadas no son válidas.');
      return null;
    }

    if (end.getTime() <= start.getTime()) {
      setLeaveError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return null;
    }

    return {
      start,
      end,
      target: {
        employeeId: employee.id,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      },
    };
  };

  const submitLeave = async () => {
    const target = leaveTarget();
    if (!target) return;

    const validated = validateLeaveForm();
    if (!validated) return;

    setLeaveBusy(true);
    setLeaveError(null);

    try {
      const currentEditingLeaveId = editingLeaveId();
      const overlap = await hasLeaveOverlap(
        target.id,
        validated.target.start_datetime,
        validated.target.end_datetime,
        currentEditingLeaveId ?? undefined,
      );

      if (overlap) {
        setLeaveError('La licencia se cruza con otra licencia existente para este empleado.');
        return;
      }

      if (currentEditingLeaveId) {
        await updateEmployeeLeave(currentEditingLeaveId, validated.target);
      } else {
        await createEmployeeLeave(validated.target);
      }

      setEditingLeaveId(null);
      setLeaveForm((current) => ({
        ...current,
        start_datetime: '',
        end_datetime: '',
      }));

      setLeavePage(1);
      await refetchLeaves();
    } catch (error) {
      setLeaveError(getErrorMessage(error));
    } finally {
      setLeaveBusy(false);
    }
  };

  const isPdfFile = (file: File): boolean => {
    if (file.type === 'application/pdf') return true;
    return file.name.toLowerCase().endsWith('.pdf');
  };

  const validateInvoiceFile = (): File | null => {
    const file = invoiceFile();
    if (!file) {
      setInvoiceError('Debes seleccionar un archivo PDF.');
      return null;
    }

    if (!isPdfFile(file)) {
      setInvoiceError('Solo se permiten archivos PDF.');
      return null;
    }

    return file;
  };

  const submitInvoice = async () => {
    const target = invoiceTarget();
    if (!target) return;

    const file = validateInvoiceFile();
    if (!file) return;

    setInvoiceBusy(true);
    setInvoiceError(null);

    try {
      const createdFile = await createInvoiceFile({ file });
      await createInvoice({
        employeeId: target.id,
        fileId: createdFile.id,
      });

      setInvoiceFile(null);
      if (invoiceFileInputRef) invoiceFileInputRef.value = '';
      setInvoicePage(1);
      await refetchInvoices();
    } catch (error) {
      setInvoiceError(getErrorMessage(error));
    } finally {
      setInvoiceBusy(false);
    }
  };

  const leavesItems = () => leaves()?.items ?? [];
  const leavesPage = () => leaves()?.page ?? 1;
  const leavesTotalPages = () => Math.max(1, leaves()?.totalPages ?? 1);
  const canGoPreviousLeavesPage = () => leavesPage() > 1;
  const canGoNextLeavesPage = () => leavesPage() < leavesTotalPages();
  const invoiceItems = () => invoices()?.items ?? [];
  const invoiceCurrentPage = () => invoices()?.page ?? 1;
  const invoiceTotalPages = () => Math.max(1, invoices()?.totalPages ?? 1);
  const canGoPreviousInvoicePage = () => invoiceCurrentPage() > 1;
  const canGoNextInvoicePage = () => invoiceCurrentPage() < invoiceTotalPages();

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-6xl rounded-xl border border-yellow-300 bg-white p-6">
        <h1 class="text-2xl font-semibold">Gestion de personal</h1>
        <p class="mt-2 text-gray-600">
          Aquí puedes consultar el listado actual de empleados y acceder a acciones rápidas.
        </p>

        <Show when={employees.error || actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError() ?? getErrorMessage(employees.error)}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[980px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <th class="px-4 py-3 font-semibold">Nombre</th>
                <th class="px-4 py-3 font-semibold">Salario</th>
                <th class="px-4 py-3 font-semibold">Cargo</th>
                <th class="px-4 py-3 font-semibold">Correo</th>
                <th class="px-4 py-3 font-semibold">Teléfono</th>
                <th class="px-4 py-3 font-semibold">Dirección</th>
                <th class="px-4 py-3 font-semibold">Contacto de emergencia</th>
                <th class="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!employees.loading} fallback={
                <tr>
                  <td class="px-4 py-4 text-gray-600" colSpan={8}>
                    Cargando personal...
                  </td>
                </tr>
              }>
                <Show
                  when={(employees() ?? []).length > 0}
                  fallback={
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={8}>
                        No hay empleados registrados.
                      </td>
                    </tr>
                  }
                >
                  <For each={employees() ?? []}>
                    {(employee) => (
                      <tr class="border-t border-yellow-100 align-top">
                        <td class="px-4 py-3">{formatText(employee.name)}</td>
                        <td class="px-4 py-3">{formatSalary(employee.salary)}</td>
                        <td class="px-4 py-3">{formatText(employee.job)}</td>
                        <td class="px-4 py-3">{formatText(employee.email)}</td>
                        <td class="px-4 py-3">{formatText(employee.phone)}</td>
                        <td class="px-4 py-3">{formatText(employee.address)}</td>
                        <td class="px-4 py-3">{formatText(employee.emergency_contact)}</td>
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                              aria-label={`Editar ${employee.name || 'empleado'}`}
                              onClick={() => navigate(`/staff-management/employees/${employee.id}`)}
                            >
                              <i class="bi bi-pencil-square" aria-hidden="true"></i>
                            </button>

                            <Show when={canManageAdminActions()}>
                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-300 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
                                aria-label={`Gestionar licencias de ${employee.name || 'empleado'}`}
                                onClick={() => openLeavesModal(employee)}
                              >
                                <i class="bi bi-calendar-plus" aria-hidden="true"></i>
                              </button>

                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
                                aria-label={`Subir factura de ${employee.name || 'empleado'}`}
                                onClick={() => openInvoiceModal(employee)}
                              >
                                <i class="bi bi-file-earmark-arrow-up" aria-hidden="true"></i>
                              </button>
                            </Show>

                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                              aria-label={`Eliminar ${employee.name || 'empleado'}`}
                              onClick={() => setDeleteTarget(employee)}
                            >
                              <i class="bi bi-trash" aria-hidden="true"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!leaveTarget()}
        title={leaveTarget() ? `Licencias de ${leaveTarget()?.name || 'empleado'}` : 'Licencias'}
        description="Registra una licencia y consulta el historial del empleado (ordenado por fecha de inicio)."
        confirmLabel={editingLeaveId() ? 'Actualizar licencia' : 'Guardar licencia'}
        cancelLabel="Cerrar"
        busy={leaveBusy()}
        size="xl"
        onConfirm={submitLeave}
        onClose={closeLeavesModal}
      >
        <Show when={canManageAdminActions()} fallback={
          <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            No tienes permisos para gestionar licencias.
          </div>
        }>
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="block">
                <span class="text-sm text-gray-700">Inicio de licencia</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={leaveForm().start_datetime}
                  onInput={(event) => updateLeaveField('start_datetime', event.currentTarget.value)}
                  disabled={leaveBusy()}
                />
              </label>
              <label class="block">
                <span class="text-sm text-gray-700">Fin de licencia</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={leaveForm().end_datetime}
                  onInput={(event) => updateLeaveField('end_datetime', event.currentTarget.value)}
                  disabled={leaveBusy()}
                />
              </label>
            </div>

            <p class="text-xs text-gray-500">
              Las fechas se capturan en tu hora local y se guardan en UTC.
            </p>

            <Show when={leaveError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {leaveError()}
              </div>
            </Show>

            <div class="overflow-x-auto rounded-lg border border-yellow-200">
              <table class="min-w-[640px] w-full text-left text-sm">
                <thead class="bg-yellow-100 text-gray-700">
                  <tr>
                    <th class="px-4 py-3 font-semibold">Inicio</th>
                    <th class="px-4 py-3 font-semibold">Fin</th>
                    <th class="px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <Show when={!leaves.loading} fallback={
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={3}>
                        Cargando licencias...
                      </td>
                    </tr>
                  }>
                    <Show when={!leaves.error} fallback={
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={3}>
                          {getErrorMessage(leaves.error)}
                        </td>
                      </tr>
                    }>
                      <Show
                        when={leavesItems().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={3}>
                              Este empleado no tiene licencias registradas.
                            </td>
                          </tr>
                        }
                      >
                        <For each={leavesItems()}>
                          {(leave: LeaveRecord) => (
                            <tr class="border-t border-yellow-100 align-top">
                              <td class="px-4 py-3">{formatDateTime(leave.start_datetime)}</td>
                              <td class="px-4 py-3">{formatDateTime(leave.end_datetime)}</td>
                              <td class="px-4 py-3">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label={`Editar licencia ${leave.id}`}
                                  onClick={() => startEditLeave(leave)}
                                  disabled={leaveBusy()}
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

            <div class="flex items-center justify-between">
              <p class="text-xs text-gray-600">
                Página {leavesPage()} de {leavesTotalPages()}
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={leaveBusy() || leaves.loading || !canGoPreviousLeavesPage()}
                  onClick={() => setLeavePage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={leaveBusy() || leaves.loading || !canGoNextLeavesPage()}
                  onClick={() => setLeavePage((current) => current + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Modal>

      <Modal
        open={!!invoiceTarget()}
        title={invoiceTarget() ? `Facturas de ${invoiceTarget()?.name || 'empleado'}` : 'Facturas'}
        description="Sube una factura en PDF y consulta el historial de facturas del empleado."
        confirmLabel="Subir factura"
        cancelLabel="Cerrar"
        busy={invoiceBusy()}
        size="xl"
        onConfirm={submitInvoice}
        onClose={closeInvoiceModal}
      >
        <Show when={canManageAdminActions()} fallback={
          <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            No tienes permisos para gestionar facturas.
          </div>
        }>
          <div class="space-y-4">
            <label class="block">
              <span class="text-sm text-gray-700">Archivo de factura (PDF)</span>
              <input
                ref={invoiceFileInputRef}
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                type="file"
                accept="application/pdf,.pdf"
                disabled={invoiceBusy()}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setInvoiceFile(file);
                }}
              />
            </label>

            <Show when={invoiceFile()}>
              <p class="text-xs text-gray-600">
                Archivo seleccionado: {invoiceFile()?.name}
              </p>
            </Show>

            <Show when={invoiceError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {invoiceError()}
              </div>
            </Show>

            <div class="overflow-x-auto rounded-lg border border-yellow-200">
              <table class="min-w-[640px] w-full text-left text-sm">
                <thead class="bg-yellow-100 text-gray-700">
                  <tr>
                    <th class="px-4 py-3 font-semibold">ID de archivo</th>
                    <th class="px-4 py-3 font-semibold">Fecha de registro</th>
                  </tr>
                </thead>
                <tbody>
                  <Show when={!invoices.loading} fallback={
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={2}>
                        Cargando facturas...
                      </td>
                    </tr>
                  }>
                    <Show when={!invoices.error} fallback={
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={2}>
                          {getErrorMessage(invoices.error)}
                        </td>
                      </tr>
                    }>
                      <Show
                        when={invoiceItems().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={2}>
                              Este empleado no tiene facturas registradas.
                            </td>
                          </tr>
                        }
                      >
                        <For each={invoiceItems()}>
                          {(invoice: InvoiceRecord) => (
                            <tr class="border-t border-yellow-100 align-top">
                              <td class="px-4 py-3">{formatText(invoice.fileId)}</td>
                              <td class="px-4 py-3">
                                {(invoice.updated || invoice.created)
                                  ? formatDateTime(invoice.updated || invoice.created)
                                  : 'No disponible'}
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

            <div class="flex items-center justify-between">
              <p class="text-xs text-gray-600">
                Página {invoiceCurrentPage()} de {invoiceTotalPages()}
              </p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={invoiceBusy() || invoices.loading || !canGoPreviousInvoicePage()}
                  onClick={() => setInvoicePage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  class="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={invoiceBusy() || invoices.loading || !canGoNextInvoicePage()}
                  onClick={() => setInvoicePage((current) => current + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Modal>

      <Modal
        open={!!deleteTarget()}
        title="Desactivar empleado"
        description={
          deleteTarget()
            ? `¿Deseas desactivar a ${deleteTarget()?.name || 'este empleado'}?`
            : undefined
        }
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={deleteBusy()}
        onConfirm={confirmDeactivateEmployee}
        onClose={() => {
          if (!deleteBusy()) {
            setDeleteTarget(null);
          }
        }}
      />
    </section>
  );
}
