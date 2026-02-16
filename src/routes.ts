import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import { lazy } from 'solid-js';
import Login from './pages/login';

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
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
];
