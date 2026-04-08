import { createServerPocketBase } from '../server/auth-session';
import { normalizePocketBaseError, type PocketBaseRequestError } from './errors';

export type BackendHealthResult =
  | { ok: true }
  | { ok: false; error: PocketBaseRequestError };

export async function checkBackendHealth(): Promise<BackendHealthResult> {
  "use server";
  const pb = createServerPocketBase();
  try {
    await pb.send('/api/health', { method: 'GET' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: normalizePocketBaseError(error) };
  }
}
