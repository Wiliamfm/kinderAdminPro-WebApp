import { useNavigate } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { type BulletinStudentRecord } from '../lib/pocketbase/bulletins-students';
import type { PocketBaseRequestError } from '../lib/pocketbase/errors';
import {
  listFatherBulletin,
  listFatherStudents,
  type FatherStudentRecord,
  type FatherStudentStatus,
} from '../lib/pocketbase/father-portal';
import { canAccessModule } from '../lib/pocketbase/auth';
import { downloadBase64File } from '../lib/reports/download';
import { exportFatherStudentReport } from '../lib/server/exports/father-student-report';

type BulletinGroup = {
  key: string;
  gradeName: string;
  semesterName: string;
  items: BulletinStudentRecord[];
};

function formatText(value: unknown, fallback = '—'): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function formatNote(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  const trimmed = String(value ?? '').trim();
  return trimmed.length > 0 ? trimmed : '—';
}

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

function groupBulletins(records: BulletinStudentRecord[]): BulletinGroup[] {
  const groups: BulletinGroup[] = [];

  for (const record of records) {
    const gradeName = formatText(record.grade_name, 'Sin grado');
    const semesterName = formatText(record.semester_name, 'Sin trimestre');
    const key = `${gradeName}::${semesterName}`;
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.items.push(record);
      continue;
    }

    groups.push({
      key,
      gradeName,
      semesterName,
      items: [record],
    });
  }

  return groups;
}

function statusClasses(status: FatherStudentStatus): string {
  if (status === 'Activo') {
    return 'border-green-200 bg-green-50 text-green-700';
  }

  if (status === 'Pendiente') {
    return 'border-yellow-200 bg-yellow-50 text-yellow-800';
  }

  if (status === 'Rechazado') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-gray-200 bg-gray-100 text-gray-700';
}

