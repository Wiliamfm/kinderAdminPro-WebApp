import { getRequestEvent } from 'solid-js/web';
import { mapAuthRecord, type AuthUser } from '../auth/shared';
import { normalizePocketBaseError } from '../pocketbase/errors';
import {
  buildAuthCookieHeader,
  buildClearAuthCookieHeader,
  createServerPocketBase,
  resolveRequestAuth,
} from './auth-session';

function requireRequestEvent() {
  const event = getRequestEvent();
  if (!event) {
    throw new Error('Auth server function called outside of a request context.');
  }

  return event;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  "use server";

  const event = requireRequestEvent();

  try {
    const pb = createServerPocketBase();
    const result = await pb.collection('users').authWithPassword(email.trim(), password);
    const user = mapAuthRecord(result.record);

    if (!user) {
      throw new Error('PocketBase did not return an authenticated user.');
    }

    event.locals.pb = pb;
    event.locals.authUser = user;
    event.response.headers.append('Set-Cookie', buildAuthCookieHeader(pb));

    return user;
  } catch (error) {
    throw normalizePocketBaseError(error);
  }
}

export async function logout(): Promise<void> {
  "use server";

  const event = requireRequestEvent();

  event.locals.authUser = null;
  event.locals.pb?.authStore.clear();
  event.response.headers.append('Set-Cookie', buildClearAuthCookieHeader());
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  "use server";

  const event = requireRequestEvent();
  const { user } = await resolveRequestAuth(event);
  return user;
}
