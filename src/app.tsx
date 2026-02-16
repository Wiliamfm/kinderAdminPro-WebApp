import { createEffect, createSignal, onCleanup, Suspense, type Component } from 'solid-js';
import { A, useLocation, useNavigate } from '@solidjs/router';
import { isAuthenticated, logout, subscribeAuth } from './lib/pocketbase/auth';
import { requireAuth } from './lib/auth/guard';

const App: Component<{ children: Element }> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [authed, setAuthed] = createSignal(isAuthenticated());

  const unsubscribe = subscribeAuth((valid) => setAuthed(valid));
  onCleanup(() => unsubscribe());

  createEffect(() => {
    const pathname = location.pathname;
    const search = location.search;
    const valid = authed();

    if (pathname === '/login') {
      if (valid) {
        navigate('/', { replace: true });
      }
      return;
    }

    const guard = requireAuth(valid, pathname, search);
    if (!guard.allow) {
      navigate(guard.to, { replace: true });
    }
  });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {location.pathname !== '/login' && (
        <nav class="bg-yellow-300 text-gray-900 px-4 border-b border-yellow-400">
          <ul class="flex items-center">
            <li class="py-2 px-4">
              <A href="/" class="no-underline hover:underline">
                KinderAdminPro
              </A>
            </li>

            <li class="text-sm flex items-center space-x-2 ml-auto text-gray-600">
              <span>Path</span>
              <input
                class="w-32 p-1 bg-gray-50 text-sm rounded-lg border border-gray-200"
                type="text"
                readOnly
                value={location.pathname}
              />
              {authed() && (
                <button
                  type="button"
                  class="ml-2 rounded-lg border border-yellow-500 bg-yellow-100 px-2 py-1 hover:bg-yellow-200"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              )}
            </li>
          </ul>
        </nav>
      )}

      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
};

export default App;
