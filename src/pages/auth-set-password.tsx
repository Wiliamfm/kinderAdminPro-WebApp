import { useLocation } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { confirmPasswordSetupToken } from '../lib/pocketbase/users';
import type { PocketBaseRequestError } from '../lib/pocketbase/client';

function getErrorMessage(error: unknown): string {
  const normalized = error as PocketBaseRequestError | undefined;
  if (normalized && typeof normalized.message === 'string') {
    return normalized.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo definir la contraseña.';
}

function readToken(search: string): string {
  const params = new URLSearchParams(search);
  return params.get('token')?.trim() ?? '';
}

function isStrongPassword(value: string): boolean {
  if (value.length < 8) return false;
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  return hasUpper && hasLower && hasNumber && hasSymbol;
}

export default function AuthSetPasswordPage() {
  const location = useLocation();
  const [password, setPassword] = createSignal('');
  const [passwordConfirm, setPasswordConfirm] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [success, setSuccess] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const token = () => readToken(location.search);

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);

    if (!token()) {
      setError('El enlace no contiene un token válido.');
      return;
    }

    if (!password().trim() || !passwordConfirm().trim()) {
      setError('Debes ingresar y confirmar la contraseña.');
      return;
    }

    if (password() !== passwordConfirm()) {
      setError('La confirmación de contraseña no coincide.');
      return;
    }

    if (!isStrongPassword(password())) {
      setError(
        'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.',
      );
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordSetupToken(token(), password(), passwordConfirm());
      setSuccess(true);
      setPassword('');
      setPasswordConfirm('');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 p-8 text-gray-800">
      <div class="mx-auto max-w-lg rounded-xl border border-yellow-300 bg-white p-6">
        <h1 class="text-2xl font-semibold">Definir contraseña</h1>
        <p class="mt-2 text-gray-600">Completa este paso para iniciar sesión en la aplicación.</p>

        <form class="mt-6 space-y-4" onSubmit={onSubmit}>
          <label class="block">
            <span class="text-sm text-gray-700">Nueva contraseña</span>
            <input
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              type="password"
              value={password()}
              onInput={(event) => setPassword(event.currentTarget.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Confirmar contraseña</span>
            <input
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              type="password"
              value={passwordConfirm()}
              onInput={(event) => setPasswordConfirm(event.currentTarget.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <Show when={error()}>
            <div class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error()}
            </div>
          </Show>

          <Show when={success()}>
            <div class="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
              Contraseña actualizada. Ya puedes iniciar sesión.
            </div>
          </Show>

          <button
            type="submit"
            class="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition-colors hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading()}
          >
            {loading() ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </section>
  );
}
