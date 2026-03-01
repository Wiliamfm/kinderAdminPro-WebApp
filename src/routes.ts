import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import { lazy } from 'solid-js';
import Login from './pages/login';
import StaffManagementPage from './pages/staff-management';
import EnrollmentManagementPage from './pages/enrollment-management';
import EnrollmentGradesPage from './pages/enrollment-grades';
import ReportsPage from './pages/reports';
import EventManagementPage from './pages/event-management';
import StaffEmployeesPage from './pages/staff-employees';
import StaffEmployeeEditPage from './pages/staff-employee-edit';
import AuthSetPasswordPage from './pages/auth-set-password';
import AppUsersPage from './pages/app-users';
import StaffJobsPage from './pages/staff-jobs';
import EnrollmentStudentsPage from './pages/enrollment-students';
import EnrollmentStudentEditPage from './pages/enrollment-student-edit';
import EnrollmentTutorsPage from './pages/enrollment-tutors';
import EnrollmentTutorEditPage from './pages/enrollment-tutor-edit';

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
    path: '/staff-management/jobs',
    component: StaffJobsPage,
  },
  {
    path: '/staff-management/app-users',
    component: AppUsersPage,
  },
  {
    path: '/auth/set-password',
    component: AuthSetPasswordPage,
  },
  {
    path: '/enrollment-management',
    component: EnrollmentManagementPage,
  },
  {
    path: '/enrollment-management/students',
    component: EnrollmentStudentsPage,
  },
  {
    path: '/enrollment-management/students/:id',
    component: EnrollmentStudentEditPage,
  },
  {
    path: '/enrollment-management/tutors',
    component: EnrollmentTutorsPage,
  },
  {
    path: '/enrollment-management/tutors/:id',
    component: EnrollmentTutorEditPage,
  },
  {
    path: '/enrollment-management/grades',
    component: EnrollmentGradesPage,
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
