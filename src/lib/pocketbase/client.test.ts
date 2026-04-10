import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { normalizePocketBaseError, type PocketBaseRequestError } from './errors';

function expectNormalizedError(
  error: unknown,
  expected: {
    message: string;
    status: number | null;
    isAbort: boolean;
  },
): void {
  expect(normalizePocketBaseError(error)).toMatchObject(expected);
}

describe('pocketbase client error normalization', () => {
  it('keeps already normalized errors', () => {
    const error: PocketBaseRequestError = {
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: true,
    };

    expectNormalizedError(error, error);
  });

  it('normalizes standard errors', () => {
    expectNormalizedError(new Error('boom'), {
      message: 'boom',
      status: null,
      isAbort: false,
    });
  });

  it('translates network errors to spanish', () => {
    expectNormalizedError(new Error('Failed to fetch'), {
      message: 'Error al conectar con el servidor',
      status: null,
      isAbort: false,
    });
  });

  it('includes pocketbase field details when present', () => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          employee_id: {
            code: 'validation_invalid_relation',
            message: 'Selecciona un empleado valido.',
          },
          semester_id: {
            code: 'validation_invalid_relation',
            message: 'Selecciona un trimestre valido.',
          },
        },
      },
    });

    expectNormalizedError(error, {
      message: 'No se pudo crear el registro Selecciona un empleado valido.; Selecciona un trimestre valido.',
      status: 400,
      isAbort: false,
    });
  });

  it.each([
    ['Failed to create record.', 'No se pudo crear el registro'],
    ['Failed to update record.', 'No se pudo actualizar el registro'],
    ['Failed to delete record.', 'No se pudo eliminar el registro'],
  ])('translates known pocketbase operation errors: %s', (message, expected) => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message,
      },
    });

    expectNormalizedError(error, {
      message: expected,
      status: 400,
      isAbort: false,
    });
  });

  it('preserves custom spanish messages', () => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message: 'No se encontró el trimestre asociado',
      },
    });

    expectNormalizedError(error, {
      message: 'No se encontró el trimestre asociado',
      status: 400,
      isAbort: false,
    });
  });

  it('translates the unknown fallback message to spanish', () => {
    expectNormalizedError(null, {
      message: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
      status: null,
      isAbort: false,
    });
  });
});
