import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import { lazy } from 'solid-js';
import Login from './pages/login';
import StaffManagementPage from './pages/staff-management';
import EnrollmentManagementPage from './pages/enrollment-management';
import ReportsPage from './pages/reports';
import EventManagementPage from './pages/event-management';
import StaffEmployeesPage from './pages/staff-employees';
import StaffEmployeeEditPage from './pages/staff-employee-edit';

export const routes: RouteDefinition[] = [
  {
    path: '/login',
    component: Login,
  },
  {
    path: '/',
    component: Home,
  },
  {
    path: '/staff-management',
    component: StaffManagementPage,
  },
  {
    path: '/staff-management/employees',
    component: StaffEmployeesPage,
  },
  {
    path: '/staff-management/employees/:id',
    component: StaffEmployeeEditPage,
  },
  {
    path: '/enrollment-management',
    component: EnrollmentManagementPage,
  },
  {
    path: '/reports',
    component: ReportsPage,
  },
  {
    path: '/event-management',
    component: EventManagementPage,
  },
  {
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
];
