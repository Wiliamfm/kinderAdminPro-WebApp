import PocketBase from 'pocketbase';
import { serialize } from 'cookie-es';
import type { CookieSerializeOptions } from 'vinxi/http';
import { mapAuthRecord, type AuthUser } from '../auth/shared';

export const AUTH_COOKIE_NAME = 'pb_auth';

type EventLike = {
  request: Request;
  response: {
    headers: Headers;
  };
  locals: App.RequestEventLocals;
};

function getServerPocketBaseUrl(): string {
  const rawUrl = process.env.PB_URL?.trim() || 'http://127.0.0.1:8090';

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('PocketBase URL must use http or https.');
    }
  } catch {
    throw new Error('Invalid PB_URL. Expected a valid absolute URL.');
  }

  return rawUrl;
}

function getAuthCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
  };
}

export function createServerPocketBase(): PocketBase {
  return new PocketBase(getServerPocketBaseUrl());
}

export function buildAuthCookieHeader(pb: PocketBase): string {
  return pb.authStore.exportToCookie(getAuthCookieOptions(), AUTH_COOKIE_NAME);
}

export function buildClearAuthCookieHeader(): string {
  return serialize(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function resolveRequestAuth(
  event: EventLike,
): Promise<{ pb: PocketBase; user: AuthUser | null }> {
  if (event.locals.pb) {
    return {
      pb: event.locals.pb,
      user: event.locals.authUser ?? null,
    };
  }

  const pb = createServerPocketBase();
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const hadAuthCookie = cookieHeader.includes(`${AUTH_COOKIE_NAME}=`);

  pb.authStore.loadFromCookie(cookieHeader, AUTH_COOKIE_NAME);

  if (pb.authStore.isValid) {
    try {
      await pb.collection('users').authRefresh();
      event.response.headers.append('Set-Cookie', buildAuthCookieHeader(pb));
    } catch {
      pb.authStore.clear();
      event.response.headers.append('Set-Cookie', buildClearAuthCookieHeader());
    }
  } else if (hadAuthCookie) {
    event.response.headers.append('Set-Cookie', buildClearAuthCookieHeader());
  }

  const user = mapAuthRecord(pb.authStore.record);
  event.locals.pb = pb;
  event.locals.authUser = user;

  return { pb, user };
}
