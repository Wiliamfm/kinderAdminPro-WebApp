## Context

The student reports page (`src/routes/reports/students.tsx`) has 3 chart `createEffect` blocks that manage Chart.js bar charts: one for grade distribution, one for semester distribution, and one for year distribution. The semester and year effects share a single canvas and instance variable (`semesterChartInstance`), toggled by `semesterChartGrouping()`.

All 3 effects follow the same pattern: destroy the existing chart instance, then create a new one inside `requestAnimationFrame`. This causes visual flicker on every filter change and prevents Chart.js's built-in bar transition animations from running.

The employees reports page (`src/routes/reports/employees.tsx`) uses the same pattern but is out of scope.

## Goals / Non-Goals

**Goals:**
- Refactor chart lifecycle to create-once, update-reactively using `chart.update()`
- Merge the semester and year chart effects into a single effect
- Enable smooth Chart.js animations on data transitions
- Maintain identical chart output (labels, colors, axes, visibility)

**Non-Goals:**
- Refactoring employees.tsx charts
- Adding click handlers or enhanced tooltips (deferred to `chart-click-and-tooltips`)
- Changing chart types, colors, or styling
- Changing data computation logic (the `*ChartPoints` memos)

## Decisions

### Separate creation and update into two effects per chart

**Choice:** Use one `createEffect` to instantiate the chart when the canvas ref becomes available, and a second `createEffect` to reactively update its data when points/labels change.

**Alternative considered:** A single effect that checks whether the instance exists and either creates or updates. This conflates two concerns and makes the reactive dependency graph harder to reason about — the creation effect depends on the canvas signal, while the update effect depends on chart points.

### Merge semester and year effects into one update effect

**Choice:** A single update effect reads `semesterChartGrouping()` to pick between `semesterChartPoints()` and `yearChartPoints()`, then updates the shared `semesterChartInstance`.

**Alternative considered:** Keep two separate update effects with early returns based on grouping. This is the current approach and requires careful coordination to ensure one destroys what the other created. A single effect eliminates this coupling.

### Remove requestAnimationFrame

**Choice:** Drop `requestAnimationFrame` wrapping. Chart creation runs synchronously in the effect. `chart.update()` calls are also synchronous (Chart.js handles its own animation frames internally).

**Alternative considered:** Keep `requestAnimationFrame` for creation. Originally used to avoid creating the chart in the same frame as canvas mount, but in practice Solid's effect scheduling already runs after DOM updates. Removing it simplifies the code and eliminates the `onCleanup` for `cancelAnimationFrame`.

### Handle empty data via chart.update() with empty arrays

**Choice:** When chart points become empty, update the chart with `labels: []` and `data: []` instead of destroying it. The existing `hasGradeChartData` / `hasSemesterChartData` visibility memos already hide the chart card, so the empty chart is never visible.

**Alternative considered:** Destroy the instance when data is empty and recreate when data returns. This reintroduces the destroy/recreate pattern for edge cases and complicates the lifecycle.

## Risks / Trade-offs

**Chart.js instance memory** → Chart instances now persist even when their card is hidden (empty data). The memory overhead of an empty Chart.js instance is negligible (~few KB). The instance is still destroyed on component cleanup via `onCleanup`.

**Reactive dependency clarity** → Splitting into create + update effects means the update effect must guard against `instance` being null (canvas not yet mounted). A simple `if (!instance) return` handles this. Since Solid effects run synchronously in dependency order, the create effect always runs first when both depend on the same mount cycle.
