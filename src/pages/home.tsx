import { createResource } from 'solid-js';
import { checkBackendHealth } from '../lib/pocketbase/health';

export default function Home() {
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
      <div class="mx-auto max-w-2xl rounded-xl bg-white border border-yellow-300 p-6">
        <h1 class="text-2xl font-semibold">KinderAdminPro</h1>
        <p class="mt-2 text-gray-600">PocketBase backend connectivity status:</p>

        <p class="mt-4 text-lg">
          <span class="font-medium">Status:</span>{' '}
          <span class="capitalize">{status()}</span>
        </p>

        {details() && (
          <p class="mt-2 text-sm text-red-700">
            Error: <code>{details()}</code>
          </p>
        )}
      </div>
    </section>
  );
}