export default function FatherPortalPage() {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = createSignal<string[]>([]);
  const [bulletinsByStudentId, setBulletinsByStudentId] = createSignal<Record<string, BulletinStudentRecord[]>>({});
  const [bulletinErrors, setBulletinErrors] = createSignal<Record<string, string>>({});
  const [loadingStudentIds, setLoadingStudentIds] = createSignal<string[]>([]);
  const [exportingStudentIds, setExportingStudentIds] = createSignal<string[]>([]);
  const [actionError, setActionError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!canAccessModule('father-portal')) {
      navigate('/', { replace: true });
    }
  });

  const [students] = createResource(
    () => (canAccessModule('father-portal') ? true : undefined),
    () => listFatherStudents(),
  );

  const isExpanded = (studentId: string) => expandedIds().includes(studentId);
  const isLoadingBulletins = (studentId: string) => loadingStudentIds().includes(studentId);
  const isExporting = (studentId: string) => exportingStudentIds().includes(studentId);
  const hasBulletinsLoaded = (studentId: string) => Object.hasOwn(bulletinsByStudentId(), studentId);

  const addStudentId = (current: string[], studentId: string) => (
    current.includes(studentId) ? current : [...current, studentId]
  );
  const removeStudentId = (current: string[], studentId: string) => current.filter((value) => value !== studentId);

  const loadBulletins = async (studentId: string) => {
    if (isLoadingBulletins(studentId) || hasBulletinsLoaded(studentId)) {
      return;
    }

    setLoadingStudentIds((current) => addStudentId(current, studentId));
    setBulletinErrors((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });

    try {
      const result = await listFatherBulletin(studentId);
      setBulletinsByStudentId((current) => ({ ...current, [studentId]: result }));
    } catch (error) {
      setBulletinErrors((current) => ({ ...current, [studentId]: getErrorMessage(error) }));
    } finally {
      setLoadingStudentIds((current) => removeStudentId(current, studentId));
    }
  };

  const toggleStudent = async (studentId: string) => {
    if (isExpanded(studentId)) {
      setExpandedIds((current) => removeStudentId(current, studentId));
      return;
    }

    setExpandedIds((current) => addStudentId(current, studentId));
    await loadBulletins(studentId);
  };

  const handleExport = async (student: FatherStudentRecord) => {
    setActionError(null);
    setExportingStudentIds((current) => addStudentId(current, student.id));

    try {
      const result = await exportFatherStudentReport(student.id);
      downloadBase64File(result.fileName, result.data, result.mimeType);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setExportingStudentIds((current) => removeStudentId(current, student.id));
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-6xl space-y-6">
        <div class="rounded-2xl border border-yellow-300 bg-white p-5 shadow-sm sm:p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 class="text-2xl font-semibold">Portal de acudientes</h1>
              <p class="mt-2 text-sm text-gray-600 sm:text-base">
                Consulta el estado de matrícula y los boletines de los estudiantes vinculados a tu cuenta.
              </p>
            </div>

            <button
              type="button"
              class="rounded-lg border border-yellow-300 bg-yellow-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-yellow-200"
              onClick={() => navigate('/')}
            >
              Ir al inicio
            </button>
          </div>
        </div>

        <Show when={actionError()}>
          {(message) => (
            <div class="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message()}
            </div>
          )}
        </Show>

        <div class="rounded-2xl border border-yellow-300 bg-white p-5 shadow-sm sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold">Estudiantes vinculados</h2>
              <p class="text-sm text-gray-600">
                Abre cada estudiante para ver sus boletines y exportar el reporte en PDF.
              </p>
            </div>
          </div>

          <Show
            when={!students.loading}
            fallback={(
              <div class="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-6 text-sm text-gray-600">
                Cargando estudiantes vinculados...
              </div>
            )}
          >
            <Show
              when={!students.error}
              fallback={(
                <div class="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {getErrorMessage(students.error)}
                </div>
              )}
            >
              <Show
                when={(students() ?? []).length > 0}
                fallback={(
                  <div class="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-6 text-sm text-gray-600">
                    No hay estudiantes vinculados. Contacte al administrador.
                  </div>
                )}
              >
                <div class="mt-6 space-y-4">
                  <For each={students() ?? []}>
                    {(student) => {
                      const bulletins = () => bulletinsByStudentId()[student.id] ?? [];
                      const studentBulletinError = () => bulletinErrors()[student.id];

                      return (
                        <article class="overflow-hidden rounded-2xl border border-yellow-200 bg-yellow-50">
                          <div class="flex flex-col gap-4 p-4 sm:p-5">
                            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div class="space-y-3">
                                <div>
                                  <h3 class="text-lg font-semibold text-gray-900">{formatText(student.name, 'Sin nombre')}</h3>
                                  <p class="text-sm text-gray-600">
                                    Documento: {formatText(student.documentId)}
                                  </p>
                                </div>

                                <div class="flex flex-wrap gap-2">
                                  <span class="rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                                    Grado: {formatText(student.gradeName, 'Sin grado')}
                                  </span>
                                  <span class={`rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(student.status)}`}>
                                    {student.status}
                                  </span>
                                </div>
                              </div>

                              <div class="flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  class="rounded-lg border border-yellow-300 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-yellow-100"
                                  onClick={() => void toggleStudent(student.id)}
                                >
                                  {isExpanded(student.id) ? 'Ocultar boletines' : 'Ver boletines'}
                                </button>
                                <button
                                  type="button"
                                  class="rounded-lg border border-yellow-500 bg-yellow-300 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-70"
                                  disabled={isExporting(student.id)}
                                  onClick={() => void handleExport(student)}
                                >
                                  {isExporting(student.id) ? 'Exportando...' : 'Exportar PDF'}
                                </button>
                              </div>
                            </div>
                          </div>

                          <Show when={isExpanded(student.id)}>
                            <div class="border-t border-yellow-200 bg-white px-4 py-4 sm:px-5">
                              <Show
                                when={!isLoadingBulletins(student.id)}
                                fallback={(
                                  <div class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-gray-600">
                                    Cargando boletines...
                                  </div>
                                )}
                              >
                                <Show
                                  when={!studentBulletinError()}
                                  fallback={(
                                    <div class="rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-700">
                                      {studentBulletinError()}
                                    </div>
                                  )}
                                >
                                  <Show
                                    when={bulletins().length > 0}
                                    fallback={(
                                      <div class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-4 text-sm text-gray-600">
                                        No hay boletines registrados para este estudiante.
                                      </div>
                                    )}
                                  >
                                    <div class="space-y-4">
                                      <For each={groupBulletins(bulletins())}>
                                        {(group) => (
                                          <section class="rounded-2xl border border-yellow-200 bg-yellow-50">
                                            <div class="flex flex-col gap-1 border-b border-yellow-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                              <h4 class="font-semibold text-gray-900">{group.gradeName}</h4>
                                              <p class="text-sm text-gray-600">Trimestre: {group.semesterName}</p>
                                            </div>

                                            <div class="hidden overflow-x-auto md:block">
                                              <table class="min-w-full text-left text-sm">
                                                <thead class="bg-yellow-100 text-gray-700">
                                                  <tr>
                                                    <th class="px-4 py-3 font-semibold">Categoría</th>
                                                    <th class="px-4 py-3 font-semibold">Descripción</th>
                                                    <th class="px-4 py-3 font-semibold">Trimestre</th>
                                                    <th class="px-4 py-3 font-semibold">Grado</th>
                                                    <th class="px-4 py-3 font-semibold">Nota</th>
                                                    <th class="px-4 py-3 font-semibold">Comentarios</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  <For each={group.items}>
                                                    {(record) => (
                                                      <tr class="border-t border-yellow-100">
                                                        <td class="px-4 py-3">{formatText(record.bulletin_category_name)}</td>
                                                        <td class="px-4 py-3">{formatText(record.bulletin_description)}</td>
                                                        <td class="px-4 py-3">{formatText(record.semester_name)}</td>
                                                        <td class="px-4 py-3">{formatText(record.grade_name)}</td>
                                                        <td class="px-4 py-3">{formatNote(record.note)}</td>
                                                        <td class="px-4 py-3">{formatText(record.comments)}</td>
                                                      </tr>
                                                    )}
                                                  </For>
                                                </tbody>
                                              </table>
                                            </div>

                                            <div class="divide-y divide-yellow-100 md:hidden">
                                              <For each={group.items}>
                                                {(record) => (
                                                  <div class="space-y-3 px-4 py-4 text-sm">
                                                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                      <div>
                                                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Categoría</p>
                                                        <p class="mt-1 text-gray-800">{formatText(record.bulletin_category_name)}</p>
                                                      </div>
                                                      <div>
                                                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Descripción</p>
                                                        <p class="mt-1 text-gray-800">{formatText(record.bulletin_description)}</p>
                                                      </div>
                                                      <div>
                                                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Trimestre</p>
                                                        <p class="mt-1 text-gray-800">{formatText(record.semester_name)}</p>
                                                      </div>
                                                      <div>
                                                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Grado</p>
                                                        <p class="mt-1 text-gray-800">{formatText(record.grade_name)}</p>
                                                      </div>
                                                      <div>
                                                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Nota</p>
                                                        <p class="mt-1 text-gray-800">{formatNote(record.note)}</p>
                                                      </div>
                                                      <div>
                                                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Comentarios</p>
                                                        <p class="mt-1 text-gray-800">{formatText(record.comments)}</p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </For>
                                            </div>
                                          </section>
                                        )}
                                      </For>
                                    </div>
                                  </Show>
                                </Show>
                              </Show>
                            </div>
                          </Show>
                        </article>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </Show>
          </Show>
        </div>
      </div>
    </section>
  );
}
