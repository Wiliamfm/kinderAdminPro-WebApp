## 1. Server-side semester boundary validation

- [x] 1.1 Add a helper function in `src/lib/pocketbase/leaves.ts` that fetches the semester by ID and compares leave dates against `start_date`/`end_date`, throwing a normalized error if out of bounds
- [x] 1.2 Integrate the boundary check into `createEmployeeLeave` before the PocketBase create call
- [x] 1.3 Integrate the boundary check into `updateEmployeeLeave` before the PocketBase update call
- [x] 1.4 Add tests for the server-side boundary validation (within bounds, start before semester, end after semester)

## 2. Client-side form validation

- [x] 2.1 Update `validateLeaveForm` (or its call site) to accept semester `start_date`/`end_date` and validate that leave dates fall within the range
- [x] 2.2 Display inline field errors on `start_datetime` and `end_datetime` showing the valid semester date range when violated

## 3. Professor leave modal — semester as read-only

- [x] 3.1 Remove `listSemesterOptions` resource and `leaveSemesterOptions`/`currentLeaveSemester` memo from the professor leaves route
- [x] 3.2 Use a single `getCurrentSemester()` resource for create mode; set `semesterId` directly when it resolves
- [x] 3.3 Replace the `<select>` element with read-only text displaying the current semester name
- [x] 3.4 For edit mode, fetch the leave's semester via `getSemesterById` and display as read-only text
- [x] 3.5 Show error message "No hay un semestre activo configurado. Contacta al administrador." and disable confirm when no current semester exists
- [x] 3.6 Remove the auto-fill `createEffect` that reconciled the two old resources

## 4. Testing and cleanup

- [x] 4.1 Update existing professor leave modal tests to reflect the new read-only semester behavior
- [x] 4.2 Verify admin leave modal in `staff-management/employees.tsx` is unaffected (no changes needed, just confirm)
