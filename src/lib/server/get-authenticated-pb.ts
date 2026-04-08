import { getRequestEvent } from 'solid-js/web';
import type PocketBase from 'pocketbase';
import { resolveRequestAuth } from './auth-session';

function createUnauthenticatedError() {
  return {
    message: 'Debes iniciar sesión para continuar.',
    status: 401,
    isAbort: false,
  } as const;
}

export async function getAuthenticatedPb(): Promise<PocketBase> {
  "use server";

  const event = getRequestEvent();
  if (!event) {
    throw new Error('Authenticated PocketBase client requested outside of a request context.');
  }

  const { pb, user } = await resolveRequestAuth(event);
  if (!user) {
    throw createUnauthenticatedError();
  }

  return pb;
}

export async function getAuthenticatedPbWithUserId(): Promise<{ pb: PocketBase; userId: string }> {
  "use server";

  const event = getRequestEvent();
  if (!event) {
    throw new Error('Authenticated PocketBase client requested outside of a request context.');
  }

  const { pb, user } = await resolveRequestAuth(event);
  if (!user) {
    throw createUnauthenticatedError();
  }

  return { pb, userId: user.id };
}
