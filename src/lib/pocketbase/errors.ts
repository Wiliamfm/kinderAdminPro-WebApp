import { ClientResponseError } from 'pocketbase';

export type PocketBaseRequestError = {
  message: string;
  status: number | null;
  isAbort: boolean;
};

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

export function normalizePocketBaseError(error: unknown): PocketBaseRequestError {
  if (error instanceof ClientResponseError) {
    return {
      message: formatClientResponseMessage(error),
      status: error.status ?? null,
      isAbort: error.isAbort,
    };
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
    return {
      message: normalized.message,
      status: normalized.status,
      isAbort: normalized.isAbort,
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
