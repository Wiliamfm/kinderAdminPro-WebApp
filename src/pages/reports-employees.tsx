import { useNavigate } from '@solidjs/router';
import Chart from 'chart.js/auto';
import { createEffect, createMemo, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
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
import { isAuthUserAdmin } from '../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import {
  createEmployeeReport,
  listEmployeeReportFormOptions,
  listEmployeeReportsAnalyticsRecords,
  listEmployeeReportsPage,
  softDeleteEmployeeReport,
  updateEmployeeReport,
  type EmployeeReportAnalyticsRecord,
  type EmployeeReportFormOptions,
  type EmployeeReportListSortField,
  type EmployeeReportRecord,
} from '../lib/pocketbase/employee-reports';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { toggleSort, type SortState } from '../lib/table/sorting';

type EmployeeReportForm = {
  employee_id: string;
  job_id: string;
  semester_id: string;
  comments: string;
};

type ReportFilters = {
  jobId: string;
  semesterId: string;
  employeeIds: string[];
};

const EMPLOYEE_REPORT_FIELDS = [
  'employee_id',
  'job_id',
  'semester_id',
] as const;

type EmployeeReportField = (typeof EMPLOYEE_REPORT_FIELDS)[number];
type EmployeeReportSortKey = EmployeeReportListSortField;
type EmployeeLookupOption = {
  id: string;
  label: string;
  lookupValue: string;
};

type BarChartPoint = {
  label: string;
  value: number;
};

const emptyForm: EmployeeReportForm = {
  employee_id: '',
  job_id: '',
  semester_id: '',
  comments: '',
};

function createEmptyReportFilters(): ReportFilters {
  return {
    jobId: '',
    semesterId: '',
    employeeIds: [],
  };
}

function getLastItems<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  return items.slice(items.length - count);
}

