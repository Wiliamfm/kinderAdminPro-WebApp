## Context

The students report (`students.tsx`) has two chart panels inside a single `<Show when={hasVisibleChartData()}>` block. The "Estudiantes por trimestre" chart toggles between semester and year grouping modes, sharing a single canvas and `semesterChartInstance` variable across two `createEffect`s.

Current problems:
- `hasVisibleChartData` conflates both charts — if one has data and the other doesn't, the empty chart's canvas is just blank with no feedback.
- `yearChartPoints` silently filters out years with `value === 0` (`.filter(point => point.value > 0)`) while `semesterChartPoints` does not. This means the same underlying data can produce points in semester mode but an empty array in year mode.
- Toggling between "Trimestre" and "Año" preserves filter state (`semesterChartYearId`, `semesterChartGradeId`), causing stale filters to produce unexpected empty results.

## Goals / Non-Goals

**Goals:**
- Each chart panel independently shows a "Sin datos" message when its data is empty.
- Toggling the grouping mode resets the semester/year chart filters to defaults.
- `yearChartPoints` and `semesterChartPoints` treat zero-value data consistently.

**Non-Goals:**
- Refactoring charts into separate components (a bigger refactor, not needed for the fix).
- Changing the grade chart behavior (it works correctly).

## Decisions

**1. Split `hasVisibleChartData` into per-chart memos**
Replace the single combined memo with `hasGradeChartData` and `hasSemesterChartData`. Remove the outer `<Show>` that wraps both charts. Each chart panel gets its own conditional rendering for the "no data" state.

Alternative considered: keep the outer `<Show>` and add inner `<Show>`s per chart. Rejected because the outer `<Show>` unmounts canvases, which is the root cause of DOM flicker.

**2. Show "Sin datos" per chart when points are empty**
Each chart panel renders a "Sin datos para mostrar." message when its respective points memo returns an empty array, instead of leaving a blank canvas. The canvas element is hidden (not removed from DOM) when there's no data, to avoid re-mounting issues with Chart.js refs.

**3. Reset filters on grouping toggle**
In the `setSemesterChartGrouping` onClick handlers, also call `setSemesterChartYearId('')` and `setSemesterChartGradeId('')`. This ensures a clean slate when switching views.

**4. Remove `.filter(point => point.value > 0)` from `yearChartPoints`**
Make it consistent with `semesterChartPoints` — show all years even if count is 0. This prevents the confusing case where semester mode shows data but year mode shows nothing.

## Risks / Trade-offs

- **Per-chart Show/hide adds slightly more JSX** → Acceptable; the logic is simpler and each chart is self-contained.
- **Resetting filters on toggle loses user selections** → This is the desired behavior per user feedback. The alternative (preserving filters) causes more confusion.
