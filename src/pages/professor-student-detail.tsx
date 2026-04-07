import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { canAccessModule } from '../lib/pocketbase/auth';
import {
  createBulletinStudent,
  listBulletinStudentsByStudentAndGrade,
  updateBulletinStudent,
  type BulletinStudentRecord,
} from '../lib/pocketbase/bulletins-students';
import { listBulletinsByGradeId, type BulletinRecord } from '../lib/pocketbase/bulletins';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';
import { getEmployeeByUserId } from '../lib/pocketbase/employees';
import { listGradesByEmployeeId } from '../lib/pocketbase/grades';
import { getCurrentSemester } from '../lib/pocketbase/semesters';
import { getStudentById } from '../lib/pocketbase/students';
import { getAuthUserId } from '../lib/pocketbase/users';

type EditingState = {
  bulletinId: string;
  note: string;
  comments: string;
};

type DetailData = {
  bulletins: BulletinRecord[];
  entries: BulletinStudentRecord[];
};

function formatText(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

function formatNote(value: number | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return '—';
}

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') return normalized.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operación.';
}

function sortByCreatedAtDesc(
  left: BulletinStudentRecord,
  right: BulletinStudentRecord,
): number {
  const leftTime = new Date(left.created_at).getTime();
  const rightTime = new Date(right.created_at).getTime();
  return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
}

function getInitialEditor(entry: BulletinStudentRecord | undefined, bulletinId: string): EditingState {
  return {
    bulletinId,
    note: typeof entry?.note === 'number' ? String(entry.note) : typeof entry?.note === 'string' ? entry.note.trim() : '',
    comments: entry?.comments ?? '',
  };
}

function validateNote(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return 'La nota es obligatoria.';

  const note = Number(trimmed);
  if (!Number.isFinite(note)) return 'La nota debe ser un número válido.';
  if (note < 0 || note > 10) return 'La nota debe estar entre 0 y 10.';

  return null;
}

