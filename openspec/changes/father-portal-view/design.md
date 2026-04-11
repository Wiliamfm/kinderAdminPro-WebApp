## Context

Users with the 'father' role currently have accounts but no access to any protected module. The auth system (`src/lib/auth/shared.ts`) only grants module access to 'admin' and 'professor' roles. Fathers need a dedicated portal to view their linked students' academic information.

Current data model:
- `users` collection has `father_id` link to `fathers` collection
- `fathers` collection links to `students` via `students_fathers` junction table
- `students` has fields: `active` (boolean), `accepted` (boolean), `rejected` (timestamp)
- `bulletins_students` holds grades/notes per student per bulletin/semester

## Goals / Non-Goals

**Goals:**
- Allow father-role users to log in and see a list of their linked students
- Show student status: Activo (active+accepted), Pendiente (active, not accepted), or Rechazado (rejected timestamp)
- Display bulletins/grades for each student similar to the Reports module export
- Generate PDF export per student

**Non-Goals:**
- Editing capabilities - read-only view
- Access to other students not linked to the guardian
- Access to admin/professor modules

## Decisions

### 1. Module Access Strategy
**Decision:** Add 'father-portal' to ProtectedModule type and extend canUserAccessModule.

**Rationale:** Follows existing pattern for professor modules. Each role gets its own module namespace.

### 2. API Design
**Decision:** Create new functions in `src/lib/pocketbase/` instead of reusing existing functions.

**Options considered:**
- Reuse `listLinksByFatherId` + `listBulletinsStudentsByStudentAndGrade` → Requires multiple client calls, more complex page logic
- New combined function → Single API call per student, cleaner architecture

**Selected:** New `listFatherPortalData()` function that returns students + their bulletins in one call.

### 3. Status Display
**Decision:** Compute status in the API layer based on student record fields.

| Field Values | Display |
|--------------|----------|
| active=true, accepted=true | Activo |
| active=true, accepted=false | Pendiente |
| rejected != empty | Rechazado |
| otherwise | Desactivado |

### 4. Export Format
**Decision:** Reuse existing `students-export.ts` logic with a filter for specific student IDs.

## Risks / Trade-offs

- **[Risk]** Father has multiple linked students with different grades
  → **Mitigation:** Group bulletins in UI by student first, then by grade/semester
  
- **[Risk]** Large number of bulletins could slow down loading
  → **Mitigation:** Paginate bulletins per student or lazy-load on expand

- **[Risk]** New father users won't see anything initially
  → **Mitigation:** Show helpful empty state with contact admin message