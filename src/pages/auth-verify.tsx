import { useLocation } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import { confirmVerificationToken } from '../lib/pocketbase/users';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo verificar el correo.';
}

function readToken(search: string): string {
  const params = new URLSearchParams(search);
  return params.get('token')?.trim() ?? '';
}

export default function AuthVerifyPage() {
  const location = useLocation();
  const [loading, setLoading] = createSignal(true);
  const [success, setSuccess] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const token = readToken(location.search);
    if (!token) {
      setError('El enlace de verificación no contiene un token válido.');
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await confirmVerificationToken(token);
        setSuccess(true);
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    })();
  });

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-lg rounded-xl border border-yellow-300 bg-white p-6">
        <h1 class="text-2xl font-semibold">Verificación de correo</h1>
        <p class="mt-2 text-gray-600">
          Estamos validando tu cuenta para habilitar el acceso a la aplicación.
        </p>

        <Show when={loading()}>
          <p class="mt-4 text-sm text-gray-600">Verificando enlace...</p>
        </Show>

        <Show when={!loading() && success()}>
          <div class="mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
            Correo verificado. Ahora abre el enlace para definir contraseña que recibiste en tu email.
          </div>
        </Show>

        <Show when={!loading() && error()}>
          <div class="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error()}
          </div>
        </Show>

        <a
          href="/login"
          class="mt-6 inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
        >
          Ir a login
        </a>
      </div>
    </section>
  );
}
