import { A } from '@solidjs/router';
import { For, Show, createResource } from 'solid-js';
import { checkBackendHealth } from '../lib/pocketbase/health';
import { hasRole } from '../lib/pocketbase/auth';
import { professorSectionIndexByPage } from '../lib/section-index';

const PROFESSOR_MODULE_KEYS = ['professor-personal', 'professor-students', 'professor-events'] as const;

const PROFESSOR_MODULE_HREFS: Record<string, string> = {
  'professor-personal': '/professor/personal',
  'professor-students': '/professor/students',
  'professor-events': '/professor/events',
};

export default function Home() {
  const isProfessor = () => hasRole('professor') && !hasRole('admin');

  const [health] = createResource(checkBackendHealth);

  const status = () => {
    const result = health();
    if (!result) return 'checking';
    return result.ok ? 'online' : 'offline';
  };

  const details = () => {
    const result = health();
    if (!result || result.ok) return null;
    return result.error.message;
  };

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-8">
      <Show
        when={isProfessor()}
        fallback={
          <div class="mx-auto max-w-2xl rounded-xl bg-white border border-yellow-300 p-6">
            <h1 class="text-2xl font-semibold">KinderAdminPro</h1>
            <p class="mt-2 text-gray-600">PocketBase backend connectivity status:</p>

            <p class="mt-4 text-lg">
              <span class="font-medium">Status:</span>{' '}
              <span class="capitalize">{status()}</span>
            </p>

            <Show when={details()}>
              <p class="mt-2 text-sm text-red-700">
                Error: <code>{details()}</code>
              </p>
            </Show>
          </div>
        }
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
  );
}
