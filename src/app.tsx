import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';

import { Router, Route, useLocation, useNavigate } from '@solidjs/router';
import { lazy } from 'solid-js';
import {
  Show,
  createEffect,
  onMount,
  Suspense,
  type Component,
} from 'solid-js';
import {
  getAuthUserIdentity,
  isAuthenticated,
  isAuthResolved,
  logout,
  refreshAuth,
} from './lib/pocketbase/auth';
import { requireAuth } from './lib/auth/guard';
import Navbar from './components/Navbar';

import Index from './routes/index';
import Login from './routes/login';
import Register from './routes/register';
import StaffManagement from './routes/staff-management';
import EnrollmentManagement from './routes/enrollment-management';
import EventManagement from './routes/event-management';
import Reports from './routes/reports';
import FatherPortal from './routes/father-portal';

import ProfessorEvents from './routes/professor/events';
import ProfessorPersonal from './routes/professor/personal';
import ProfessorStudents from './routes/professor/students';

const AppShell: Component<{ children: Element }> = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  onMount(() => {
    if (!isAuthResolved()) {
      void refreshAuth().catch(() => undefined);
    }
  });

  createEffect(() => {
    if (!isAuthResolved()) {
      return;
    }

    const pathname = location.pathname;
    const search = location.search;
    const valid = isAuthenticated();
    const isPublicAuthRoute = pathname === '/login' || pathname === '/auth/set-password';
    const isPublicRoute = pathname === '/register';

    if (isPublicAuthRoute) {
      if (valid) {
        navigate('/', { replace: true });
      }
      return;
    }

    if (isPublicRoute) {
      return;
    }

    const guard = requireAuth(valid, pathname, search);
    if (!guard.allow) {
      navigate(guard.to, { replace: true });
    }
  });

  const handleLogout = () => {
    void logout().finally(() => {
      navigate('/login', { replace: true });
    });
  };

  const userIdentity = () => getAuthUserIdentity();
  const showNavbar = () =>
    isAuthenticated()
    && location.pathname !== '/login'
    && location.pathname !== '/auth/set-password'
    && location.pathname !== '/register';

  return (
    <>
      {showNavbar() && (
        <Navbar
          currentPath={location.pathname}
          onLogout={handleLogout}
          userName={userIdentity().name}
          userEmail={userIdentity().email}
        />
      )}

      <main>
        <Show
          when={isAuthResolved()}
          fallback={(
            <div class="min-h-screen flex items-center justify-center p-8 text-sm text-gray-600">
              Cargando sesión...
            </div>
          )}
        >
          <Suspense>{props.children}</Suspense>
        </Show>
      </main>
    </>
  );
};

export default function App() {
  return (
    <Router root={AppShell}>
      <Route path="/" component={Index} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/staff-management" component={StaffManagement} />
      <Route path="/staff-management/employees" component={lazy(() => import('./routes/staff-management/employees'))} />
      <Route path="/staff-management/employees/:id" component={lazy(() => import('./routes/staff-management/employees/[id]'))} />
      <Route path="/staff-management/jobs" component={lazy(() => import('./routes/staff-management/jobs'))} />
      <Route path="/staff-management/app-users" component={lazy(() => import('./routes/staff-management/app-users'))} />

      <Route path="/enrollment-management" component={EnrollmentManagement} />
      <Route path="/enrollment-management/students" component={lazy(() => import('./routes/enrollment-management/students'))} />
      <Route path="/enrollment-management/students/:id" component={lazy(() => import('./routes/enrollment-management/students/[id]'))} />
      <Route path="/enrollment-management/tutors" component={lazy(() => import('./routes/enrollment-management/tutors'))} />
      <Route path="/enrollment-management/tutors/:id" component={lazy(() => import('./routes/enrollment-management/tutors/[id]'))} />
      <Route path="/enrollment-management/semesters" component={lazy(() => import('./routes/enrollment-management/semesters'))} />
      <Route path="/enrollment-management/semesters/:id" component={lazy(() => import('./routes/enrollment-management/semesters/[id]'))} />
      <Route path="/enrollment-management/grades" component={lazy(() => import('./routes/enrollment-management/grades'))} />
      <Route path="/enrollment-management/requests" component={lazy(() => import('./routes/enrollment-management/requests'))} />
      <Route path="/enrollment-management/bulletins" component={lazy(() => import('./routes/enrollment-management/bulletins'))} />

      <Route path="/event-management" component={EventManagement} />
      <Route path="/event-management/calendar" component={lazy(() => import('./routes/event-management/calendar'))} />
      <Route path="/event-management/email" component={lazy(() => import('./routes/event-management/email'))} />

      <Route path="/reports" component={Reports} />
      <Route path="/reports/students" component={lazy(() => import('./routes/reports/students'))} />
      <Route path="/reports/employees" component={lazy(() => import('./routes/reports/employees'))} />
      <Route path="/father-portal" component={FatherPortal} />

      <Route path="/professor/events" component={ProfessorEvents} />
      <Route path="/professor/personal" component={ProfessorPersonal} />
      <Route path="/professor/personal/invoices" component={lazy(() => import('./routes/professor/personal/invoices'))} />
      <Route path="/professor/personal/leaves" component={lazy(() => import('./routes/professor/personal/leaves'))} />
      <Route path="/professor/students" component={ProfessorStudents} />
      <Route path="/professor/students/:id" component={lazy(() => import('./routes/professor/students/[id]'))} />

      <Route path="*404" component={() => import('./routes/[...404]').then(m => m.default)} />
    </Router>
  );
}
