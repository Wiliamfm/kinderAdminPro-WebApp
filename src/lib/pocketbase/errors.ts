import { ClientResponseError } from 'pocketbase';

export type PocketBaseRequestError = {
  message: string;
  status: number | null;
  isAbort: boolean;
};

export class PocketBaseError extends Error {
  status: number | null;
  isAbort: boolean;

  constructor(message: string, status: number | null, isAbort: boolean) {
    super(message);
    this.name = 'PocketBaseError';
    this.status = status;
    this.isAbort = isAbort;
  }
}

function appendMessage(messages: string[], seen: Set<string>, value: unknown): void {
  if (typeof value !== 'string') return;

  const normalized = value.trim();
  if (normalized.length === 0 || seen.has(normalized)) return;

  seen.add(normalized);
  messages.push(normalized);
}

function collectPocketBaseDetailMessages(
  value: unknown,
  messages: string[],
  seen: Set<string>,
): void {
  if (!value || typeof value !== 'object') return;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPocketBaseDetailMessages(item, messages, seen);
    }
    return;
  }

  const detail = value as { message?: unknown };
  appendMessage(messages, seen, detail.message);

  for (const entry of Object.values(value)) {
    collectPocketBaseDetailMessages(entry, messages, seen);
  }
}

function formatClientResponseMessage(error: ClientResponseError): string {
  const baseMessage = typeof error.response?.message === 'string' && error.response.message.trim().length > 0
    ? error.response.message.trim()
    : error.message;

  const detailMessages: string[] = [];
  const seen = new Set<string>();
  collectPocketBaseDetailMessages(
    (error.response as { data?: unknown } | undefined)?.data,
    detailMessages,
    seen,
  );

  const filteredDetails = detailMessages.filter((message) => message !== baseMessage);
  if (filteredDetails.length === 0) return baseMessage;

  return `${baseMessage} ${filteredDetails.join('; ')}`;
}

export function normalizePocketBaseError(error: unknown): PocketBaseError {
  if (error instanceof PocketBaseError) {
    return error;
  }

  if (error instanceof ClientResponseError) {
    return new PocketBaseError(
      formatClientResponseMessage(error),
      error.status ?? null,
      error.isAbort,
    );
  }

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
    return new PocketBaseError(
      normalized.message,
      normalized.status,
      normalized.isAbort,
    );
  }

  if (error instanceof Error) {
    return new PocketBaseError(error.message, null, false);
  }

  return new PocketBaseError('Unknown PocketBase request error', null, false);
}
