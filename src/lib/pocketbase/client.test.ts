import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import { normalizePocketBaseError, type PocketBaseRequestError } from './errors';

describe('pocketbase client error normalization', () => {
  it('keeps already normalized errors', () => {
    const error: PocketBaseRequestError = {
      message: 'The request was aborted (most likely autocancelled).',
      status: null,
      isAbort: true,
    };

    expect(normalizePocketBaseError(error)).toEqual(error);
  });

  it('normalizes standard errors', () => {
    const result = normalizePocketBaseError(new Error('boom'));
    expect(result).toEqual({
      message: 'boom',
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

    expect(normalizePocketBaseError(error)).toEqual({
      message: 'Failed to create record. Selecciona un empleado valido.; Selecciona un trimestre valido.',
      status: 400,
      isAbort: false,
    });
  });
});
