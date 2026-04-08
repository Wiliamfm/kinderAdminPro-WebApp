"use server";

import type { Source, SourceKind } from './recipients';

export type DeduplicationEntry = {
  key: string;
  type: SourceKind;
  id: string;
  label: string;
};

export type DeduplicationResult = {
  entries: DeduplicationEntry[];
  totalCount: number;
  uniqueByKind: Record<SourceKind, number>;
};

export function deduplicateSources(rawSources: unknown[]): DeduplicationResult {
  const seen = new Map<string, DeduplicationEntry>();
  const kindCounts: Record<SourceKind, number> = {
    student: 0,
    grade: 0,
    employee: 0,
    mixed: 0,
  };

  for (const raw of rawSources) {
    const source = raw as { kind?: string; id?: string; label?: string } | undefined;
    if (!source || typeof source !== 'object') continue;

    const kind = (source.kind as SourceKind) || 'employee';
    const id = String(source.id || '').trim();
    const label = String(source.label || id).trim();

    if (!id) continue;

    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;

    seen.set(key, { key, type: kind, id, label });
    kindCounts[kind]++;
    kindCounts.mixed++;
  }

  const entries = [...seen.values()];

  return {
    entries,
    totalCount: entries.length,
    uniqueByKind: kindCounts,
  };
}
