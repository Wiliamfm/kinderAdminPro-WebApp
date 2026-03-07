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
  createBulletinStudent,
  listBulletinStudentFormOptions,
  listBulletinStudentsAnalyticsRecords,
  listBulletinsStudentsPage,
  softDeleteBulletinStudent,
  updateBulletinStudent,
  type BulletinStudentAnalyticsRecord,
  type BulletinStudentFormOptions,
  type BulletinStudentListSortField,
  type BulletinStudentRecord,
} from '../lib/pocketbase/bulletins-students';
import { clampPage, DEFAULT_TABLE_PAGE_SIZE } from '../lib/table/pagination';
import { toggleSort, type SortState } from '../lib/table/sorting';

type BulletinStudentForm = {
  bulletin_id: string;
  student_id: string;
  grade_id: string;
  semester_id: string;
  note: string;
  comments: string;
};

type ReportFilters = {
  gradeId: string;
  semesterId: string;
  studentIds: string[];
};

const BULLETIN_STUDENT_FIELDS = [
  'bulletin_id',
  'student_id',
  'grade_id',
  'semester_id',
  'note',
] as const;

type BulletinStudentField = (typeof BULLETIN_STUDENT_FIELDS)[number];
type BulletinStudentSortKey = BulletinStudentListSortField;
type StudentLookupOption = {
  id: string;
  label: string;
  lookupValue: string;
};

type BarChartPoint = {
  label: string;
  value: number;
};

const emptyForm: BulletinStudentForm = {
  bulletin_id: '',
  student_id: '',
  grade_id: '',
  semester_id: '',
  note: '',
  comments: '',
};

function createEmptyReportFilters(): ReportFilters {
  return {
    gradeId: '',
    semesterId: '',
    studentIds: [],
  };
}

function getLastItems<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items;
  return items.slice(items.length - count);
}