const emptyFormOptions: EmployeeReportFormOptions = {
  employees: [],
  jobs: [],
  semesters: [],
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

function isAbortLikeError(error: unknown): boolean {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized?.isAbort) return true;

  const message = getErrorMessage(error).toLowerCase();
  return message.includes('aborted') || message.includes('autocancel');
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

function validateForm(form: EmployeeReportForm): FieldErrorMap<EmployeeReportField> {
  const errors: FieldErrorMap<EmployeeReportField> = {};

  if (form.employee_id.trim().length === 0) {
    errors.employee_id = 'Empleado es obligatorio.';
  }

  if (form.job_id.trim().length === 0) {
    errors.job_id = 'Cargo es obligatorio.';
  }

  if (form.semester_id.trim().length === 0) {
    errors.semester_id = 'Semestre es obligatorio.';
  }

  return errors;
}

function buildPayload(form: EmployeeReportForm) {
  return {
    employee_id: form.employee_id,
    job_id: form.job_id,
    semester_id: form.semester_id,
    comments: form.comments,
  };
}

export default function ReportsEmployeesPage() {
  const navigate = useNavigate();

  const [reportPage, setReportPage] = createSignal(1);
  const [reportSort, setReportSort] = createSignal<SortState<EmployeeReportSortKey>>({
    key: 'created_at',
    direction: 'desc',
  });

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [formOptions, setFormOptions] = createSignal<EmployeeReportFormOptions>(emptyFormOptions);
  const [formOptionsLoading, setFormOptionsLoading] = createSignal(false);
  const [formOptionsLoaded, setFormOptionsLoaded] = createSignal(false);
  const [filterDraft, setFilterDraft] = createSignal<ReportFilters>(createEmptyReportFilters());
  const [appliedFilters, setAppliedFilters] = createSignal<ReportFilters>(createEmptyReportFilters());
  const [employeeLookupInput, setEmployeeLookupInput] = createSignal('');

  const loadFormOptions = async (force = false): Promise<void> => {
    if (!isAuthUserAdmin()) return;
    if (formOptionsLoading()) return;
    if (formOptionsLoaded() && !force) return;

    setFormOptionsLoading(true);
    try {
      const options = await listEmployeeReportFormOptions();
      setFormOptions(options);
      setFormOptionsLoaded(true);
    } catch (error) {
      if (isAbortLikeError(error)) {
        console.warn('Ignoring auto-cancelled employee report options request in reports employees page.', error);
      } else {
        console.error('Failed to load employee report options in reports employees page.', error);
      }

      if (!formOptionsLoaded()) {
        setFormOptions(emptyFormOptions);
      }
    } finally {
      setFormOptionsLoading(false);
    }
  };

  const [employeeReports, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;
      const filters = appliedFilters();
      return {
        page: reportPage(),
        sortField: reportSort().key,
        sortDirection: reportSort().direction,
        jobId: filters.jobId,
        semesterId: filters.semesterId,
        employeeIds: filters.employeeIds,
      };
    },
    ({ page, sortField, sortDirection, jobId, semesterId, employeeIds }) => listEmployeeReportsPage(
      page,
      DEFAULT_TABLE_PAGE_SIZE,
      {
        sortField,
        sortDirection,
        jobId,
        semesterId,
        employeeIds,
      },
    ),
  );

  const [employeeReportsAnalytics] = createResource(
    () => (isAuthUserAdmin() ? true : undefined),
    () => listEmployeeReportsAnalyticsRecords(),
  );

  const [jobChartSemesterId, setJobChartSemesterId] = createSignal('');
  const [semesterChartJobId, setSemesterChartJobId] = createSignal('');
  const [jobChartCanvas, setJobChartCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [semesterChartCanvas, setSemesterChartCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  let jobChartInstance: Chart | null = null;
  let semesterChartInstance: Chart | null = null;

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<EmployeeReportForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(EMPLOYEE_REPORT_FIELDS));
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [editTarget, setEditTarget] = createSignal<EmployeeReportRecord | null>(null);
  const [editForm, setEditForm] = createSignal<EmployeeReportForm>(emptyForm);
  const [editTouched, setEditTouched] = createSignal(createInitialTouchedMap(EMPLOYEE_REPORT_FIELDS));
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<EmployeeReportRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  createEffect(() => {
    if (!isAuthUserAdmin()) {
      navigate('/reports', { replace: true });
    }
  });

  createEffect(() => {
    if (!isAuthUserAdmin()) return;
    void loadFormOptions();
  });

  const createFieldErrors = createMemo(() => validateForm(createForm()));
  const editFieldErrors = createMemo(() => validateForm(editForm()));

  const createFieldError = (field: EmployeeReportField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const editFieldError = (field: EmployeeReportField) => (
    editTouched()[field] ? editFieldErrors()[field] : undefined
  );

  const setCreateField = (field: keyof EmployeeReportForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    if ((EMPLOYEE_REPORT_FIELDS as readonly string[]).includes(field)) {
      setCreateTouched((current) => touchField(current, field as EmployeeReportField));
    }
    setCreateError(null);
  };

  const setEditField = (field: keyof EmployeeReportForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    if ((EMPLOYEE_REPORT_FIELDS as readonly string[]).includes(field)) {
      setEditTouched((current) => touchField(current, field as EmployeeReportField));
    }
    setEditError(null);
  };

  const submitCreate = async () => {
    setCreateTouched((current) => touchAllFields(current));
    if (hasAnyError(createFieldErrors())) return;

    setCreateBusy(true);
    setCreateError(null);
    setActionError(null);

    try {
      await createEmployeeReport(buildPayload(createForm()));
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(EMPLOYEE_REPORT_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (record: EmployeeReportRecord) => {
    void loadFormOptions();
    setEditTarget(record);
    setEditError(null);
    setEditTouched(createInitialTouchedMap(EMPLOYEE_REPORT_FIELDS));
    setEditForm({
      employee_id: record.employee_id,
      job_id: record.job_id,
      semester_id: record.semester_id,
      comments: record.comments,
    });
  };

  const submitEdit = async () => {
    const target = editTarget();
    if (!target) return;

    setEditTouched((current) => touchAllFields(current));
    if (hasAnyError(editFieldErrors())) return;

    setEditBusy(true);
    setEditError(null);
    setActionError(null);

    try {
      await updateEmployeeReport(target.id, buildPayload(editForm()));
      await refetch();
      setEditTarget(null);
      setEditForm(emptyForm);
      setEditTouched(createInitialTouchedMap(EMPLOYEE_REPORT_FIELDS));
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;

    setDeleteBusy(true);
    setActionError(null);

    try {
      await softDeleteEmployeeReport(target.id);
      await refetch();
      const totalPages = employeeReports()?.totalPages ?? 1;
      if (reportPage() > totalPages) {
        setReportPage(clampPage(reportPage(), totalPages));
      }
      setDeleteTarget(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  };

  const rows = () => employeeReports()?.items ?? [];
  const currentPage = () => employeeReports()?.page ?? 1;
  const totalPages = () => employeeReports()?.totalPages ?? 1;

  const handleSort = (key: EmployeeReportSortKey) => {
    setReportSort((current) => toggleSort(current, key));
    setReportPage(1);
  };

  const setFilterField = (field: Exclude<keyof ReportFilters, 'employeeIds'>, value: string) => {
    setFilterDraft((current) => ({ ...current, [field]: value }));
  };

  const setFilterEmployeeIds = (ids: string[]) => {
    const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
    setFilterDraft((current) => ({ ...current, employeeIds: normalizedIds }));
  };

  const availableEmployeeLookupOptions = createMemo<EmployeeLookupOption[]>(() => {
    const selectedIds = new Set(filterDraft().employeeIds);

    return formOptions().employees
      .filter((employee) => !selectedIds.has(employee.id))
      .map((employee) => ({
        id: employee.id,
        label: employee.label,
        lookupValue: `${employee.label} · ${employee.id}`,
      }));
  });

  const employeeLookupOptions = createMemo<EmployeeLookupOption[]>(() => {
    const query = employeeLookupInput().trim().toLocaleLowerCase('es-CO');
    if (query.length === 0) return [];

    return availableEmployeeLookupOptions()
      .filter((employee) => employee.label.toLocaleLowerCase('es-CO').includes(query))
      .slice(0, 20);
  });

  const selectedSpecificEmployees = createMemo(() => {
    const optionsById = new Map(formOptions().employees.map((employee) => [employee.id, employee.label]));
    return filterDraft().employeeIds.map((employeeId) => ({
      id: employeeId,
      label: optionsById.get(employeeId) ?? employeeId,
    }));
  });

  const tryAddSpecificEmployee = (rawValue: string) => {
    const value = rawValue.trim();
    if (value.length === 0) return;

    const matchedOption = availableEmployeeLookupOptions().find((option) => option.lookupValue === value);
    if (!matchedOption) return;

    setFilterEmployeeIds([...filterDraft().employeeIds, matchedOption.id]);
    setEmployeeLookupInput('');
  };

  const analyticsRows = createMemo<EmployeeReportAnalyticsRecord[]>(() => (
    employeeReportsAnalytics.latest ?? []
  ));

  const jobLabelById = createMemo(() => new Map(formOptions().jobs.map((job) => [job.id, job.label])));
  const semesterLabelById = createMemo(() => (
    new Map(formOptions().semesters.map((semester) => [semester.id, semester.label]))
  ));
  const jobIdsOrdered = createMemo(() => (
    formOptions().jobs
      .map((job) => job.id.trim())
      .filter((id) => id.length > 0)
  ));
  const semesterIdsOrdered = createMemo(() => (
    formOptions().semesters
      .map((semester) => semester.id.trim())
      .filter((id) => id.length > 0)
  ));

  createEffect(() => {
    const selectedSemesterId = jobChartSemesterId().trim();
    if (selectedSemesterId.length === 0) return;
    if (!semesterIdsOrdered().includes(selectedSemesterId)) {
      setJobChartSemesterId('');
    }
  });

  createEffect(() => {
    const selectedJobId = semesterChartJobId().trim();
    if (selectedJobId.length === 0) return;
    if (!jobIdsOrdered().includes(selectedJobId)) {
      setSemesterChartJobId('');
    }
  });

  const jobChartPoints = createMemo<BarChartPoint[]>(() => {
    const selectedSemesterId = jobChartSemesterId().trim();
    const filteredRows = analyticsRows().filter((row) => (
      selectedSemesterId.length === 0 || row.semester_id === selectedSemesterId
    ));

    const visibleJobIds = jobIdsOrdered();

    if (visibleJobIds.length === 0) return [];

    const visibleJobIdSet = new Set(visibleJobIds);
    const uniqueByJobEmployee = new Set<string>();
    const countsByJobId = new Map(visibleJobIds.map((jobId) => [jobId, 0]));

    for (const row of filteredRows) {
      if (!visibleJobIdSet.has(row.job_id)) continue;
      const key = `${row.job_id}::${row.employee_id}`;
      if (uniqueByJobEmployee.has(key)) continue;
      uniqueByJobEmployee.add(key);
      countsByJobId.set(row.job_id, (countsByJobId.get(row.job_id) ?? 0) + 1);
    }

    const labels = jobLabelById();
    return visibleJobIds.map((jobId) => ({
      label: labels.get(jobId) ?? jobId,
      value: countsByJobId.get(jobId) ?? 0,
    }));
  });

  const semesterChartPoints = createMemo<BarChartPoint[]>(() => {
    const selectedJobId = semesterChartJobId().trim();
    const filteredRows = analyticsRows().filter((row) => (
      selectedJobId.length === 0 || row.job_id === selectedJobId
    ));

    const visibleSemesterIds = selectedJobId.length === 0
      ? getLastItems(semesterIdsOrdered(), 5)
      : semesterIdsOrdered();

    if (visibleSemesterIds.length === 0) return [];

    const visibleSemesterIdSet = new Set(visibleSemesterIds);
    const uniqueBySemesterEmployee = new Set<string>();
    const countsBySemesterId = new Map(visibleSemesterIds.map((semesterId) => [semesterId, 0]));

    for (const row of filteredRows) {
      if (!visibleSemesterIdSet.has(row.semester_id)) continue;
      const key = `${row.semester_id}::${row.employee_id}`;
      if (uniqueBySemesterEmployee.has(key)) continue;
      uniqueBySemesterEmployee.add(key);
      countsBySemesterId.set(row.semester_id, (countsBySemesterId.get(row.semester_id) ?? 0) + 1);
    }

    const labels = semesterLabelById();
    return visibleSemesterIds.map((semesterId) => ({
      label: labels.get(semesterId) ?? semesterId,
      value: countsBySemesterId.get(semesterId) ?? 0,
    }));
  });

  createEffect(() => {
    const canvas = jobChartCanvas();
    const points = jobChartPoints();
    const selectedSemesterId = jobChartSemesterId().trim();

    if (!canvas) return;

    jobChartInstance?.destroy();
    jobChartInstance = null;

    if (points.length === 0) return;

    const semesterLabel = semesterLabelById().get(selectedSemesterId) ?? selectedSemesterId;
    jobChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: selectedSemesterId.length > 0
              ? `Empleados (${semesterLabel})`
              : 'Empleados (todos los cargos)',
            data: points.map((point) => point.value),
            backgroundColor: '#facc15',
            borderColor: '#ca8a04',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, stepSize: 1 },
          },
        },
      },
    });
  });

  createEffect(() => {
    const canvas = semesterChartCanvas();
    const points = semesterChartPoints();
    const selectedJobId = semesterChartJobId().trim();

    if (!canvas) return;

    semesterChartInstance?.destroy();
    semesterChartInstance = null;

    if (points.length === 0) return;

    const jobLabel = jobLabelById().get(selectedJobId) ?? selectedJobId;
    semesterChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: selectedJobId.length > 0
              ? `Empleados (${jobLabel})`
              : 'Empleados (últimos 5 semestres)',
            data: points.map((point) => point.value),
            backgroundColor: '#93c5fd',
            borderColor: '#2563eb',
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 48,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, stepSize: 1 },
          },
        },
      },
    });
  });

  onCleanup(() => {
    jobChartInstance?.destroy();
    semesterChartInstance?.destroy();
    jobChartInstance = null;
    semesterChartInstance = null;
  });

  const applyFilters = () => {
    const normalized: ReportFilters = {
      jobId: filterDraft().jobId.trim(),
      semesterId: filterDraft().semesterId.trim(),
      employeeIds: [...new Set(filterDraft().employeeIds.map((id) => id.trim()).filter((id) => id.length > 0))],
    };

    setFilterDraft(normalized);
    setAppliedFilters(normalized);
    setReportPage(1);
  };

  const clearFilters = () => {
    const emptyFilters = createEmptyReportFilters();
    setFilterDraft(emptyFilters);
    setAppliedFilters(emptyFilters);
    setEmployeeLookupInput('');
    setReportSort({
      key: 'created_at',
      direction: 'desc',
    });
    setReportPage(1);
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-[1280px] space-y-6">
        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-semibold">Informe de empleados</h1>
              <p class="mt-1 text-sm text-gray-600">
                Consulta y administra reportes administrativos por empleado, cargo y semestre.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
              onClick={() => navigate('/reports')}
            >
              Volver
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-xl font-semibold">Empleados</h2>
              <p class="mt-1 text-sm text-gray-600">
                Gestiona observaciones administrativas por empleado, cargo y semestre.
              </p>
            </div>

            <button
              type="button"
              class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700"
              onClick={() => {
                void loadFormOptions();
                setCreateOpen(true);
                setCreateError(null);
                setCreateForm(emptyForm);
                setCreateTouched(createInitialTouchedMap(EMPLOYEE_REPORT_FIELDS));
              }}
            >
              Nuevo reporte
            </button>
          </div>

          <Show when={actionError()}>
            <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError()}
            </div>
          </Show>

          <div class="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h3 class="text-sm font-semibold text-gray-700">Agrupar y filtrar resultados</h3>
            <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="block">
                <span class="text-sm text-gray-700">Cargo</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={filterDraft().jobId}
                  onChange={(event) => setFilterField('jobId', event.currentTarget.value)}
                  disabled={formOptionsLoading() || employeeReports.loading}
                >
                  <option value="">Todos los cargos</option>
                  <For each={formOptions().jobs}>
                    {(job) => <option value={job.id}>{job.label}</option>}
                  </For>
                </select>
              </label>

              <label class="block">
                <span class="text-sm text-gray-700">Semestre</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={filterDraft().semesterId}
                  onChange={(event) => setFilterField('semesterId', event.currentTarget.value)}
                  disabled={formOptionsLoading() || employeeReports.loading}
                >
                  <option value="">Todos los semestres</option>
                  <For each={formOptions().semesters}>
                    {(semester) => <option value={semester.id}>{semester.label}</option>}
                  </For>
                </select>
              </label>

              <label class="block md:col-span-2">
                <span class="text-sm text-gray-700">Seleccionar empleados específicos</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={employeeLookupInput()}
                  onInput={(event) => {
                    const nextValue = event.currentTarget.value;
                    setEmployeeLookupInput(nextValue);
                    tryAddSpecificEmployee(nextValue);
                  }}
                  disabled={formOptionsLoading() || employeeReports.loading}
                  placeholder="Escribe para buscar empleados"
                  list={employeeLookupInput().trim().length > 0 ? 'reports-employees-specific-employee-list' : undefined}
                  aria-label="Seleccionar empleados específicos"
                />
                <Show when={employeeLookupInput().trim().length > 0 && employeeLookupOptions().length > 0}>
                  <datalist id="reports-employees-specific-employee-list">
                    <For each={employeeLookupOptions()}>
                      {(option) => <option value={option.lookupValue}>{option.label}</option>}
                    </For>
                  </datalist>
                </Show>
                <p class="mt-1 text-xs text-gray-600">
                  La lista aparece cuando comienzas a escribir. Seleccionar uno o más empleados aplica filtro exacto.
                </p>
                <Show when={selectedSpecificEmployees().length > 0}>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <For each={selectedSpecificEmployees()}>
                      {(employee) => (
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs text-gray-700"
                          onClick={() => {
                            setFilterEmployeeIds(filterDraft().employeeIds.filter((id) => id !== employee.id));
                          }}
                          aria-label={`Quitar empleado específico ${employee.label}`}
                        >
                          <span>{employee.label}</span>
                          <span aria-hidden="true">×</span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </label>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-yellow-300"
                onClick={applyFilters}
                disabled={employeeReports.loading}
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                class="rounded-lg border border-yellow-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:text-gray-400"
                onClick={clearFilters}
                disabled={employeeReports.loading}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
            <table class="min-w-[1650px] w-full text-left text-sm">
              <thead class="bg-yellow-100 text-gray-700">
                <tr>
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Empleado"
                    columnKey="employee_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Cargo"
                    columnKey="job_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Semestre"
                    columnKey="semester_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Comentarios"
                    columnKey="comments"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado"
                    columnKey="created_at"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado"
                    columnKey="updated_at"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Creado por"
                    columnKey="created_by_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Actualizado por"
                    columnKey="updated_by_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <th class="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <Show
                  when={!employeeReports.loading}
                  fallback={(
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={9}>
                        Cargando reportes de empleados...
                      </td>
                    </tr>
                  )}
                >
                  <Show
                    when={!employeeReports.error}
                    fallback={(
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={9}>
                          {getErrorMessage(employeeReports.error)}
                        </td>
                      </tr>
                    )}
                  >
                    <Show
                      when={rows().length > 0}
                      fallback={(
                        <tr>
                          <td class="px-4 py-4 text-gray-600" colSpan={9}>
                            No hay reportes registrados.
                          </td>
                        </tr>
                      )}
                    >
                      <For each={rows()}>
                        {(record) => (
                          <tr class="border-t border-yellow-100 align-top">
                            <td class="px-4 py-3">{formatText(record.employee_name)}</td>
                            <td class="px-4 py-3">{formatText(record.job_name)}</td>
                            <td class="px-4 py-3">{formatText(record.semester_name)}</td>
                            <td class="px-4 py-3">{formatText(record.comments)}</td>
                            <td class="px-4 py-3">{formatDateTime(record.created_at)}</td>
                            <td class="px-4 py-3">{formatDateTime(record.updated_at)}</td>
                            <td class="px-4 py-3">{formatText(record.created_by_name)}</td>
                            <td class="px-4 py-3">{formatText(record.updated_by_name)}</td>
                            <td class="px-4 py-3">
                              <div class="flex items-center gap-2">
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-yellow-300 bg-yellow-100 text-gray-700 transition-colors hover:bg-yellow-200"
                                  aria-label={`Editar reporte ${record.id}`}
                                  onClick={() => openEdit(record)}
                                >
                                  <i class="bi bi-pencil-square" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition-colors hover:bg-red-100"
                                  aria-label={`Eliminar reporte ${record.id}`}
                                  onClick={() => setDeleteTarget(record)}
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
                </Show>
              </tbody>
            </table>
          </div>

          <PaginationControls
            class="mt-3 flex items-center justify-between"
            page={currentPage()}
            totalPages={totalPages()}
            busy={employeeReports.loading || createBusy() || editBusy() || deleteBusy()}
            onPageChange={(nextPage) => setReportPage(nextPage)}
          />

          <div class="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h3 class="text-sm font-semibold text-gray-700">Distribución de empleados</h3>
            <p class="mt-1 text-xs text-gray-600">
              Visualiza el número de empleados únicos por cargo y por semestre.
            </p>

            <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <label class="block">
                <span class="text-sm text-gray-700">Semestre (para gráfico por cargo)</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={jobChartSemesterId()}
                  onChange={(event) => setJobChartSemesterId(event.currentTarget.value)}
                  disabled={formOptionsLoading() || employeeReportsAnalytics.loading}
                >
                  <option value="">Todos los semestres</option>
                  <For each={formOptions().semesters}>
                    {(semester) => <option value={semester.id}>{semester.label}</option>}
                  </For>
                </select>
              </label>

              <label class="block">
                <span class="text-sm text-gray-700">Cargo (para gráfico por semestre)</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={semesterChartJobId()}
                  onChange={(event) => setSemesterChartJobId(event.currentTarget.value)}
                  disabled={formOptionsLoading() || employeeReportsAnalytics.loading}
                >
                  <option value="">Todos los cargos</option>
                  <For each={formOptions().jobs}>
                    {(job) => <option value={job.id}>{job.label}</option>}
                  </For>
                </select>
              </label>
            </div>

            <Show
              when={!employeeReportsAnalytics.loading}
              fallback={(
                <div class="mt-4 rounded-lg border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-600">
                  Cargando gráficas de empleados...
                </div>
              )}
            >
              <Show
                when={!employeeReportsAnalytics.error}
                fallback={(
                  <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {getErrorMessage(employeeReportsAnalytics.error)}
                  </div>
                )}
              >
                <Show
                  when={analyticsRows().length > 0}
                  fallback={(
                    <div class="mt-4 rounded-lg border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-600">
                      No hay datos suficientes para generar las gráficas.
                    </div>
                  )}
                >
                  <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div class="rounded-lg border border-yellow-200 bg-white p-4">
                      <h4 class="text-sm font-semibold text-gray-700">Empleados por cargo</h4>
                      <div class="mt-3 h-72">
                        <canvas
                          ref={(element) => setJobChartCanvas(element)}
                          role="img"
                          aria-label="Gráfico de empleados por cargo"
                        />
                      </div>
                    </div>

                    <div class="rounded-lg border border-yellow-200 bg-white p-4">
                      <h4 class="text-sm font-semibold text-gray-700">Empleados por semestre</h4>
                      <div class="mt-3 h-72">
                        <canvas
                          ref={(element) => setSemesterChartCanvas(element)}
                          role="img"
                          aria-label="Gráfico de empleados por semestre"
                        />
                      </div>
                    </div>
                  </div>
                </Show>
              </Show>
            </Show>
          </div>
        </div>
      </div>

      <Modal
        open={createOpen()}
        title="Crear reporte de empleado"
        description="Las fechas de creación y actualización se registran automáticamente."
        confirmLabel="Crear reporte"
        busy={createBusy()}
        onConfirm={submitCreate}
        onClose={() => {
          if (createBusy()) return;
          setCreateOpen(false);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Empleado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('employee_id') }}
              value={createForm().employee_id}
              onChange={(event) => setCreateField('employee_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('employee_id')}
              aria-describedby={createFieldError('employee_id') ? 'create-report-employee-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando empleados...' : 'Selecciona un empleado'}
              </option>
              <For each={formOptions().employees}>
                {(employee) => <option value={employee.id}>{employee.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-employee-error" message={createFieldError('employee_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Cargo</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('job_id') }}
              value={createForm().job_id}
              onChange={(event) => setCreateField('job_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('job_id')}
              aria-describedby={createFieldError('job_id') ? 'create-report-job-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando cargos...' : 'Selecciona un cargo'}
              </option>
              <For each={formOptions().jobs}>
                {(job) => <option value={job.id}>{job.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-job-error" message={createFieldError('job_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Semestre</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('semester_id') }}
              value={createForm().semester_id}
              onChange={(event) => setCreateField('semester_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('semester_id')}
              aria-describedby={createFieldError('semester_id') ? 'create-report-semester-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando semestres...' : 'Selecciona un semestre'}
              </option>
              <For each={formOptions().semesters}>
                {(semester) => <option value={semester.id}>{semester.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-semester-error" message={createFieldError('semester_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Comentarios</span>
            <textarea
              class="mt-1 h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={createForm().comments}
              onInput={(event) => setCreateField('comments', event.currentTarget.value)}
              disabled={createBusy()}
            />
          </label>

          <Show when={createError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {createError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={editTarget() !== null}
        title="Editar reporte de empleado"
        description="La fecha de creación no se puede modificar."
        confirmLabel="Guardar cambios"
        busy={editBusy()}
        onConfirm={submitEdit}
        onClose={() => {
          if (editBusy()) return;
          setEditTarget(null);
        }}
      >
        <div class="space-y-3">
          <label class="block">
            <span class="text-sm text-gray-700">Empleado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('employee_id') }}
              value={editForm().employee_id}
              onChange={(event) => setEditField('employee_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('employee_id')}
              aria-describedby={editFieldError('employee_id') ? 'edit-report-employee-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando empleados...' : 'Selecciona un empleado'}
              </option>
              <For each={formOptions().employees}>
                {(employee) => <option value={employee.id}>{employee.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-employee-error" message={editFieldError('employee_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Cargo</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('job_id') }}
              value={editForm().job_id}
              onChange={(event) => setEditField('job_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('job_id')}
              aria-describedby={editFieldError('job_id') ? 'edit-report-job-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando cargos...' : 'Selecciona un cargo'}
              </option>
              <For each={formOptions().jobs}>
                {(job) => <option value={job.id}>{job.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-job-error" message={editFieldError('job_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Semestre</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('semester_id') }}
              value={editForm().semester_id}
              onChange={(event) => setEditField('semester_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('semester_id')}
              aria-describedby={editFieldError('semester_id') ? 'edit-report-semester-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando semestres...' : 'Selecciona un semestre'}
              </option>
              <For each={formOptions().semesters}>
                {(semester) => <option value={semester.id}>{semester.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-semester-error" message={editFieldError('semester_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Comentarios</span>
            <textarea
              class="mt-1 h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={editForm().comments}
              onInput={(event) => setEditField('comments', event.currentTarget.value)}
              disabled={editBusy()}
            />
          </label>

          <Show when={editError()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {editError()}
            </div>
          </Show>
        </div>
      </Modal>

      <Modal
        open={deleteTarget() !== null}
        title="Eliminar reporte de empleado"
        description={`Esta acción realizará eliminación lógica del reporte de ${deleteTarget()?.employee_name ?? 'empleado seleccionado'}.`}
        confirmLabel="Eliminar"
        variant="danger"
        busy={deleteBusy()}
        onConfirm={confirmDelete}
        onClose={() => {
          if (deleteBusy()) return;
          setDeleteTarget(null);
        }}
      />
    </section>
  );
}
