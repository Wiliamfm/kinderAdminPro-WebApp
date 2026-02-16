import pb, { normalizePocketBaseError, type PocketBaseRequestError } from './client';

export type BackendHealthResult =
  | { ok: true }
  | { ok: false; error: PocketBaseRequestError };

export async function checkBackendHealth(): Promise<BackendHealthResult> {
  try {
    await pb.send('/api/health', { method: 'GET' });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: normalizePocketBaseError(error) };
  }
}
