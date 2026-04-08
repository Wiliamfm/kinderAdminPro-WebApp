import { describe, expect, it } from 'vitest';
import {
  normalizeSource,
  normalizeSources,
  deriveSourceKind,
  normalizeRecipient,
  resolveRecipients,
} from './recipients';

describe('normalizeSource', () => {
  it('returns null for null input', () => {
    expect(normalizeSource(null)).toBeNull();
    expect(normalizeSource(undefined)).toBeNull();
  });

  it('returns null for object without kind or id', () => {
    expect(normalizeSource({})).toBeNull();
    expect(normalizeSource({ kind: 'student' })).toBeNull();
    expect(normalizeSource({ id: '123' })).toBeNull();
  });

  it('normalizes valid source with student kind', () => {
    const result = normalizeSource({ kind: 'student', id: '123', label: 'John' });
    expect(result).toEqual({
      kind: 'student',
      id: '123',
      label: 'John',
    });
  });

  it('normalizes valid source with grade kind', () => {
    const result = normalizeSource({ kind: 'grade', id: '456', label: 'Grade 5' });
    expect(result).toEqual({
      kind: 'grade',
      id: '456',
      label: 'Grade 5',
    });
  });

  it('converts unknown kind to employee', () => {
    const result = normalizeSource({ kind: 'unknown', id: '789', label: 'Unknown' });
    expect(result).toEqual({
      kind: 'employee',
      id: '789',
      label: 'Unknown',
    });
  });

  it('trims whitespace from values', () => {
    const result = normalizeSource({ kind: '  student  ', id: '  123  ', label: '  John  ' });
    expect(result).toEqual({
      kind: 'student',
      id: '123',
      label: 'John',
    });
  });
});

describe('normalizeSources', () => {
  it('returns empty array for non-array input', () => {
    expect(normalizeSources(null)).toEqual([]);
    expect(normalizeSources(undefined)).toEqual([]);
    expect(normalizeSources('string')).toEqual([]);
    expect(normalizeSources({})).toEqual([]);
  });

  it('filters out invalid sources', () => {
    const result = normalizeSources([
      { kind: 'student', id: '1', label: 'One' },
      { kind: 'grade', id: '2', label: 'Two' },
      null,
      undefined,
      {},
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('deduplicates sources by kind:id', () => {
    const result = normalizeSources([
      { kind: 'student', id: '1', label: 'One' },
      { kind: 'student', id: '1', label: 'Duplicate' },
      { kind: 'student', id: '2', label: 'Two' },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('One');
    expect(result[1].id).toBe('2');
  });
});

describe('deriveSourceKind', () => {
  it('returns mixed for empty array', () => {
    expect(deriveSourceKind([])).toBe('mixed');
  });

  it('returns the kind when all sources have the same kind', () => {
    const sources = [
      { kind: 'student', id: '1', label: 'One' },
      { kind: 'student', id: '2', label: 'Two' },
    ];
    expect(deriveSourceKind(sources)).toBe('student');
  });

  it('returns mixed when sources have different kinds', () => {
    const sources = [
      { kind: 'student', id: '1', label: 'One' },
      { kind: 'grade', id: '2', label: 'Two' },
    ];
    expect(deriveSourceKind(sources)).toBe('mixed');
  });
});

describe('normalizeRecipient', () => {
  it('returns null for null input', () => {
    expect(normalizeRecipient(null)).toBeNull();
    expect(normalizeRecipient(undefined)).toBeNull();
  });

  it('normalizes valid employee recipient', () => {
    const result = normalizeRecipient({
      recipientType: 'employee',
      recipientId: 'emp123',
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      sources: [{ kind: 'employee', id: 'emp123', label: 'John Doe' }],
    });
    expect(result).toEqual({
      recipientType: 'employee',
      recipientId: 'emp123',
      recipientName: 'John Doe',
      recipientEmail: 'john@example.com',
      sources: [{ kind: 'employee', id: 'emp123', label: 'John Doe' }],
      studentIds: [],
      gradeIds: [],
    });
  });

  it('normalizes valid father recipient', () => {
    const result = normalizeRecipient({
      recipientType: 'father',
      recipientId: 'father123',
      recipientName: 'Jane Doe',
      recipientEmail: 'jane@example.com',
      sources: [
        { kind: 'student', id: 'stu1', label: 'Student 1' },
        { kind: 'grade', id: 'grd1', label: 'Grade 1' },
      ],
    });
    expect(result).toEqual({
      recipientType: 'father',
      recipientId: 'father123',
      recipientName: 'Jane Doe',
      recipientEmail: 'jane@example.com',
      sources: [
        { kind: 'student', id: 'stu1', label: 'Student 1' },
        { kind: 'grade', id: 'grd1', label: 'Grade 1' },
      ],
      studentIds: ['stu1'],
      gradeIds: ['grd1'],
    });
  });

  it('normalizes unknown recipientType to employee', () => {
    const result = normalizeRecipient({
      recipientType: 'unknown',
      recipientId: '123',
      recipientName: 'Test',
      recipientEmail: 'test@example.com',
      sources: [],
    });
    expect(result?.recipientType).toBe('employee');
  });
});

describe('resolveRecipients', () => {
  it('returns empty arrays for empty input', async () => {
    const result = await resolveRecipients([]);
    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
  });

  it('filters duplicates by type:id', async () => {
    const result = await resolveRecipients([
      { recipientType: 'employee', recipientId: '1', recipientName: 'One', recipientEmail: '', sources: [] },
      { recipientType: 'employee', recipientId: '1', recipientName: 'Duplicate', recipientEmail: '', sources: [] },
      { recipientType: 'father', recipientId: '1', recipientName: 'Father', recipientEmail: '', sources: [] },
    ]);
    expect(result.valid).toHaveLength(2);
  });
});