const emptyFormOptions: BulletinStudentFormOptions = {
  bulletins: [],
  students: [],
  grades: [],
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

function formatNote(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return '—';
}

function validateForm(form: BulletinStudentForm): FieldErrorMap<BulletinStudentField> {
  const errors: FieldErrorMap<BulletinStudentField> = {};

  if (form.bulletin_id.trim().length === 0) {
    errors.bulletin_id = 'Boletín es obligatorio.';
  }

  if (form.student_id.trim().length === 0) {
    errors.student_id = 'Estudiante es obligatorio.';
  }

  if (form.grade_id.trim().length === 0) {
    errors.grade_id = 'Grado es obligatorio.';
  }

  if (form.semester_id.trim().length === 0) {
    errors.semester_id = 'Semestre es obligatorio.';
  }

  const noteRaw = form.note.trim();
  if (noteRaw.length === 0) {
    errors.note = 'Nota es obligatoria.';
    return errors;
  }

  const noteNumber = Number(noteRaw);
  if (!Number.isFinite(noteNumber) || !Number.isInteger(noteNumber)) {
    errors.note = 'Nota debe ser un número entero válido.';
    return errors;
  }

  if (noteNumber <= 0) {
    errors.note = 'Nota debe ser mayor que 0.';
  }

  return errors;
}

function buildPayload(form: BulletinStudentForm) {
  return {
    bulletin_id: form.bulletin_id,
    student_id: form.student_id,
    grade_id: form.grade_id,
    semester_id: form.semester_id,
    note: Number(form.note.trim()),
    comments: form.comments,
  };
}

function toFormNoteValue(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

export default function ReportsStudentsPage() {
  const navigate = useNavigate();

  const [reportPage, setReportPage] = createSignal(1);
  const [reportSort, setReportSort] = createSignal<SortState<BulletinStudentSortKey>>({
    key: 'created_at',
    direction: 'desc',
  });

  const [actionError, setActionError] = createSignal<string | null>(null);

  const [formOptions, setFormOptions] = createSignal<BulletinStudentFormOptions>(emptyFormOptions);
  const [formOptionsLoading, setFormOptionsLoading] = createSignal(false);
  const [formOptionsLoaded, setFormOptionsLoaded] = createSignal(false);
  const [filterDraft, setFilterDraft] = createSignal<ReportFilters>(createEmptyReportFilters());
  const [appliedFilters, setAppliedFilters] = createSignal<ReportFilters>(createEmptyReportFilters());
  const [studentLookupInput, setStudentLookupInput] = createSignal('');

  const loadFormOptions = async (force = false): Promise<void> => {
    if (!isAuthUserAdmin()) return;
    if (formOptionsLoading()) return;
    if (formOptionsLoaded() && !force) return;

    setFormOptionsLoading(true);
    try {
      const options = await listBulletinStudentFormOptions();
      setFormOptions(options);
      setFormOptionsLoaded(true);
    } catch (error) {
      if (isAbortLikeError(error)) {
        console.warn('Ignoring auto-cancelled bulletin student options request in reports students page.', error);
      } else {
        console.error('Failed to load bulletin student options in reports students page.', error);
      }

      if (!formOptionsLoaded()) {
        setFormOptions(emptyFormOptions);
      }
    } finally {
      setFormOptionsLoading(false);
    }
  };

  const [bulletinsStudents, { refetch }] = createResource(
    () => {
      if (!isAuthUserAdmin()) return undefined;
      const filters = appliedFilters();
      return {
        page: reportPage(),
        sortField: reportSort().key,
        sortDirection: reportSort().direction,
        gradeId: filters.gradeId,
        semesterId: filters.semesterId,
        studentIds: filters.studentIds,
      };
    },
    ({ page, sortField, sortDirection, gradeId, semesterId, studentIds }) => listBulletinsStudentsPage(
      page,
      DEFAULT_TABLE_PAGE_SIZE,
      {
        sortField,
        sortDirection,
        gradeId,
        semesterId,
        studentIds,
      },
    ),
  );

  const [bulletinsStudentsAnalytics] = createResource(
    () => (isAuthUserAdmin() ? true : undefined),
    () => listBulletinStudentsAnalyticsRecords(),
  );

  const [gradeChartSemesterId, setGradeChartSemesterId] = createSignal('');
  const [semesterChartGradeId, setSemesterChartGradeId] = createSignal('');
  const [gradeChartCanvas, setGradeChartCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  const [semesterChartCanvas, setSemesterChartCanvas] = createSignal<HTMLCanvasElement | undefined>(undefined);
  let gradeChartInstance: Chart | null = null;
  let semesterChartInstance: Chart | null = null;

  const [createOpen, setCreateOpen] = createSignal(false);
  const [createForm, setCreateForm] = createSignal<BulletinStudentForm>(emptyForm);
  const [createTouched, setCreateTouched] = createSignal(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
  const [createBusy, setCreateBusy] = createSignal(false);
  const [createError, setCreateError] = createSignal<string | null>(null);

  const [editTarget, setEditTarget] = createSignal<BulletinStudentRecord | null>(null);
  const [editForm, setEditForm] = createSignal<BulletinStudentForm>(emptyForm);
  const [editTouched, setEditTouched] = createSignal(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
  const [editBusy, setEditBusy] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);

  const [deleteTarget, setDeleteTarget] = createSignal<BulletinStudentRecord | null>(null);
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

  const createFieldError = (field: BulletinStudentField) => (
    createTouched()[field] ? createFieldErrors()[field] : undefined
  );

  const editFieldError = (field: BulletinStudentField) => (
    editTouched()[field] ? editFieldErrors()[field] : undefined
  );

  const setCreateField = (field: keyof BulletinStudentForm, value: string) => {
    setCreateForm((current) => ({ ...current, [field]: value }));
    if ((BULLETIN_STUDENT_FIELDS as readonly string[]).includes(field)) {
      setCreateTouched((current) => touchField(current, field as BulletinStudentField));
    }
    setCreateError(null);
  };

  const setEditField = (field: keyof BulletinStudentForm, value: string) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    if ((BULLETIN_STUDENT_FIELDS as readonly string[]).includes(field)) {
      setEditTouched((current) => touchField(current, field as BulletinStudentField));
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
      await createBulletinStudent(buildPayload(createForm()));
      await refetch();
      setCreateOpen(false);
      setCreateForm(emptyForm);
      setCreateTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreateBusy(false);
    }
  };

  const openEdit = (record: BulletinStudentRecord) => {
    void loadFormOptions();
    setEditTarget(record);
    setEditError(null);
    setEditTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
    setEditForm({
      bulletin_id: record.bulletin_id,
      student_id: record.student_id,
      grade_id: record.grade_id,
      semester_id: record.semester_id,
      note: toFormNoteValue(record.note),
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
      await updateBulletinStudent(target.id, buildPayload(editForm()));
      await refetch();
      setEditTarget(null);
      setEditForm(emptyForm);
      setEditTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
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
      await softDeleteBulletinStudent(target.id);
      await refetch();
      const totalPages = bulletinsStudents()?.totalPages ?? 1;
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

  const rows = () => bulletinsStudents()?.items ?? [];
  const currentPage = () => bulletinsStudents()?.page ?? 1;
  const totalPages = () => bulletinsStudents()?.totalPages ?? 1;

  const handleSort = (key: BulletinStudentSortKey) => {
    setReportSort((current) => toggleSort(current, key));
    setReportPage(1);
  };

  const setFilterField = (field: Exclude<keyof ReportFilters, 'studentIds'>, value: string) => {
    setFilterDraft((current) => ({ ...current, [field]: value }));
  };

  const setFilterStudentIds = (ids: string[]) => {
    const normalizedIds = [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
    setFilterDraft((current) => ({ ...current, studentIds: normalizedIds }));
  };

  const availableStudentLookupOptions = createMemo<StudentLookupOption[]>(() => {
    const selectedIds = new Set(filterDraft().studentIds);

    return formOptions().students
      .filter((student) => !selectedIds.has(student.id))
      .map((student) => ({
        id: student.id,
        label: student.label,
        lookupValue: `${student.label} · ${student.id}`,
      }));
  });

  const studentLookupOptions = createMemo<StudentLookupOption[]>(() => {
    const query = studentLookupInput().trim().toLocaleLowerCase('es-CO');
    if (query.length === 0) return [];

    return availableStudentLookupOptions()
      .filter((student) => student.label.toLocaleLowerCase('es-CO').includes(query))
      .slice(0, 20);
  });

  const selectedSpecificStudents = createMemo(() => {
    const optionsById = new Map(formOptions().students.map((student) => [student.id, student.label]));
    return filterDraft().studentIds.map((studentId) => ({
      id: studentId,
      label: optionsById.get(studentId) ?? studentId,
    }));
  });

  const tryAddSpecificStudent = (rawValue: string) => {
    const value = rawValue.trim();
    if (value.length === 0) return;

    const matchedOption = availableStudentLookupOptions().find((option) => option.lookupValue === value);
    if (!matchedOption) return;

    setFilterStudentIds([...filterDraft().studentIds, matchedOption.id]);
    setStudentLookupInput('');
  };

  const analyticsRows = createMemo<BulletinStudentAnalyticsRecord[]>(() => (
    bulletinsStudentsAnalytics.latest ?? []
  ));
  const gradeLabelById = createMemo(() => new Map(formOptions().grades.map((grade) => [grade.id, grade.label])));
  const semesterLabelById = createMemo(() => (
    new Map(formOptions().semesters.map((semester) => [semester.id, semester.label]))
  ));
  const gradeIdsOrdered = createMemo(() => (
    formOptions().grades
      .map((grade) => grade.id.trim())
      .filter((id) => id.length > 0)
  ));
  const semesterIdsOrdered = createMemo(() => (
    formOptions().semesters
      .map((semester) => semester.id.trim())
      .filter((id) => id.length > 0)
  ));

  createEffect(() => {
    const selectedSemesterId = gradeChartSemesterId().trim();
    if (selectedSemesterId.length === 0) return;
    if (!semesterIdsOrdered().includes(selectedSemesterId)) {
      setGradeChartSemesterId('');
    }
  });

  createEffect(() => {
    const selectedGradeId = semesterChartGradeId().trim();
    if (selectedGradeId.length === 0) return;
    if (!gradeIdsOrdered().includes(selectedGradeId)) {
      setSemesterChartGradeId('');
    }
  });

  const gradeChartPoints = createMemo<BarChartPoint[]>(() => {
    const selectedSemesterId = gradeChartSemesterId().trim();
    const filteredRows = analyticsRows().filter((row) => (
      selectedSemesterId.length === 0 || row.semester_id === selectedSemesterId
    ));

    const visibleGradeIds = gradeIdsOrdered();

    if (visibleGradeIds.length === 0) return [];

    const visibleGradeIdSet = new Set(visibleGradeIds);
    const uniqueByGradeStudent = new Set<string>();
    const countsByGradeId = new Map(visibleGradeIds.map((gradeId) => [gradeId, 0]));

    for (const row of filteredRows) {
      if (!visibleGradeIdSet.has(row.grade_id)) continue;
      const key = `${row.grade_id}::${row.student_id}`;
      if (uniqueByGradeStudent.has(key)) continue;
      uniqueByGradeStudent.add(key);
      countsByGradeId.set(row.grade_id, (countsByGradeId.get(row.grade_id) ?? 0) + 1);
    }

    const labels = gradeLabelById();
    return visibleGradeIds.map((gradeId) => ({
      label: labels.get(gradeId) ?? gradeId,
      value: countsByGradeId.get(gradeId) ?? 0,
    }));
  });

  const semesterChartPoints = createMemo<BarChartPoint[]>(() => {
    const selectedGradeId = semesterChartGradeId().trim();
    const filteredRows = analyticsRows().filter((row) => (
      selectedGradeId.length === 0 || row.grade_id === selectedGradeId
    ));

    const visibleSemesterIds = selectedGradeId.length === 0
      ? getLastItems(semesterIdsOrdered(), 5)
      : semesterIdsOrdered();

    if (visibleSemesterIds.length === 0) return [];

    const visibleSemesterIdSet = new Set(visibleSemesterIds);
    const uniqueBySemesterStudent = new Set<string>();
    const countsBySemesterId = new Map(visibleSemesterIds.map((semesterId) => [semesterId, 0]));

    for (const row of filteredRows) {
      if (!visibleSemesterIdSet.has(row.semester_id)) continue;
      const key = `${row.semester_id}::${row.student_id}`;
      if (uniqueBySemesterStudent.has(key)) continue;
      uniqueBySemesterStudent.add(key);
      countsBySemesterId.set(row.semester_id, (countsBySemesterId.get(row.semester_id) ?? 0) + 1);
    }

    const labels = semesterLabelById();
    return visibleSemesterIds.map((semesterId) => ({
      label: labels.get(semesterId) ?? semesterId,
      value: countsBySemesterId.get(semesterId) ?? 0,
    }));
  });

  createEffect(() => {
    const canvas = gradeChartCanvas();
    const points = gradeChartPoints();
    const selectedSemesterId = gradeChartSemesterId().trim();

    if (!canvas) return;

    gradeChartInstance?.destroy();
    gradeChartInstance = null;

    if (points.length === 0) return;

    const semesterLabel = semesterLabelById().get(selectedSemesterId) ?? selectedSemesterId;
    gradeChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: selectedSemesterId.length > 0
              ? `Estudiantes (${semesterLabel})`
              : 'Estudiantes (todos los grados)',
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
    const selectedGradeId = semesterChartGradeId().trim();

    if (!canvas) return;

    semesterChartInstance?.destroy();
    semesterChartInstance = null;

    if (points.length === 0) return;

    const gradeLabel = gradeLabelById().get(selectedGradeId) ?? selectedGradeId;
    semesterChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: points.map((point) => point.label),
        datasets: [
          {
            label: selectedGradeId.length > 0
              ? `Estudiantes (${gradeLabel})`
              : 'Estudiantes (últimos 5 semestres)',
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
    gradeChartInstance?.destroy();
    semesterChartInstance?.destroy();
    gradeChartInstance = null;
    semesterChartInstance = null;
  });

  const applyFilters = () => {
    const normalized: ReportFilters = {
      gradeId: filterDraft().gradeId.trim(),
      semesterId: filterDraft().semesterId.trim(),
      studentIds: [...new Set(filterDraft().studentIds.map((id) => id.trim()).filter((id) => id.length > 0))],
    };

    setFilterDraft(normalized);
    setAppliedFilters(normalized);
    setReportPage(1);
  };

  const clearFilters = () => {
    const emptyFilters = createEmptyReportFilters();
    setFilterDraft(emptyFilters);
    setAppliedFilters(emptyFilters);
    setStudentLookupInput('');
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
              <h1 class="text-2xl font-semibold">Informe de estudiantes</h1>
              <p class="mt-1 text-sm text-gray-600">
                Consulta y administra los reportes académicos asociados a boletines por estudiante.
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
              <h2 class="text-xl font-semibold">Estudiantes</h2>
              <p class="mt-1 text-sm text-gray-600">
                Gestiona el registro de notas y observaciones por boletín, grado y semestre.
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
                setCreateTouched(createInitialTouchedMap(BULLETIN_STUDENT_FIELDS));
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
                <span class="text-sm text-gray-700">Grado</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={filterDraft().gradeId}
                  onChange={(event) => setFilterField('gradeId', event.currentTarget.value)}
                  disabled={formOptionsLoading() || bulletinsStudents.loading}
                >
                  <option value="">Todos los grados</option>
                  <For each={formOptions().grades}>
                    {(grade) => <option value={grade.id}>{grade.label}</option>}
                  </For>
                </select>
              </label>

              <label class="block">
                <span class="text-sm text-gray-700">Semestre</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={filterDraft().semesterId}
                  onChange={(event) => setFilterField('semesterId', event.currentTarget.value)}
                  disabled={formOptionsLoading() || bulletinsStudents.loading}
                >
                  <option value="">Todos los semestres</option>
                  <For each={formOptions().semesters}>
                    {(semester) => <option value={semester.id}>{semester.label}</option>}
                  </For>
                </select>
              </label>

              <label class="block md:col-span-2">
                <span class="text-sm text-gray-700">Seleccionar estudiantes específicos</span>
                <input
                  type="text"
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={studentLookupInput()}
                  onInput={(event) => {
                    const nextValue = event.currentTarget.value;
                    setStudentLookupInput(nextValue);
                    tryAddSpecificStudent(nextValue);
                  }}
                  disabled={formOptionsLoading() || bulletinsStudents.loading}
                  placeholder="Escribe para buscar estudiantes"
                  list={studentLookupInput().trim().length > 0 ? 'reports-students-specific-student-list' : undefined}
                  aria-label="Seleccionar estudiantes específicos"
                />
                <Show when={studentLookupInput().trim().length > 0 && studentLookupOptions().length > 0}>
                  <datalist id="reports-students-specific-student-list">
                    <For each={studentLookupOptions()}>
                      {(option) => <option value={option.lookupValue}>{option.label}</option>}
                    </For>
                  </datalist>
                </Show>
                <p class="mt-1 text-xs text-gray-600">
                  La lista aparece cuando comienzas a escribir. Seleccionar uno o más estudiantes aplica filtro exacto.
                </p>
                <Show when={selectedSpecificStudents().length > 0}>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <For each={selectedSpecificStudents()}>
                      {(student) => (
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs text-gray-700"
                          onClick={() => {
                            setFilterStudentIds(filterDraft().studentIds.filter((id) => id !== student.id));
                          }}
                          aria-label={`Quitar estudiante específico ${student.label}`}
                        >
                          <span>{student.label}</span>
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
                disabled={bulletinsStudents.loading}
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                class="rounded-lg border border-yellow-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-yellow-100 disabled:cursor-not-allowed disabled:text-gray-400"
                onClick={clearFilters}
                disabled={bulletinsStudents.loading}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
            <table class="min-w-[1850px] w-full text-left text-sm">
              <thead class="bg-yellow-100 text-gray-700">
                <tr>
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Boletin"
                    columnKey="bulletin_label"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Estudiante"
                    columnKey="student_name"
                    sort={reportSort()}
                    onSort={handleSort}
                  />
                  <SortableHeaderCell
                    class="px-4 py-3 font-semibold"
                    label="Grado"
                    columnKey="grade_name"
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
                    label="Nota"
                    columnKey="note"
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
                  when={!bulletinsStudents.loading}
                  fallback={(
                    <tr>
                      <td class="px-4 py-4 text-gray-600" colSpan={11}>
                        Cargando reportes de estudiantes...
                      </td>
                    </tr>
                  )}
                >
                  <Show
                    when={!bulletinsStudents.error}
                    fallback={(
                      <tr>
                        <td class="px-4 py-4 text-red-700" colSpan={11}>
                          {getErrorMessage(bulletinsStudents.error)}
                        </td>
                      </tr>
                    )}
                  >
                    <Show
                      when={rows().length > 0}
                      fallback={(
                        <tr>
                          <td class="px-4 py-4 text-gray-600" colSpan={11}>
                            No hay reportes registrados.
                          </td>
                        </tr>
                      )}
                    >
                      <For each={rows()}>
                        {(record) => (
                          <tr class="border-t border-yellow-100 align-top">
                            <td class="px-4 py-3">{formatText(record.bulletin_label)}</td>
                            <td class="px-4 py-3">{formatText(record.student_name)}</td>
                            <td class="px-4 py-3">{formatText(record.grade_name)}</td>
                            <td class="px-4 py-3">{formatText(record.semester_name)}</td>
                            <td class="px-4 py-3">{formatNote(record.note)}</td>
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
            busy={bulletinsStudents.loading || createBusy() || editBusy() || deleteBusy()}
            onPageChange={(nextPage) => setReportPage(nextPage)}
          />

          <div class="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h3 class="text-sm font-semibold text-gray-700">Distribución de estudiantes</h3>
            <p class="mt-1 text-xs text-gray-600">
              Visualiza el número de estudiantes únicos por grado y por semestre.
            </p>

            <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <label class="block">
                <span class="text-sm text-gray-700">Semestre (para gráfico por grado)</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={gradeChartSemesterId()}
                  onChange={(event) => setGradeChartSemesterId(event.currentTarget.value)}
                  disabled={formOptionsLoading() || bulletinsStudentsAnalytics.loading}
                >
                  <option value="">Todos los semestres</option>
                  <For each={formOptions().semesters}>
                    {(semester) => <option value={semester.id}>{semester.label}</option>}
                  </For>
                </select>
              </label>

              <label class="block">
                <span class="text-sm text-gray-700">Grado (para gráfico por semestre)</span>
                <select
                  class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={semesterChartGradeId()}
                  onChange={(event) => setSemesterChartGradeId(event.currentTarget.value)}
                  disabled={formOptionsLoading() || bulletinsStudentsAnalytics.loading}
                >
                  <option value="">Todos los grados</option>
                  <For each={formOptions().grades}>
                    {(grade) => <option value={grade.id}>{grade.label}</option>}
                  </For>
                </select>
              </label>
            </div>

            <Show
              when={!bulletinsStudentsAnalytics.loading}
              fallback={(
                <div class="mt-4 rounded-lg border border-yellow-200 bg-white px-4 py-3 text-sm text-gray-600">
                  Cargando gráficas de estudiantes...
                </div>
              )}
            >
              <Show
                when={!bulletinsStudentsAnalytics.error}
                fallback={(
                  <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {getErrorMessage(bulletinsStudentsAnalytics.error)}
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
                      <h4 class="text-sm font-semibold text-gray-700">Estudiantes por grado</h4>
                      <div class="mt-3 h-72">
                        <canvas
                          ref={(element) => setGradeChartCanvas(element)}
                          role="img"
                          aria-label="Gráfico de estudiantes por grado"
                        />
                      </div>
                    </div>

                    <div class="rounded-lg border border-yellow-200 bg-white p-4">
                      <h4 class="text-sm font-semibold text-gray-700">Estudiantes por semestre</h4>
                      <div class="mt-3 h-72">
                        <canvas
                          ref={(element) => setSemesterChartCanvas(element)}
                          role="img"
                          aria-label="Gráfico de estudiantes por semestre"
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
        title="Crear reporte de estudiante"
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
            <span class="text-sm text-gray-700">Boletín</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('bulletin_id') }}
              value={createForm().bulletin_id}
              onChange={(event) => setCreateField('bulletin_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('bulletin_id')}
              aria-describedby={createFieldError('bulletin_id') ? 'create-report-bulletin-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando boletines...' : 'Selecciona un boletín'}
              </option>
              <For each={formOptions().bulletins}>
                {(bulletin) => <option value={bulletin.id}>{bulletin.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-bulletin-error" message={createFieldError('bulletin_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Estudiante</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('student_id') }}
              value={createForm().student_id}
              onChange={(event) => setCreateField('student_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('student_id')}
              aria-describedby={createFieldError('student_id') ? 'create-report-student-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando estudiantes...' : 'Selecciona un estudiante'}
              </option>
              <For each={formOptions().students}>
                {(student) => <option value={student.id}>{student.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-student-error" message={createFieldError('student_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Grado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('grade_id') }}
              value={createForm().grade_id}
              onChange={(event) => setCreateField('grade_id', event.currentTarget.value)}
              disabled={createBusy() || formOptionsLoading()}
              aria-invalid={!!createFieldError('grade_id')}
              aria-describedby={createFieldError('grade_id') ? 'create-report-grade-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando grados...' : 'Selecciona un grado'}
              </option>
              <For each={formOptions().grades}>
                {(grade) => <option value={grade.id}>{grade.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="create-report-grade-error" message={createFieldError('grade_id')} />
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
            <span class="text-sm text-gray-700">Nota</span>
            <input
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!createFieldError('note') }}
              value={createForm().note}
              onInput={(event) => setCreateField('note', event.currentTarget.value)}
              disabled={createBusy()}
              aria-invalid={!!createFieldError('note')}
              aria-describedby={createFieldError('note') ? 'create-report-note-error' : undefined}
            />
            <InlineFieldAlert id="create-report-note-error" message={createFieldError('note')} />
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
        title="Editar reporte de estudiante"
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
            <span class="text-sm text-gray-700">Boletín</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('bulletin_id') }}
              value={editForm().bulletin_id}
              onChange={(event) => setEditField('bulletin_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('bulletin_id')}
              aria-describedby={editFieldError('bulletin_id') ? 'edit-report-bulletin-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando boletines...' : 'Selecciona un boletín'}
              </option>
              <For each={formOptions().bulletins}>
                {(bulletin) => <option value={bulletin.id}>{bulletin.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-bulletin-error" message={editFieldError('bulletin_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Estudiante</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('student_id') }}
              value={editForm().student_id}
              onChange={(event) => setEditField('student_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('student_id')}
              aria-describedby={editFieldError('student_id') ? 'edit-report-student-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando estudiantes...' : 'Selecciona un estudiante'}
              </option>
              <For each={formOptions().students}>
                {(student) => <option value={student.id}>{student.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-student-error" message={editFieldError('student_id')} />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Grado</span>
            <select
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('grade_id') }}
              value={editForm().grade_id}
              onChange={(event) => setEditField('grade_id', event.currentTarget.value)}
              disabled={editBusy() || formOptionsLoading()}
              aria-invalid={!!editFieldError('grade_id')}
              aria-describedby={editFieldError('grade_id') ? 'edit-report-grade-error' : undefined}
            >
              <option value="">
                {formOptionsLoading() ? 'Cargando grados...' : 'Selecciona un grado'}
              </option>
              <For each={formOptions().grades}>
                {(grade) => <option value={grade.id}>{grade.label}</option>}
              </For>
            </select>
            <InlineFieldAlert id="edit-report-grade-error" message={editFieldError('grade_id')} />
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
            <span class="text-sm text-gray-700">Nota</span>
            <input
              type="number"
              min="1"
              step="1"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              classList={{ 'field-input-invalid': !!editFieldError('note') }}
              value={editForm().note}
              onInput={(event) => setEditField('note', event.currentTarget.value)}
              disabled={editBusy()}
              aria-invalid={!!editFieldError('note')}
              aria-describedby={editFieldError('note') ? 'edit-report-note-error' : undefined}
            />
            <InlineFieldAlert id="edit-report-note-error" message={editFieldError('note')} />
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
        title="Eliminar reporte de estudiante"
        description={`Esta acción realizará eliminación lógica del reporte de ${deleteTarget()?.student_name ?? 'estudiante seleccionado'}.`}
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
