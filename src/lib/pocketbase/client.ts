import PocketBase, { ClientResponseError } from 'pocketbase';

function getPocketBaseUrl(): string {
  const rawUrl = import.meta.env.VITE_PB_URL?.trim() || 'https://kinderadminpro-pocketbase.onrender.com' || 'http://127.0.0.1:8090';

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('PocketBase URL must use http or https.');
    }
  } catch {
    throw new Error('Invalid VITE_PB_URL. Expected a valid absolute URL.');
  }

  return rawUrl;
}

const pocketBaseUrl = getPocketBaseUrl();
const pb = new PocketBase(pocketBaseUrl);

export type PocketBaseRequestError = {
  message: string;
  status: number | null;
  isAbort: boolean;
};

export function normalizePocketBaseError(error: unknown): PocketBaseRequestError {
  if (error instanceof ClientResponseError) {
    return {
      message: error.response?.message || error.message,
      status: error.status ?? null,
      isAbort: error.isAbort,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      status: null,
      isAbort: false,
    };
  }

  return {
    message: 'Unknown PocketBase request error',
    status: null,
    isAbort: false,
  };
}

export default pb;
