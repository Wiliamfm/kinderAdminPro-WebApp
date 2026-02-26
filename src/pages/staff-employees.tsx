import { useNavigate } from '@solidjs/router';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import InlineFieldAlert from '../components/InlineFieldAlert';
import Modal from '../components/Modal';
import PaginationControls from '../components/PaginationControls';
import SortableHeaderCell from '../components/SortableHeaderCell';
import {
  createInitialTouchedMap,
  hasAnyError,
  touchAllFields,
  touchField,
  type FieldErrorMap,
} from '../lib/forms/realtime-validation';
import { toggleSort, type SortState } from '../lib/table/sorting';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  createEmployee,
  deactivateEmployee,
  listActiveEmployeesPage,
  type EmployeeListSortField,
  type EmployeeRecord,
} from '../lib/pocketbase/employees';
import { listEmployeeJobs } from '../lib/pocketbase/employee-jobs';
import {
  createEmployeeLeave,
  hasLeaveOverlap,
  listEmployeeLeaves,
  updateEmployeeLeave,
  type LeaveCreateInput,
  type LeaveRecord,
  type LeaveSortField,
} from '../lib/pocketbase/leaves';
import {
  createInvoice,
  listEmployeeInvoices,
  updateInvoice,
  type InvoiceRecord,
  type InvoiceSortField,
} from '../lib/pocketbase/invoices';
import { createInvoiceFile } from '../lib/pocketbase/invoice-files';
import {
  createEmployeeUser,
  resendUserOnboarding,
  sendUserOnboardingEmails,
} from '../lib/pocketbase/users';

type EmployeeCreateForm = {
  name: string;
  jobId: string;
  email: string;
  phone: string;
  address: string;
  emergency_contact: string;
};

const CREATE_EMPLOYEE_FIELDS = [
  'name',
  'jobId',
  'email',
  'phone',
  'address',
  'emergency_contact',
] as const;
type CreateEmployeeField = (typeof CREATE_EMPLOYEE_FIELDS)[number];

const LEAVE_FIELDS = ['start_datetime', 'end_datetime'] as const;
type LeaveField = (typeof LEAVE_FIELDS)[number];

const INVOICE_FIELDS = ['file'] as const;
type InvoiceField = (typeof INVOICE_FIELDS)[number];

const PHONE_REGEX = /^[+\d\s()-]{7,20}$/;

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

const LEAVES_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE;
const INVOICES_PAGE_SIZE = DEFAULT_TABLE_PAGE_SIZE;
const emptyLeaveForm: LeaveCreateInput = {
  employeeId: '',
  start_datetime: '',
  end_datetime: '',
};
const emptyCreateEmployeeForm: EmployeeCreateForm = {
  name: '',
  jobId: '',
  email: '',
  phone: '',
  address: '',
  emergency_contact: '',
};
const DEFAULT_LEAVE_SORT: SortState<LeaveSortField> = {
  key: 'start_datetime',
  direction: 'desc',
};
const DEFAULT_INVOICE_SORT: SortState<InvoiceSortField> = {
  key: 'update_datetime',
  direction: 'desc',
};

type EmployeeSortKey = EmployeeListSortField;

function validateCreateEmployeeForm(current: EmployeeCreateForm): FieldErrorMap<CreateEmployeeField> {
  const errors: FieldErrorMap<CreateEmployeeField> = {};

  if (current.name.trim().length === 0) errors.name = 'Nombre es obligatorio.';
  if (current.jobId.trim().length === 0) errors.jobId = 'Cargo es obligatorio.';
  if (current.email.trim().length === 0) errors.email = 'Correo es obligatorio.';
  if (current.phone.trim().length === 0) errors.phone = 'Teléfono es obligatorio.';
  if (current.address.trim().length === 0) errors.address = 'Dirección es obligatorio.';
  if (current.emergency_contact.trim().length === 0) {
    errors.emergency_contact = 'Contacto de emergencia es obligatorio.';
  }

  if (!errors.phone && !PHONE_REGEX.test(current.phone.trim())) {
    errors.phone = 'El teléfono debe tener entre 7 y 20 caracteres válidos.';
  }

  if (!errors.name && current.name.trim().length < 3) {
    errors.name = 'El nombre debe tener al menos 3 caracteres.';
  }

  if (!errors.address && current.address.trim().length < 5) {
    errors.address = 'La dirección debe tener al menos 5 caracteres.';
  }

  if (!errors.emergency_contact && current.emergency_contact.trim().length < 3) {
    errors.emergency_contact = 'El contacto de emergencia debe tener al menos 3 caracteres.';
  }

  return errors;
}

