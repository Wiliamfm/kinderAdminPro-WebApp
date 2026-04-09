## Context

This is a pure text substitution change. All user-facing Spanish text showing "semestre" needs to become "trimestre" while keeping internal code identifiers unchanged.

## Goals / Non-Goals

**Goals:**
- Replace "semestre" with "trimestre" in all UI labels and error messages
- Maintain consistency across routes, pages, and tests
- Keep internal TypeScript types (`SemesterRecord`, etc.) unchanged
- Keep PocketBase collection name `semesters` unchanged
- Keep OpenSpec documentation unchanged

**Non-Goals:**
- Rename database schema or collection names
- Rename TypeScript interfaces/types
- Update any documentation files

## Decisions

**Approach: Batch file-by-file replacement**

Using `replaceAll` for each file to ensure complete coverage:
1. Process routes first (most user-visible)
2. Process pages (tests)
3. Process error messages in `lib/pocketbase/leaves.ts`

**Text replacement rules:**
- "semestre" → "trimestre" (singular)
- "semestres" → "trimestres" (plural)
- "Semestre" → "Trimestre" (capitalized in labels)
- "Semestres" → "Trimestres" (capitalized, plural)

## Risks / Trade-offs

**Risk: Missed occurrences**
- **Mitigation**: Use grep to verify all occurrences before marking complete

**Risk: Test failures after replacement**
- **Mitigation**: Run tests after each batch to catch issues early

**Trade-off**: Large number of files (~30+) requires systematic batching
- **Approach**: Split into 3 batches as planned, test after each