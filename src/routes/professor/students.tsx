import { useNavigate } from '@solidjs/router';
import { createEffect, createMemo, createResource, For, Show } from 'solid-js';
import { canAccessModule } from '../../lib/pocketbase/auth';
import type { PocketBaseRequestError } from '../../lib/pocketbase/errors';
import { getEmployeeByUserId } from '../../lib/pocketbase/employees';
import { listGradesByEmployeeId } from '../../lib/pocketbase/grades';
import { listActiveStudentsByGradeIds, type StudentRecord } from '../../lib/pocketbase/students';
import { getAuthUserId } from '../../lib/pocketbase/users';

function formatText(value: unknown): string {
  if (typeof value !== 'string') return '—';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '—';
}

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') return normalized.message;
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operación.';
}

export default function ProfessorStudentsPage() {
  const navigate = useNavigate();

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

  const [grades] = createResource(
    () => {
      const emp = employee();
      if (!emp) return undefined;
      return emp.id;
    },
    (empId) => listGradesByEmployeeId(empId),
  );

  const [students] = createResource(
    () => {
      const gradeList = grades();
      if (!gradeList || gradeList.length === 0) return undefined;
      return gradeList.map((g) => g.id);
    },
    (gradeIds) => listActiveStudentsByGradeIds(gradeIds),
  );

  const studentsByGradeId = createMemo(() => {
    const grouped = new Map<string, StudentRecord[]>();

    for (const grade of grades() ?? []) {
      grouped.set(grade.id, []);
    }

    for (const student of students() ?? []) {
      const bucket = grouped.get(student.grade_id) ?? [];
      bucket.push(student);
      grouped.set(student.grade_id, bucket);
    }

    return grouped;
  });

  const navigateToStudent = (studentId: string) => {
    navigate(`/professor/students/${studentId}`);
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-4 sm:p-6 lg:p-8 text-gray-800">
      <div class="mx-auto max-w-5xl rounded-xl border border-yellow-300 bg-white p-4 sm:p-6">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-semibold">Gestión de Estudiantes</h1>
            <p class="mt-2 text-gray-600">Estudiantes asignados a tus grados.</p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-yellow-200"
            onClick={() => navigate('/')}
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
            <Show
              when={!students.loading && !grades.loading}
              fallback={
                <div class="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-gray-600">
                  Cargando estudiantes...
                </div>
              }
            >
              <Show
                when={!students.error && !grades.error}
                fallback={
                  <div class="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {getErrorMessage(students.error ?? grades.error)}
                  </div>
                }
              >
                <Show
                  when={(grades() ?? []).length > 0}
                  fallback={
                    <div class="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-gray-600">
                      No tienes grados asignados.
                    </div>
                  }
                >
                  <Show
                    when={(students() ?? []).length > 0}
                    fallback={
                      <div class="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-gray-600">
                        No hay estudiantes en los grados asignados.
                      </div>
                    }
                  >
                    <div class="mt-6 space-y-6">
                      <For each={grades() ?? []}>
                        {(grade) => {
                          const gradeStudents = () => studentsByGradeId().get(grade.id) ?? [];

                          return (
                            <section>
                              <div class="mb-3 flex items-center justify-between gap-3">
                                <h2 class="text-lg font-semibold text-gray-800">{formatText(grade.name)}</h2>
                                <span class="text-sm text-gray-500">
                                  {gradeStudents().length} estudiante{gradeStudents().length === 1 ? '' : 's'}
                                </span>
                              </div>

                              <div class="overflow-x-auto rounded-lg border border-yellow-200">
                                <table class="min-w-[640px] w-full text-left text-sm">
                                  <thead class="bg-yellow-100 text-gray-700">
                                    <tr>
                                      <th class="px-4 py-3 font-semibold">Nombre</th>
                                      <th class="px-4 py-3 font-semibold">Grado</th>
                                      <th class="px-4 py-3 font-semibold">Documento</th>
                                      <th class="px-4 py-3 font-semibold">Fecha de nacimiento</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <Show
                                      when={gradeStudents().length > 0}
                                      fallback={
                                        <tr class="border-t border-yellow-100">
                                          <td class="px-4 py-4 text-gray-600" colSpan={4}>
                                            No hay estudiantes en este grado.
                                          </td>
                                        </tr>
                                      }
                                    >
                                      <For each={gradeStudents()}>
                                        {(student: StudentRecord) => (
                                          <tr
                                            class="border-t border-yellow-100 align-top transition-colors hover:bg-yellow-50 focus-within:bg-yellow-50 cursor-pointer"
                                            role="link"
                                            tabIndex={0}
                                            aria-label={`Ver detalle de ${student.name}`}
                                            onClick={() => navigateToStudent(student.id)}
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                navigateToStudent(student.id);
                                              }
                                            }}
                                          >
                                            <td class="px-4 py-3">{formatText(student.name)}</td>
                                            <td class="px-4 py-3">{formatText(student.grade_name)}</td>
                                            <td class="px-4 py-3">{formatText(student.document_id)}</td>
                                            <td class="px-4 py-3">{formatText(student.date_of_birth)}</td>
                                          </tr>
                                        )}
                                      </For>
                                    </Show>
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </Show>
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </section>
  );
}
