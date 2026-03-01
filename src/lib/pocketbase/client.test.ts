import { describe, expect, it } from 'vitest';
import { normalizePocketBaseError, type PocketBaseRequestError } from './client';

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
});
