## Context

The application uses PocketBase with a `students_fathers` junction table that stores relationships as English strings: `'father'`, `'mother'`, `'other'`. The UI renders these values directly in dropdown selects without translation. This is inconsistent with the rest of the Spanish-language application.

**Current state:**
- Database values: `'father'`, `'mother'`, `'other'`
- UI displays: same English values in dropdowns
- Column header: "father_names" shows parent names but could be more descriptive in Spanish

## Goals / Non-Goals

**Goals:**
- Display Spanish labels in dropdown selects while preserving English database values
- Update column header in student list to Spanish
- Minimal changes - no database migration or schema changes

**Non-Goals:**
- Not changing database values
- Not adding new relationship types (future flexibility noted but out of scope)
- Not modifying email recipient logic

## Decisions

1. **Translation mapping in UI**: Use a simple JS map for dropdown label display
   - `'father'` → `'Padre'`
   - `'mother'` → `'Madre'`
   - `'other'` → `'Otro'`

2. **Where to implement**: Add utility functions near where relationships are used
   - Create in `src/lib/pocketbase/students-fathers.ts` since it's already the source of relationship types

## Risks / Trade-offs

- **Maintenance**: Adding UI translation layer creates slight extra work if new relationship types are added later. Mitigation: Document the mapping clearly.
- **Consistency**: Column header change from "father_names" to "Padres" may need adjustment if showing both parents. Acceptable for now.