export type GuardResult = { allow: true } | { allow: false; to: string };

export function sanitizeRedirectTarget(target: string | null | undefined): string {
  if (!target) return '/';
  if (!target.startsWith('/')) return '/';
  if (target.startsWith('//')) return '/';
  return target;
}

export function requireAuth(
  isAuthed: boolean,
  pathname: string,
  search: string,
): GuardResult {
  if (isAuthed) {
    return { allow: true };
  }

  const redirectTarget = sanitizeRedirectTarget(`${pathname}${search}`);
  const to = `/login?redirect=${encodeURIComponent(redirectTarget)}`;
  return { allow: false, to };
}
