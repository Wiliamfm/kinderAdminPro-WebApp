import { createEffect, createSignal, onCleanup, Suspense, type Component } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import {
  getAuthUserIdentity,
  isAuthenticated,
  logout,
  subscribeAuth,
} from './lib/pocketbase/auth';
import { requireAuth } from './lib/auth/guard';
import Navbar from './components/Navbar';

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

  const userIdentity = () => getAuthUserIdentity();

  return (
    <>
      {location.pathname !== '/login' && (
        <Navbar
          currentPath={location.pathname}
          onLogout={handleLogout}
          userName={userIdentity().name}
          userEmail={userIdentity().email}
        />
      )}

      <main>
        <Suspense>{props.children}</Suspense>
      </main>
    </>
  );
};

export default App;
