## Context

The professor leave modal in `src/routes/professor/personal/leaves.tsx` currently fetches all semesters via `listSemesterOptions()` and renders a `<select>` dropdown. This is broken (semester doesn't default correctly) and unnecessary — professors should only create leaves for the current semester. The backend (`src/lib/pocketbase/leaves.ts`) performs no validation that leave dates fall within the semester boundaries.

The admin leave modal in `src/routes/staff-management/employees.tsx` is unaffected — admins retain full semester selection.

## Goals / Non-Goals

**Goals:**
- Professor leave modal uses only `getCurrentSemester()` — one DB query, not the full collection
- Semester displayed as read-only text, auto-assigned to the leave
- Leave dates validated against semester boundaries (client + server)
- Clear error when no `is_current` semester exists

**Non-Goals:**
- Changing the admin leave modal behavior
- Changing the semester data model or PocketBase schema
- Adding semester boundary validation to the admin flow (separate change if needed)

## Decisions

### 1. Single `getCurrentSemester()` resource replaces two resources

**Current:** Two resources — `leaveSemesters` (all semesters) and `currentSemesterData` (current semester) — plus a `currentLeaveSemester` memo to reconcile them.

**New:** One resource calling `getCurrentSemester()`. The `leaveSemesterOptions`, `currentLeaveSemester` memo, and the auto-fill `createEffect` are removed. The `semesterId` is set directly when the resource resolves.

**Why:** Simpler, one query, no race condition on default selection.

### 2. Read-only text instead of `<select>`

Replace the `<select>` element with a plain `<span>` or `<p>` showing the semester name. The `semesterId` is set programmatically from the resource, not from user interaction.

For edit mode, the semester comes from the existing leave record (looked up via `getSemesterById` or expanded from the leave query). Also displayed as text.

**Why:** Professors cannot choose a different semester, so an interactive control is misleading.

### 3. Client-side boundary validation in `validateLeaveForm`

Add a check that `start_datetime` and `end_datetime` fall within the current semester's `start_date` and `end_date`. This requires passing the semester dates into the validation function.

The validation message should indicate the valid date range, e.g.: "La fecha debe estar dentro del semestre (01/03/2026 - 31/07/2026)".

### 4. Server-side boundary validation in create/update functions

In `createEmployeeLeave` and `updateEmployeeLeave`, after receiving the payload:
1. Fetch the semester record by `semesterId`
2. Compare leave `start_datetime` / `end_datetime` against semester `start_date` / `end_date`
3. Throw a normalized error if out of bounds

**Why:** Client validation can be bypassed. The server is the authoritative boundary.

### 5. Error state for missing current semester

When `getCurrentSemester()` returns `null`, display an inline error: "No hay un semestre activo configurado. Contacta al administrador." and disable the confirm button.

This replaces the current "No hay semestres registrados" message which was tied to the full semester list being empty.

## Risks / Trade-offs

- **[Risk] Semester `start_date`/`end_date` are date-only, leave datetimes include time** → Compare by converting semester dates to start-of-day and end-of-day boundaries. Semester `start_date` = earliest valid moment, semester `end_date` = latest valid day (end of day).
- **[Risk] Existing leaves may already violate boundaries** → This change only validates new creates/edits going forward. No retroactive enforcement.
- **[Risk] Edit mode needs semester info but doesn't fetch current semester** → For edits, fetch the leave's stored semester via `getSemesterById(leave.semesterId)` to display the name and validate boundaries.