function toCreateEmployeeInput(current: EmployeeCreateForm): EmployeeCreateForm {
  return {
    name: current.name.trim(),
    jobId: current.jobId.trim(),
    email: current.email.trim(),
    phone: current.phone.trim(),
    address: current.address.trim(),
    emergency_contact: current.emergency_contact.trim(),
  };
}

function parseLocalDateTime(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validateLeaveForm(current: LeaveCreateInput): FieldErrorMap<LeaveField> {
  const errors: FieldErrorMap<LeaveField> = {};
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

export default function StaffEmployeesPage() {
  const navigate = useNavigate();
  const canManageAdminActions = () => isAuthUserAdmin();

  const [employeePage, setEmployeePage] = createSignal(1);
  const [jobs] = createResource(listEmployeeJobs);
  const [deleteTarget, setDeleteTarget] = createSignal<EmployeeRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);
  const [employeeSort, setEmployeeSort] = createSignal<SortState<EmployeeSortKey>>({
    key: 'name',
    direction: 'asc',
  });
  const [employees, { refetch }] = createResource(
    () => ({
      page: employeePage(),
      sortField: employeeSort().key,
      sortDirection: employeeSort().direction,
    }),
    ({ page, sortField, sortDirection }) => listActiveEmployeesPage(page, DEFAULT_TABLE_PAGE_SIZE, {
      sortField,
      sortDirection,
    }),
  );
  const [createModalOpen, setCreateModalOpen] = createSignal(false);
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);
  const [createInviteWarning, setCreateInviteWarning] = createSignal<string | null>(null);
  const [createForm, setCreateForm] = createSignal<EmployeeCreateForm>(emptyCreateEmployeeForm);
  const [createTouched, setCreateTouched] = createSignal(
    createInitialTouchedMap(CREATE_EMPLOYEE_FIELDS),
  );
  const [resendBusyEmployeeId, setResendBusyEmployeeId] = createSignal<string | null>(null);
  const [inviteNotice, setInviteNotice] = createSignal<string | null>(null);
  const [leaveTarget, setLeaveTarget] = createSignal<EmployeeRecord | null>(null);
  const [leaveForm, setLeaveForm] = createSignal<LeaveCreateInput>(emptyLeaveForm);
  const [leaveTouched, setLeaveTouched] = createSignal(createInitialTouchedMap(LEAVE_FIELDS));
  const [leaveAsyncError, setLeaveAsyncError] = createSignal<string | null>(null);
  const [leavePage, setLeavePage] = createSignal(1);
  const [leaveBusy, setLeaveBusy] = createSignal(false);
  const [leaveError, setLeaveError] = createSignal<string | null>(null);
  const [leaveSort, setLeaveSort] = createSignal<SortState<LeaveSortField>>(DEFAULT_LEAVE_SORT);
  const [editingLeaveId, setEditingLeaveId] = createSignal<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = createSignal<EmployeeRecord | null>(null);
  const [invoicePage, setInvoicePage] = createSignal(1);
  const [invoiceBusy, setInvoiceBusy] = createSignal(false);
  const [invoiceError, setInvoiceError] = createSignal<string | null>(null);
  const [invoiceSort, setInvoiceSort] = createSignal<SortState<InvoiceSortField>>(DEFAULT_INVOICE_SORT);
  const [invoiceFile, setInvoiceFile] = createSignal<File | null>(null);
  const [invoiceTouched, setInvoiceTouched] = createSignal(
    createInitialTouchedMap(INVOICE_FIELDS),
  );
  const [editingInvoice, setEditingInvoice] = createSignal<InvoiceRecord | null>(null);
  let invoiceFileInputRef: HTMLInputElement | undefined;

  const [leaves, { refetch: refetchLeaves }] = createResource(
    () => {
      const target = leaveTarget();
      if (!target) return undefined;

      return {
        employeeId: target.id,
        page: leavePage(),
        sortField: leaveSort().key,
        sortDirection: leaveSort().direction,
      };
    },
    ({ employeeId, page, sortField, sortDirection }) => listEmployeeLeaves(
      employeeId,
      page,
      LEAVES_PAGE_SIZE,
      {
        sortField,
        sortDirection,
      },
    ),
  );
  const [invoices, { refetch: refetchInvoices }] = createResource(
    () => {
      const target = invoiceTarget();
      if (!target) return undefined;

      return {
        employeeId: target.id,
        page: invoicePage(),
        sortField: invoiceSort().key,
        sortDirection: invoiceSort().direction,
      };
    },
    ({ employeeId, page, sortField, sortDirection }) => listEmployeeInvoices(
      employeeId,
      page,
      INVOICES_PAGE_SIZE,
      {
        sortField,
        sortDirection,
      },
    ),
  );

  const openCreateEmployeeModal = () => {
    setCreateModalOpen(true);
    setCreateError(null);
    setCreateInviteWarning(null);
    setCreateForm(emptyCreateEmployeeForm);
    setCreateTouched(createInitialTouchedMap(CREATE_EMPLOYEE_FIELDS));
  };

  const closeCreateEmployeeModal = () => {
    if (createBusy()) return;
    setCreateModalOpen(false);
    setCreateError(null);
    setCreateInviteWarning(null);
    setCreateForm(emptyCreateEmployeeForm);
    setCreateTouched(createInitialTouchedMap(CREATE_EMPLOYEE_FIELDS));
  };

  const setCreateField = (field: keyof EmployeeCreateForm, value: string) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
    setCreateTouched((current) => touchField(current, field as CreateEmployeeField));
    setCreateError(null);
  };
  const createFieldErrors = createMemo(() => validateCreateEmployeeForm(createForm()));
  const createFieldError = (field: CreateEmployeeField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const submitCreateEmployee = async () => {
    if (!canManageAdminActions()) {
      setCreateError('No tienes permisos para crear empleados.');
      return;
    }

    setCreateTouched((current) => touchAllFields(current));
    if (hasAnyError(createFieldErrors())) return;
    const validated = toCreateEmployeeInput(createForm());

    setCreateBusy(true);
    setCreateError(null);
    setCreateInviteWarning(null);
    setInviteNotice(null);

    try {
      const createdUser = await createEmployeeUser({
        email: validated.email,
        name: validated.name,
      });

      await createEmployee({
        ...validated,
        userId: createdUser.id,
      });

      try {
        await sendUserOnboardingEmails(createdUser.email);
        setInviteNotice(`Invitación enviada a ${createdUser.email}.`);
      } catch (inviteError) {
        setCreateInviteWarning(
          `Empleado creado, pero no se pudo enviar la invitación inicial: ${getErrorMessage(inviteError)}`,
        );
      }

      await refetch();
      const totalPages = employees()?.totalPages ?? 1;
      if (employeePage() > totalPages) {
        setEmployeePage(clampPage(employeePage(), totalPages));
      }
      setCreateModalOpen(false);
      setCreateForm(emptyCreateEmployeeForm);
      setCreateTouched(createInitialTouchedMap(CREATE_EMPLOYEE_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const resendInvite = async (employee: EmployeeRecord) => {
    const employeeEmail = employee.email.trim();
    if (!employeeEmail) {
      setActionError('El empleado no tiene correo para reenviar invitación.');
      return;
    }

    setActionError(null);
    setInviteNotice(null);
    setResendBusyEmployeeId(employee.id);

    try {
      await resendUserOnboarding(employeeEmail);
      setInviteNotice(`Invitación reenviada a ${employeeEmail}.`);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setResendBusyEmployeeId(null);
    }
  };

  const confirmDeactivateEmployee = async () => {
    const target = deleteTarget();
    if (!target) return;

    setDeleteBusy(true);
    setActionError(null);

    try {
      await deactivateEmployee(target.id);
      setDeleteTarget(null);
      await refetch();
      const totalPages = employees()?.totalPages ?? 1;
      if (employeePage() > totalPages) {
        setEmployeePage(clampPage(employeePage(), totalPages));
      }
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const openLeavesModal = (employee: EmployeeRecord) => {
    setLeaveTarget(employee);
    setLeavePage(1);
    setLeaveSort(DEFAULT_LEAVE_SORT);
    setLeaveError(null);
    setLeaveAsyncError(null);
    setEditingLeaveId(null);
    setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
    setLeaveForm({
      employeeId: employee.id,
      start_datetime: '',
      end_datetime: '',
    });
  };

  const openInvoiceModal = (employee: EmployeeRecord) => {
    setInvoiceTarget(employee);
    setInvoicePage(1);
    setInvoiceSort(DEFAULT_INVOICE_SORT);
    setInvoiceError(null);
    setInvoiceFile(null);
    setInvoiceTouched(createInitialTouchedMap(INVOICE_FIELDS));
    setEditingInvoice(null);
    if (invoiceFileInputRef) invoiceFileInputRef.value = '';
  };

  const closeLeavesModal = () => {
    if (leaveBusy()) return;
    setLeaveTarget(null);
    setLeavePage(1);
    setLeaveSort(DEFAULT_LEAVE_SORT);
    setLeaveError(null);
    setLeaveAsyncError(null);
    setEditingLeaveId(null);
    setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
    setLeaveForm(emptyLeaveForm);
  };

  const closeInvoiceModal = () => {
    if (invoiceBusy()) return;
    setInvoiceTarget(null);
    setInvoicePage(1);
    setInvoiceSort(DEFAULT_INVOICE_SORT);
    setInvoiceError(null);
    setInvoiceFile(null);
    setInvoiceTouched(createInitialTouchedMap(INVOICE_FIELDS));
    setEditingInvoice(null);
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
    setLeaveAsyncError(null);
    setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
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
    setLeaveTouched((current) => touchField(current, field));
    setLeaveError(null);
    setLeaveAsyncError(null);
  };
  const leaveFieldErrors = createMemo(() => validateLeaveForm(leaveForm()));
  const leaveFieldError = (field: LeaveField) => {
    const clientError = leaveTouched()[field] ? leaveFieldErrors()[field] : undefined;
    if (field === 'end_datetime' && !clientError && leaveTouched().end_datetime) {
      return leaveAsyncError() ?? undefined;
    }
    return clientError;
  };

  const submitLeave = async () => {
    const target = leaveTarget();
    if (!target) return;

    setLeaveTouched((current) => touchAllFields(current));
    if (hasAnyError(leaveFieldErrors())) return;
    const start = parseLocalDateTime(leaveForm().start_datetime.trim());
    const end = parseLocalDateTime(leaveForm().end_datetime.trim());
    if (!start || !end) return;

    setLeaveBusy(true);
    setLeaveError(null);
    setLeaveAsyncError(null);

    try {
      const payload: LeaveCreateInput = {
        employeeId: target.id,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      };
      const currentEditingLeaveId = editingLeaveId();
      const overlap = await hasLeaveOverlap(
        target.id,
        payload.start_datetime,
        payload.end_datetime,
        currentEditingLeaveId ?? undefined,
      );

      if (overlap) {
        setLeaveAsyncError('La licencia se cruza con otra licencia existente para este empleado.');
        return;
      }

      if (currentEditingLeaveId) {
        await updateEmployeeLeave(currentEditingLeaveId, payload);
      } else {
        await createEmployeeLeave(payload);
      }

      setEditingLeaveId(null);
      setLeaveForm((current) => ({
        ...current,
        start_datetime: '',
        end_datetime: '',
      }));
      setLeaveTouched(createInitialTouchedMap(LEAVE_FIELDS));
      setLeaveAsyncError(null);

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
      return null;
    }

    if (!isPdfFile(file)) {
      return null;
    }

    return file;
  };
  const invoiceFieldErrors = createMemo(() => {
    const errors: FieldErrorMap<InvoiceField> = {};
    const file = invoiceFile();
    if (!file) {
      errors.file = 'Debes seleccionar un archivo PDF.';
      return errors;
    }

    if (!isPdfFile(file)) {
      errors.file = 'Solo se permiten archivos PDF.';
    }

    return errors;
  });
  const invoiceFileError = () => (invoiceTouched().file ? invoiceFieldErrors().file : undefined);

  const submitInvoice = async () => {
    const target = invoiceTarget();
    if (!target) return;
    const invoiceToEdit = editingInvoice();

    setInvoiceTouched((current) => touchAllFields(current));
    if (hasAnyError(invoiceFieldErrors())) return;
    const file = validateInvoiceFile();
    if (!file) {
      return;
    }

    setInvoiceBusy(true);
    setInvoiceError(null);

    try {
      const createdFile = await createInvoiceFile({ file });
      if (invoiceToEdit) {
        await updateInvoice(invoiceToEdit.id, {
          fileId: createdFile.id,
          originalFileName: file.name,
        });
      } else {
        await createInvoice({
          employeeId: target.id,
          fileId: createdFile.id,
          originalFileName: file.name,
        });
      }

      setInvoiceFile(null);
      setInvoiceTouched(createInitialTouchedMap(INVOICE_FIELDS));
      setEditingInvoice(null);
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
  const invoiceItems = () => invoices()?.items ?? [];
  const invoiceCurrentPage = () => invoices()?.page ?? 1;
  const invoiceTotalPages = () => Math.max(1, invoices()?.totalPages ?? 1);
  const startEditInvoice = (invoice: InvoiceRecord) => {
    setEditingInvoice(invoice);
    setInvoiceError(null);
    setInvoiceFile(null);
    setInvoiceTouched(createInitialTouchedMap(INVOICE_FIELDS));
    if (invoiceFileInputRef) invoiceFileInputRef.value = '';
  };
  const selectedCreateJob = () => {
    const jobId = createForm().jobId;
    return (jobs() ?? []).find((job) => job.id === jobId) ?? null;
  };
  const employeeRows = () => employees()?.items ?? [];
  const employeeCurrentPage = () => employees()?.page ?? 1;
  const employeeTotalPages = () => employees()?.totalPages ?? 1;
  const handleEmployeeSort = (key: EmployeeSortKey) => {
    setEmployeeSort((current) => toggleSort(current, key));
    setEmployeePage(1);
  };
  const handleLeaveSort = (key: LeaveSortField) => {
    setLeaveSort((current) => toggleSort(current, key));
    setLeavePage(1);
  };
  const handleInvoiceSort = (key: InvoiceSortField) => {
    setInvoiceSort((current) => toggleSort(current, key));
    setInvoicePage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-6xl rounded-xl border border-yellow-300 bg-white p-6">
        <h1 class="text-2xl font-semibold">Gestion de personal</h1>
        <p class="mt-2 text-gray-600">
          Aquí puedes consultar el listado actual de empleados y acceder a acciones rápidas.
        </p>

        <Show when={canManageAdminActions()}>
          <div class="mt-4 flex justify-end">
            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              onClick={openCreateEmployeeModal}
            >
              Nuevo empleado
            </button>
          </div>
        </Show>

        <Show when={employees.error || actionError()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError() ?? getErrorMessage(employees.error)}
          </div>
        </Show>

        <Show when={inviteNotice()}>
          <div class="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            {inviteNotice()}
          </div>
        </Show>

        <Show when={createInviteWarning()}>
          <div class="mt-4 rounded-lg border border-yellow-300 bg-yellow-100 px-4 py-3 text-sm text-yellow-800">
            {createInviteWarning()}
          </div>
        </Show>

        <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
          <table class="min-w-[980px] w-full text-left text-sm">
            <thead class="bg-yellow-100 text-gray-700">
              <tr>
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Nombre"
                  columnKey="name"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Salario"
                  columnKey="jobSalary"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Cargo"
                  columnKey="jobName"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Correo"
                  columnKey="email"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Teléfono"
                  columnKey="phone"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Dirección"
                  columnKey="address"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
                <SortableHeaderCell
                  class="px-4 py-3 font-semibold"
                  label="Contacto de emergencia"
                  columnKey="emergency_contact"
                  sort={employeeSort()}
                  onSort={handleEmployeeSort}
                />
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
                  when={employeeRows().length > 0}
                  fallback={
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={8}>
                        No hay empleados registrados.
                      </td>
                    </tr>
                  }
                >
                  <For each={employeeRows()}>
                    {(employee) => (
                      <tr class="border-t border-yellow-100 align-top">
                        <td class="px-4 py-3">{formatText(employee.name)}</td>
                        <td class="px-4 py-3">{formatSalary(employee.jobSalary)}</td>
                        <td class="px-4 py-3">{formatText(employee.jobName)}</td>
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

                              <button
                                type="button"
                                class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-300 bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Reenviar invitación a ${employee.name || 'empleado'}`}
                                disabled={resendBusyEmployeeId() === employee.id}
                                onClick={() => resendInvite(employee)}
                              >
                                <i class="bi bi-envelope" aria-hidden="true"></i>
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
        <PaginationControls
          class="mt-3 flex items-center justify-between"
          page={employeeCurrentPage()}
          totalPages={employeeTotalPages()}
          busy={employees.loading || createBusy() || deleteBusy()}
          onPageChange={(nextPage) => setEmployeePage(nextPage)}
        />
      </div>

      <Modal
        open={createModalOpen()}
        title="Crear empleado"
        description="Este registro crea también un usuario de acceso con permisos no administrativos y envía enlace para definir contraseña."
        confirmLabel="Crear empleado"
        cancelLabel="Cancelar"
        busy={createBusy()}
        size="xl"
        onConfirm={submitCreateEmployee}
        onClose={closeCreateEmployeeModal}
      >
        <Show when={canManageAdminActions()} fallback={
          <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            No tienes permisos para crear empleados.
          </div>
        }>
          <div class="space-y-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="block">
                <span class="text-sm text-gray-700">Nombre</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!createFieldError('name') }}
                  type="text"
                  value={createForm().name}
                  onInput={(event) => setCreateField('name', event.currentTarget.value)}
                  disabled={createBusy()}
                  aria-invalid={!!createFieldError('name')}
                  aria-describedby={createFieldError('name') ? 'create-employee-name-error' : undefined}
                />
                <InlineFieldAlert id="create-employee-name-error" message={createFieldError('name')} />
              </label>
              <label class="block">
                <span class="text-sm text-gray-700">Cargo</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!createFieldError('jobId') }}
                  value={createForm().jobId}
                  onChange={(event) => setCreateField('jobId', event.currentTarget.value)}
                  disabled={createBusy()}
                  aria-invalid={!!createFieldError('jobId')}
                  aria-describedby={createFieldError('jobId') ? 'create-employee-job-error' : undefined}
                >
                  <option value="">Selecciona un cargo</option>
                  <For each={jobs() ?? []}>
                    {(job) => (
                      <option value={job.id}>{job.name}</option>
                    )}
                  </For>
                </select>
                <InlineFieldAlert id="create-employee-job-error" message={createFieldError('jobId')} />
              </label>
              <Show when={selectedCreateJob()}>
                <p class="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-gray-700 md:col-span-2">
                  Salario del cargo: {formatSalary(selectedCreateJob()?.salary ?? '')}
                </p>
              </Show>
              <label class="block">
                <span class="text-sm text-gray-700">Correo</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!createFieldError('email') }}
                  type="email"
                  value={createForm().email}
                  onInput={(event) => setCreateField('email', event.currentTarget.value)}
                  disabled={createBusy()}
                  aria-invalid={!!createFieldError('email')}
                  aria-describedby={createFieldError('email') ? 'create-employee-email-error' : undefined}
                />
                <InlineFieldAlert id="create-employee-email-error" message={createFieldError('email')} />
              </label>
              <label class="block">
                <span class="text-sm text-gray-700">Teléfono</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!createFieldError('phone') }}
                  type="text"
                  value={createForm().phone}
                  onInput={(event) => setCreateField('phone', event.currentTarget.value)}
                  disabled={createBusy()}
                  aria-invalid={!!createFieldError('phone')}
                  aria-describedby={createFieldError('phone') ? 'create-employee-phone-error' : undefined}
                />
                <InlineFieldAlert id="create-employee-phone-error" message={createFieldError('phone')} />
              </label>
              <label class="block">
                <span class="text-sm text-gray-700">Dirección</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!createFieldError('address') }}
                  type="text"
                  value={createForm().address}
                  onInput={(event) => setCreateField('address', event.currentTarget.value)}
                  disabled={createBusy()}
                  aria-invalid={!!createFieldError('address')}
                  aria-describedby={createFieldError('address') ? 'create-employee-address-error' : undefined}
                />
                <InlineFieldAlert
                  id="create-employee-address-error"
                  message={createFieldError('address')}
                />
              </label>
              <label class="block md:col-span-2">
                <span class="text-sm text-gray-700">Contacto de emergencia</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!createFieldError('emergency_contact') }}
                  type="text"
                  value={createForm().emergency_contact}
                  onInput={(event) => setCreateField('emergency_contact', event.currentTarget.value)}
                  disabled={createBusy()}
                  aria-invalid={!!createFieldError('emergency_contact')}
                  aria-describedby={createFieldError('emergency_contact') ? 'create-employee-emergency-error' : undefined}
                />
                <InlineFieldAlert
                  id="create-employee-emergency-error"
                  message={createFieldError('emergency_contact')}
                />
              </label>
            </div>

            <Show when={createError()}>
              <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createError()}
              </div>
            </Show>

            <Show when={createInviteWarning()}>
              <div class="rounded-lg border border-yellow-300 bg-yellow-100 px-4 py-3 text-sm text-yellow-800">
                {createInviteWarning()}
              </div>
            </Show>
          </div>
        </Show>
      </Modal>

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
                  classList={{ 'field-input-invalid': !!leaveFieldError('start_datetime') }}
                  type="datetime-local"
                  value={leaveForm().start_datetime}
                  onInput={(event) => updateLeaveField('start_datetime', event.currentTarget.value)}
                  disabled={leaveBusy()}
                  aria-invalid={!!leaveFieldError('start_datetime')}
                  aria-describedby={leaveFieldError('start_datetime') ? 'leave-start-error' : undefined}
                />
                <InlineFieldAlert id="leave-start-error" message={leaveFieldError('start_datetime')} />
              </label>
              <label class="block">
                <span class="text-sm text-gray-700">Fin de licencia</span>
                <input
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  classList={{ 'field-input-invalid': !!leaveFieldError('end_datetime') }}
                  type="datetime-local"
                  value={leaveForm().end_datetime}
                  onInput={(event) => updateLeaveField('end_datetime', event.currentTarget.value)}
                  disabled={leaveBusy()}
                  aria-invalid={!!leaveFieldError('end_datetime')}
                  aria-describedby={leaveFieldError('end_datetime') ? 'leave-end-error' : undefined}
                />
                <InlineFieldAlert id="leave-end-error" message={leaveFieldError('end_datetime')} />
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

            <PaginationControls
              page={leavesPage()}
              totalPages={leavesTotalPages()}
              busy={leaveBusy() || leaves.loading}
              onPageChange={(nextPage) => setLeavePage(nextPage)}
            />
          </div>
        </Show>
      </Modal>

      <Modal
        open={!!invoiceTarget()}
        title={invoiceTarget() ? `Facturas de ${invoiceTarget()?.name || 'empleado'}` : 'Facturas'}
        description="Sube una factura en PDF y consulta el historial de facturas del empleado."
        confirmLabel={editingInvoice() ? 'Reemplazar factura' : 'Subir factura'}
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
                classList={{ 'field-input-invalid': !!invoiceFileError() }}
                type="file"
                accept="application/pdf,.pdf"
                disabled={invoiceBusy()}
                aria-invalid={!!invoiceFileError()}
                aria-describedby={invoiceFileError() ? 'invoice-file-error' : undefined}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  setInvoiceFile(file);
                  setInvoiceTouched((current) => touchField(current, 'file'));
                  setInvoiceError(null);
                }}
              />
              <InlineFieldAlert id="invoice-file-error" message={invoiceFileError()} />
            </label>

            <Show when={invoiceFile()}>
              <p class="text-xs text-gray-600">
                Archivo seleccionado: {invoiceFile()?.name}
              </p>
            </Show>

            <Show when={editingInvoice()}>
              <div class="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p>
                  Reemplazando archivo de: {formatText(editingInvoice()?.name)}
                </p>
                <button
                  type="button"
                  class="rounded-md border border-blue-300 bg-white px-3 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                  onClick={() => setEditingInvoice(null)}
                  disabled={invoiceBusy()}
                >
                  Cancelar
                </button>
              </div>
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
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Nombre de archivo"
                      columnKey="name"
                      sort={invoiceSort()}
                      onSort={handleInvoiceSort}
                    />
                    <SortableHeaderCell
                      class="px-4 py-3 font-semibold"
                      label="Fecha de registro"
                      columnKey="update_datetime"
                      sort={invoiceSort()}
                      onSort={handleInvoiceSort}
                    />
                    <th class="px-4 py-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <Show when={!invoices.loading} fallback={
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={3}>
                        Cargando facturas...
                      </td>
                    </tr>
                  }>
                    <Show when={!invoices.error} fallback={
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={3}>
                          {getErrorMessage(invoices.error)}
                        </td>
                      </tr>
                    }>
                      <Show
                        when={invoiceItems().length > 0}
                        fallback={
                          <tr>
                            <td class="px-4 py-4 text-gray-600" colSpan={3}>
                              Este empleado no tiene facturas registradas.
                            </td>
                          </tr>
                        }
                      >
                        <For each={invoiceItems()}>
                          {(invoice: InvoiceRecord) => (
                            <tr class="border-t border-yellow-100 align-top">
                              <td class="px-4 py-3">{formatText(invoice.name)}</td>
                              <td class="px-4 py-3">
                                {(invoice.updated || invoice.created)
                                  ? formatDateTime(invoice.updated || invoice.created)
                                  : 'No disponible'}
                              </td>
                              <td class="px-4 py-3">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label={`Reemplazar archivo ${invoice.name || invoice.id}`}
                                  onClick={() => startEditInvoice(invoice)}
                                  disabled={invoiceBusy()}
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
              page={invoiceCurrentPage()}
              totalPages={invoiceTotalPages()}
              busy={invoiceBusy() || invoices.loading}
              onPageChange={(nextPage) => setInvoicePage(nextPage)}
            />
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
