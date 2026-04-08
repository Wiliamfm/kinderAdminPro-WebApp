import { describe, expect, it } from 'vitest';
import { deduplicateSources } from './deduplication';

describe('deduplicateSources', () => {
  it('returns empty result for empty input', () => {
    const result = deduplicateSources([]);
    expect(result.entries).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.uniqueByKind.student).toBe(0);
    expect(result.uniqueByKind.grade).toBe(0);
    expect(result.uniqueByKind.employee).toBe(0);
  });

  it('counts unique sources by kind', () => {
    const result = deduplicateSources([
      { kind: 'student', id: '1', label: 'Student 1' },
      { kind: 'student', id: '2', label: 'Student 2' },
      { kind: 'grade', id: '1', label: 'Grade 1' },
      { kind: 'employee', id: '1', label: 'Employee 1' },
    ]);

    expect(result.totalCount).toBe(4);
    expect(result.uniqueByKind.student).toBe(2);
    expect(result.uniqueByKind.grade).toBe(1);
    expect(result.uniqueByKind.employee).toBe(1);
  });

  it('deduplicates sources by kind:id', () => {
    const result = deduplicateSources([
      { kind: 'student', id: '1', label: 'First' },
      { kind: 'student', id: '1', label: 'Duplicate' },
      { kind: 'student', id: '2', label: 'Second' },
    ]);

    expect(result.totalCount).toBe(2);
    expect(result.uniqueByKind.student).toBe(2);
    expect(result.entries[0].label).toBe('First');
  });

  it('counts different kinds correctly', () => {
    const result = deduplicateSources([
      { kind: 'student', id: '1', label: 'Student 1' },
      { kind: 'student', id: '2', label: 'Student 2' },
      { kind: 'grade', id: '1', label: 'Grade 1' },
    ]);

    expect(result.totalCount).toBe(3);
    expect(result.uniqueByKind.student).toBe(2);
    expect(result.uniqueByKind.grade).toBe(1);
  });

  it('filters out sources without id', () => {
    const result = deduplicateSources([
      { kind: 'student', id: '1', label: 'Valid' },
      { kind: 'student', id: '', label: 'Empty ID' },
      { kind: 'student', id: '   ', label: 'Whitespace ID' },
    ]);

    expect(result.totalCount).toBe(1);
  });

  it('preserves order of first occurrence', () => {
    const result = deduplicateSources([
      { kind: 'student', id: '3', label: 'Third' },
      { kind: 'student', id: '1', label: 'First' },
      { kind: 'student', id: '2', label: 'Second' },
    ]);

    expect(result.entries.map((e) => e.id)).toEqual(['3', '1', '2']);
  });

  it('tracks mixed count correctly', () => {
    const result = deduplicateSources([
      { kind: 'student', id: '1', label: 'Student 1' },
      { kind: 'grade', id: '1', label: 'Grade 1' },
      { kind: 'employee', id: '1', label: 'Employee 1' },
    ]);

    expect(result.uniqueByKind.mixed).toBe(3);
    expect(result.totalCount).toBe(3);
  });
});
