import { A } from '@solidjs/router';
import { useNavigate } from '@solidjs/router';
import { For, Show, createSignal, onMount, onCleanup } from 'solid-js';
import { createEffect } from 'solid-js';
import { hasRole } from '../lib/pocketbase/auth';
import { professorSectionIndexByPage } from '../lib/section-index';
import { getDashboardData } from '../lib/pocketbase/dashboard';

const PROFESSOR_MODULE_KEYS = ['professor-personal', 'professor-students', 'professor-events'] as const;

const PROFESSOR_MODULE_HREFS: Record<string, string> = {
  'professor-personal': '/professor/personal',
  'professor-students': '/professor/students',
  'professor-events': '/professor/events',
};

const MODULE_LINKS = [
  { label: 'Gestión de Personal', href: '/staff-management' },
  { label: 'Matrícula', href: '/enrollment-management' },
  { label: 'Eventos', href: '/event-management' },
  { label: 'Informes', href: '/reports' },
];

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMonth = start.toLocaleDateString('es', { month: 'short' });
  const endMonth = end.toLocaleDateString('es', { month: 'short' });
  const year = start.getFullYear();
  return `${startMonth} - ${endMonth} ${year}`;
}

function Dashboard() {
  const [loading, setLoading] = createSignal(true);
  const [data, setData] = createSignal<Awaited<ReturnType<typeof getDashboardData>> | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  let mounted = true;

  onMount(() => {
    loadData();
  });

  onCleanup(() => {
    mounted = false;
  });

  const loadData = async () => {
    if (!mounted) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getDashboardData();

      if (mounted) {
        setData(result);
      }
    } catch (e) {
      if (mounted) {
        console.error('Dashboard error:', e);
        const err = e as { message?: string };
        const errorMsg = err.message || (e instanceof Error ? e.message : JSON.stringify(e));
        setError(errorMsg);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  return (
    <div class="mx-auto max-w-4xl space-y-6">
      <div class="rounded-xl bg-white border border-yellow-300 p-6">
        <h1 class="text-2xl font-semibold">KinderAdminPro</h1>
        <p class="mt-2 text-gray-600">Sistema integral de gestión escolar</p>
      </div>

      <Show
        when={!loading()}
        fallback={
          <div class="rounded-xl bg-white border border-yellow-300 p-6">
            <p class="text-gray-500">Cargando...</p>
          </div>
        }
      >
        <Show
          when={error()}
          fallback={
            <Show
              when={data()}
              fallback={
                <div class="rounded-xl bg-white border border-yellow-300 p-6">
                  <p class="text-gray-500">No se pudieron cargar los datos</p>
                </div>
              }
            >
              {(dashboard) => {
                const d = dashboard();
                return (
                  <>
                    <Show
                      when={d?.semester}
                      fallback={
                        <div class="rounded-xl bg-yellow-100 border border-yellow-400 p-4">
                          <p class="text-yellow-800 font-medium">Sin trimestre activo</p>
                        </div>
                      }
                    >
                      <div class="rounded-xl bg-yellow-100 border border-yellow-400 p-4">
                        <p class="text-yellow-800">
                          <span class="font-medium">Trimestre actual:</span>{' '}
                          {d!.semester!.name} ({formatDateRange(d!.semester!.start_date, d!.semester!.end_date)})
                        </p>
                      </div>
                    </Show>

                    <div class="rounded-xl bg-white border border-yellow-300 p-6">
                      <h2 class="text-lg font-semibold mb-4">Resumen de grados</h2>

                      <Show
                        when={d!.grades.length > 0}
                        fallback={
                          <p class="text-gray-500">No hay grados registrados</p>
                        }
                      >
                        <div class="overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="border-b border-yellow-200">
                                <th class="text-left py-2 px-3 font-medium text-gray-700">Grado</th>
                                <th class="text-left py-2 px-3 font-medium text-gray-700">Profesor(a)</th>
                                <th class="text-right py-2 px-3 font-medium text-gray-700">Estudiantes</th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={d!.grades}>
                                {(grade) => (
                                  <tr class="border-b border-yellow-100">
                                    <td class="py-2 px-3">{grade.name}</td>
                                    <td class="py-2 px-3">
                                      {grade.professorName || '(Sin asignar)'}
                                    </td>
                                    <td class="py-2 px-3 text-right">{grade.studentCount}</td>
                                  </tr>
                                )}
                              </For>
                            </tbody>
                            <tfoot>
                              <tr class="font-medium">
                                <td class="py-2 px-3">Total</td>
                                <td class="py-2 px-3"></td>
                                <td class="py-2 px-3 text-right">{d!.totalStudents}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </Show>
                    </div>

                    <div class="rounded-xl bg-white border border-yellow-300 p-6">
                      <h2 class="text-lg font-semibold mb-4">Módulos</h2>
                      <div class="flex flex-wrap gap-3">
                        <For each={MODULE_LINKS}>
                          {(link) => (
                            <A
                              href={link.href}
                              class="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-yellow-100"
                            >
                              {link.label}
                            </A>
                          )}
                        </For>
                      </div>
                    </div>
                  </>
                );
              }}
            </Show>
          }
        >
          {(err) => (
            <div class="rounded-xl bg-red-100 border border-red-400 p-4">
              <p class="text-red-800 font-medium">Error: {err()}</p>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const isProfessor = () => hasRole('professor') && !hasRole('admin') && !hasRole('father');
  const isFatherOnly = () => hasRole('father') && !hasRole('admin') && !hasRole('professor');

  createEffect(() => {
    if (isFatherOnly()) {
      navigate('/father-portal', { replace: true });
    }
  });

  return (
    <Show when={!isFatherOnly()}>
      <section class="min-h-screen bg-yellow-50 text-gray-800 p-8">
        <Show
          when={isProfessor()}
          fallback={<Dashboard />}
        >
          <div class="mx-auto max-w-3xl rounded-xl bg-white border border-yellow-300 p-6">
            <h1 class="text-2xl font-semibold">KinderAdminPro</h1>
            <p class="mt-2 text-gray-600">Selecciona un módulo para continuar.</p>

            <ul class="mt-6 space-y-3">
              <For each={PROFESSOR_MODULE_KEYS}>
                {(key) => {
                  const section = professorSectionIndexByPage[key];
                  const href = PROFESSOR_MODULE_HREFS[key];
                  return (
                    <li>
                      <A
                        href={href}
                        class="flex flex-col rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 transition-colors hover:bg-yellow-100"
                      >
                        <span class="font-medium text-gray-900">{section.title}</span>
                        <span class="mt-1 text-sm text-gray-600">{section.description}</span>
                      </A>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Show>
      </section>
    </Show>
  );
}
