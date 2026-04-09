## Context

The event creation/edit modal in `src/routes/event-management/calendar.tsx` displays a list of active employees as checkboxes. Admins currently must manually select each employee when creating events that require all staff.

## Goals / Non-Goals

**Goals:**
- Add a "Select All" button to quickly select all active employees
- Toggle behavior: clicking again deselects all

**Non-Goals:**
- Filtering employees by role (not in scope)
- Persisting selection preference

## Decisions

**Approach:** Add a toggle button above the employee checkbox grid.

```tsx
<button 
  type="button"
  class="text-sm text-blue-600 hover:text-blue-800"
  onClick={() => toggleSelectAll()}
>
  {allSelected() ? 'Deseleccionar todos' : 'Seleccionar todos'}
</button>
```

**Implementation:** 
- Add `toggleSelectAll` function that sets `assigneeIds` to either all employee IDs or empty array
- Determine "all selected" by comparing current selection length to employee options length
- Place button in the header area of the Responsables section

## Risks / Trade-offs

- **Risk:** New employees added while form is open could cause confusion
  - **Mitigation:** The selection is based on current `employeeOptions()` at time of click
- **Risk:** Very long list might be confusing with select all
  - **Mitigation:** Simple toggle is intuitive; users can still modify individual selections after
