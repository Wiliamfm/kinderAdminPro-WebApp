import { createEffect, createSignal, Show } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { loginWithPassword, isAuthenticated } from '../lib/pocketbase/auth';
import { normalizePocketBaseError } from '../lib/pocketbase/client';
import { sanitizeRedirectTarget } from '../lib/auth/guard';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (isAuthenticated()) {
      navigate('/', { replace: true });
    }
  });

  const getRedirectTarget = () => {
    const params = new URLSearchParams(location.search);
    return sanitizeRedirectTarget(params.get('redirect'));
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithPassword(email().trim(), password());
      navigate(getRedirectTarget(), { replace: true });
    } catch (e) {
      setError(normalizePocketBaseError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class="min-h-screen bg-yellow-50 text-gray-800 p-8 flex items-center justify-center">
      <div class="w-full max-w-md rounded-xl bg-white border border-yellow-300 p-6">
        <h1 class="text-2xl font-semibold">KinderAdminPro</h1>
        <p class="mt-2 text-gray-600">Sign in with your PocketBase user account.</p>

        <form class="mt-6 space-y-4" onSubmit={onSubmit}>
          <label class="block">
            <span class="text-sm text-gray-700">Email</span>
            <input
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              autoComplete="email"
              required
            />
          </label>

          <label class="block">
            <span class="text-sm text-gray-700">Password</span>
            <input
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <Show when={error()}>
            <p class="text-sm text-red-700">{error()}</p>
          </Show>

          <button
            type="submit"
            class="w-full rounded-lg bg-yellow-400 text-gray-900 px-4 py-2 disabled:opacity-60 hover:bg-yellow-500"
            disabled={loading()}
          >
            {loading() ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </section>
  );
}
