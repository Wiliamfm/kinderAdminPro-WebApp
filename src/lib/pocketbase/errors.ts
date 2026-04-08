import { ClientResponseError } from 'pocketbase';

export type PocketBaseRequestError = {
  message: string;
  status: number | null;
  isAbort: boolean;
};

export function normalizePocketBaseError(error: unknown): PocketBaseRequestError {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && 'status' in error
    && 'isAbort' in error
    && typeof (error as { message: unknown }).message === 'string'
    && (
      (error as { status: unknown }).status === null
      || typeof (error as { status: unknown }).status === 'number'
    )
    && typeof (error as { isAbort: unknown }).isAbort === 'boolean'
  ) {
    const normalized = error as PocketBaseRequestError;
    return {
      message: normalized.message,
      status: normalized.status,
      isAbort: normalized.isAbort,
    };
  }

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
