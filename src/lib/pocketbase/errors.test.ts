import { ClientResponseError } from 'pocketbase';
import { describe, expect, it } from 'vitest';
import {
  getUniqueFieldLabel,
  isUniqueFieldError,
} from './errors';

describe('pocketbase unique field helpers', () => {
  it('detects document_id unique conflicts', () => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          document_id: {
            code: 'validation_not_unique',
            message: 'Value must be unique',
          },
        },
      },
    });

    expect(isUniqueFieldError(error, 'document_id')).toBe(true);
  });

  it('detects name unique conflicts', () => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          name: {
            code: 'validation_invalid_value',
            message: 'The value is already in use.',
          },
        },
      },
    });

    expect(isUniqueFieldError(error, 'name')).toBe(true);
  });

  it('detects email unique conflicts', () => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          email: {
            code: 'validation_invalid_email',
            message: 'The email is already in use.',
          },
        },
      },
    });

    expect(isUniqueFieldError(error, 'email')).toBe(true);
  });

  it('returns false for non-unique validation errors', () => {
    const error = new ClientResponseError({
      status: 400,
      response: {
        message: 'Failed to create record.',
        data: {
          document_id: {
            code: 'validation_required',
            message: 'This field is required.',
          },
        },
      },
    });

    expect(isUniqueFieldError(error, 'document_id')).toBe(false);
  });

  it.each([
    ['document_id', 'documento'],
    ['name', 'nombre'],
    ['email', 'correo electrónico'],
    ['unknown_field', 'unknown_field'],
  ])('returns the expected label for %s', (fieldName, expected) => {
    expect(getUniqueFieldLabel(fieldName)).toBe(expected);
  });
});
