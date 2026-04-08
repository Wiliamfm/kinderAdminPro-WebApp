import { getRequestEvent } from 'solid-js/web';
import {
  canUserAccessModule,
  canUserAccessModules,
  type ProtectedModule,
} from '../auth/shared';
import { resolveRequestAuth } from './auth-session';

function createForbiddenError() {
  return {
    message: 'No tienes permisos para acceder a este módulo.',
    status: 403,
    isAbort: false,
  } as const;
}

function createUnauthenticatedError() {
  return {
    message: 'Debes iniciar sesión para continuar.',
    status: 401,
    isAbort: false,
  } as const;
}

function requireRequestEvent() {
  const event = getRequestEvent();
  if (!event) {
    throw new Error('Module access check called outside of a request context.');
  }
  return event;
}

export async function requireModuleAccess(module: ProtectedModule): Promise<void> {
  "use server";

  const event = requireRequestEvent();
  const { user } = await resolveRequestAuth(event);

  if (!user) {
    throw createUnauthenticatedError();
  }

  if (!canUserAccessModule(user, module)) {
    throw createForbiddenError();
  }
}

export async function requireAnyModuleAccess(modules: readonly ProtectedModule[]): Promise<void> {
  "use server";

  const event = requireRequestEvent();
  const { user } = await resolveRequestAuth(event);

  if (!user) {
    throw createUnauthenticatedError();
  }

  if (!canUserAccessModules(user, modules)) {
    throw createForbiddenError();
  }
}
