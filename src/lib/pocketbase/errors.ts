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

const ERROR_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Failed to fetch': 'Error al conectar con el servidor',
  'Failed to create record': 'No se pudo crear el registro',
  'Failed to update record': 'No se pudo actualizar el registro',
  'Failed to delete record': 'No se pudo eliminar el registro',
  'Unknown PocketBase request error': 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
};

export function translateErrorMessage(message: string): string {
  const normalized = message.trim();
  const translated = ERROR_MESSAGE_TRANSLATIONS[normalized];
  if (translated) return translated;

  if (normalized.endsWith('.')) {
    const withoutPeriod = normalized.slice(0, -1);
    return ERROR_MESSAGE_TRANSLATIONS[withoutPeriod] ?? normalized;
  }

  return normalized;
}

function createPocketBaseError(
  message: string,
  status: number | null,
  isAbort: boolean,
): PocketBaseError {
  return new PocketBaseError(translateErrorMessage(message), status, isAbort);
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
  const translatedBaseMessage = translateErrorMessage(baseMessage);
  if (filteredDetails.length === 0) return translatedBaseMessage;

  return `${translatedBaseMessage} ${filteredDetails.join('; ')}`;
}

export function normalizePocketBaseError(error: unknown): PocketBaseError {
  if (error instanceof PocketBaseError) {
    return createPocketBaseError(error.message, error.status, error.isAbort);
  }

  if (error instanceof ClientResponseError) {
    return createPocketBaseError(
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
    return createPocketBaseError(
      normalized.message,
      normalized.status,
      normalized.isAbort,
    );
  }

  if (error instanceof Error) {
    return createPocketBaseError(error.message, null, false);
  }

  return createPocketBaseError('Unknown PocketBase request error', null, false);
}