export default function ProfessorStudentDetailPage() {
  const navigate = useNavigate();
  const params = useParams();

  createEffect(() => {
    if (!canAccessModule('professor-students')) {
      navigate('/', { replace: true });
    }
  });

  const userId = () => getAuthUserId() ?? '';
  const [employee] = createResource(
    () => (userId().length > 0 ? userId() : undefined),
    (uid) => getEmployeeByUserId(uid),
  );
  const [student] = createResource(() => params.id, getStudentById);
  const [currentSemester] = createResource(getCurrentSemester);

  const [grades] = createResource(
    () => {
      const employeeRecord = employee();
      if (!employeeRecord) return undefined;
      return employeeRecord.id;
    },
    (employeeId) => listGradesByEmployeeId(employeeId),
  );

  const [detailData] = createResource(
    () => {
      const studentRecord = student();
      if (!studentRecord) return undefined;
      return {
        studentId: studentRecord.id,
        gradeId: studentRecord.grade_id,
      };
    },
    async ({ studentId, gradeId }): Promise<DetailData> => {
      const [bulletins, entries] = await Promise.all([
        listBulletinsByGradeId(gradeId),
        listBulletinStudentsByStudentAndGrade(studentId, gradeId),
      ]);

      return { bulletins, entries };
    },
  );

  const [entries, setEntries] = createSignal<BulletinStudentRecord[]>([]);
  const [editing, setEditing] = createSignal<EditingState | null>(null);
  const [rowError, setRowError] = createSignal<string | null>(null);
  const [savingBulletinId, setSavingBulletinId] = createSignal<string | null>(null);
  const [historyOpen, setHistoryOpen] = createSignal(false);

  createEffect(() => {
    const data = detailData();
    if (!data) return;
    setEntries(data.entries);
  });

  createEffect(() => {
    if (employee.loading || grades.loading || student.loading) return;

    const studentRecord = student();
    const gradeList = grades();

    if (!studentRecord || !gradeList) return;

    const ownsGrade = gradeList.some((grade) => grade.id === studentRecord.grade_id);
    if (!ownsGrade) {
      navigate('/professor/students', { replace: true });
    }
  });

  const currentEntryByBulletinId = createMemo(() => {
    const semesterId = currentSemester()?.id;
    const lookup = new Map<string, BulletinStudentRecord>();

    if (!semesterId) return lookup;

    for (const entry of entries()) {
      if (entry.semester_id === semesterId && !lookup.has(entry.bulletin_id)) {
        lookup.set(entry.bulletin_id, entry);
      }
    }

    return lookup;
  });

  const historyEntries = createMemo(() => {
    const semesterId = currentSemester()?.id;
    return [...entries()]
      .filter((entry) => !semesterId || entry.semester_id !== semesterId)
      .sort(sortByCreatedAtDesc);
  });

  const detailError = createMemo(() => (
    employee.error
    ?? grades.error
    ?? student.error
    ?? currentSemester.error
    ?? detailData.error
  ));

  const isLoading = createMemo(() => {
    if (employee.loading || student.loading || currentSemester.loading) return true;
    if (employee() && grades.loading) return true;
    if (student() && detailData.loading) return true;
    return false;
  });

  const startEditing = (bulletinId: string) => {
    const currentEntry = currentEntryByBulletinId().get(bulletinId);
    setEditing(getInitialEditor(currentEntry, bulletinId));
    setRowError(null);
  };

  const cancelEditing = () => {
    setEditing(null);
    setRowError(null);
  };

  const saveEditing = async (bulletin: BulletinRecord) => {
    const editor = editing();
    const studentRecord = student();
    const semester = currentSemester();

    if (!editor || editor.bulletinId !== bulletin.id || !studentRecord || !semester) return;

    const noteError = validateNote(editor.note);
    if (noteError) {
      setRowError(noteError);
      return;
    }

    const payload = {
      bulletin_id: bulletin.id,
      student_id: studentRecord.id,
      grade_id: studentRecord.grade_id,
      semester_id: semester.id,
      note: Number(editor.note.trim()),
      comments: editor.comments.trim(),
    };

    const existingEntry = currentEntryByBulletinId().get(bulletin.id);

    setSavingBulletinId(bulletin.id);
    setRowError(null);

    try {
      const savedEntry = existingEntry
        ? await updateBulletinStudent(existingEntry.id, payload)
        : await createBulletinStudent(payload);

      setEntries((current) => {
        if (existingEntry) {
          return current.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry));
        }

        return [...current, savedEntry];
      });
      setEditing(null);
    } catch (error) {
      setRowError(getErrorMessage(error));
    } finally {
      setSavingBulletinId(null);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-6xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Detalle del estudiante</h1>
            <p class="mt-2 text-gray-600">Consulta y registra observaciones académicas del semestre actual.</p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/professor/students')}
          >
            Volver a estudiantes
          </button>
        </div>

        <Show
          when={!isLoading()}
          fallback={
            <div class="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-gray-600">
              Cargando detalle del estudiante...
            </div>
          }
        >
          <Show
            when={!detailError()}
            fallback={
              <div class="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {getErrorMessage(detailError())}
              </div>
            }
          >
            <Show
              when={employee() !== null && employee() !== undefined}
              fallback={
                <div class="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  No se encontró un registro de empleado vinculado a tu usuario. Contacta al administrador.
                </div>
              }
            >
              <Show when={student()}>
                {(studentRecord) => (
                  <>
                    <div class="mt-6 grid gap-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Estudiante</p>
                        <p class="mt-1 text-base font-semibold text-gray-800">{formatText(studentRecord().name)}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Grado</p>
                        <p class="mt-1 text-base font-semibold text-gray-800">{formatText(studentRecord().grade_name)}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Documento</p>
                        <p class="mt-1 text-base font-semibold text-gray-800">{formatText(studentRecord().document_id)}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Semestre actual</p>
                        <p class="mt-1 text-base font-semibold text-gray-800">{formatText(currentSemester()?.name ?? '')}</p>
                      </div>
                    </div>

                    <Show when={!currentSemester()}>
                      <div class="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        No hay un semestre activo configurado. Puedes consultar la información, pero las acciones de agregar y editar están deshabilitadas.
                      </div>
                    </Show>

                    <div class="mt-6 overflow-x-auto rounded-lg border border-yellow-200">
                      <table class="min-w-[760px] w-full text-left text-sm">
                        <thead class="bg-yellow-100 text-gray-700">
                          <tr>
                            <th class="px-4 py-3 font-semibold">Boletín</th>
                            <th class="px-4 py-3 font-semibold">Nota</th>
                            <th class="px-4 py-3 font-semibold">Comentarios</th>
                            <th class="px-4 py-3 font-semibold">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          <Show
                            when={(detailData()?.bulletins ?? []).length > 0}
                            fallback={
                              <tr class="border-t border-yellow-100">
                                <td class="px-4 py-4 text-gray-600" colSpan={4}>
                                  No hay boletines configurados para este grado.
                                </td>
                              </tr>
                            }
                          >
                            <For each={detailData()?.bulletins ?? []}>
                              {(bulletin) => {
                                const currentEntry = () => currentEntryByBulletinId().get(bulletin.id);
                                const isEditing = () => editing()?.bulletinId === bulletin.id;
                                const isSaving = () => savingBulletinId() === bulletin.id;

                                return (
                                  <tr class="border-t border-yellow-100 align-top">
                                    <td class="px-4 py-3 font-medium text-gray-800">{formatText(bulletin.description)}</td>
                                    <td class="px-4 py-3">
                                      <Show
                                        when={isEditing()}
                                        fallback={<span>{formatNote(currentEntry()?.note ?? '')}</span>}
                                      >
                                        <div class="space-y-2">
                                          <input
                                            aria-label={`Nota para ${bulletin.description}`}
                                            class="w-full rounded-lg border border-gray-300 px-3 py-2"
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.1"
                                            value={editing()?.note ?? ''}
                                            onInput={(event) => {
                                              setEditing((current) => (current && current.bulletinId === bulletin.id
                                                ? { ...current, note: event.currentTarget.value }
                                                : current));
                                              setRowError(null);
                                            }}
                                          />
                                          <p class="text-xs text-gray-500">Rango permitido: 0 a 10.</p>
                                        </div>
                                      </Show>
                                    </td>
                                    <td class="px-4 py-3">
                                      <Show
                                        when={isEditing()}
                                        fallback={<span>{formatText(currentEntry()?.comments ?? '')}</span>}
                                      >
                                        <textarea
                                          aria-label={`Comentarios para ${bulletin.description}`}
                                          class="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
                                          value={editing()?.comments ?? ''}
                                          onInput={(event) => {
                                            setEditing((current) => (current && current.bulletinId === bulletin.id
                                              ? { ...current, comments: event.currentTarget.value }
                                              : current));
                                            setRowError(null);
                                          }}
                                        />
                                      </Show>
                                      <Show when={isEditing() && rowError()}>
                                        <p class="mt-2 text-sm text-red-700">{rowError()}</p>
                                      </Show>
                                    </td>
                                    <td class="px-4 py-3">
                                      <Show
                                        when={!isEditing()}
                                        fallback={
                                          <div class="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              class="rounded-lg bg-yellow-600 px-3 py-2 text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                              disabled={isSaving()}
                                              onClick={() => void saveEditing(bulletin)}
                                            >
                                              {isSaving() ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button
                                              type="button"
                                              class="rounded-lg border border-gray-300 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                              disabled={isSaving()}
                                              onClick={cancelEditing}
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        }
                                      >
                                        <button
                                          type="button"
                                          class="rounded-lg bg-yellow-600 px-3 py-2 text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                          disabled={!currentSemester()}
                                          onClick={() => startEditing(bulletin.id)}
                                        >
                                          {currentEntry() ? 'Editar' : 'Agregar'}
                                        </button>
                                      </Show>
                                    </td>
                                  </tr>
                                );
                              }}
                            </For>
                          </Show>
                        </tbody>
                      </table>
                    </div>

                    <Show when={historyEntries().length > 0}>
                      <section class="mt-6 rounded-lg border border-yellow-200">
                        <button
                          type="button"
                          class="flex w-full items-center justify-between bg-yellow-100 px-4 py-3 text-left text-sm font-semibold text-gray-800"
                          onClick={() => setHistoryOpen((current) => !current)}
                        >
                          <span>Historial de semestres anteriores ({historyEntries().length})</span>
                          <span>{historyOpen() ? 'Ocultar' : 'Mostrar'}</span>
                        </button>

                        <Show when={historyOpen()}>
                          <div class="overflow-x-auto">
                            <table class="min-w-[760px] w-full text-left text-sm">
                              <thead class="bg-yellow-50 text-gray-700">
                                <tr>
                                  <th class="px-4 py-3 font-semibold">Boletín</th>
                                  <th class="px-4 py-3 font-semibold">Nota</th>
                                  <th class="px-4 py-3 font-semibold">Comentarios</th>
                                  <th class="px-4 py-3 font-semibold">Semestre</th>
                                </tr>
                              </thead>
                              <tbody>
                                <For each={historyEntries()}>
                                  {(entry) => (
                                    <tr class="border-t border-yellow-100 align-top">
                                      <td class="px-4 py-3">{formatText(entry.bulletin_description)}</td>
                                      <td class="px-4 py-3">{formatNote(entry.note)}</td>
                                      <td class="px-4 py-3">{formatText(entry.comments)}</td>
                                      <td class="px-4 py-3">{formatText(entry.semester_name)}</td>
                                    </tr>
                                  )}
                                </For>
                              </tbody>
                            </table>
                          </div>
                        </Show>
                      </section>
                    </Show>
                  </>
                )}
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </section>
  );
}
