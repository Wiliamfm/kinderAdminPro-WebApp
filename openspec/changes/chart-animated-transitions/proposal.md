## Why

The student report charts in `students.tsx` use a destroy-and-recreate pattern on every data change. This causes visual flicker and prevents smooth transitions when filters change. Refactoring to `chart.update()` produces clean animations, simplifies the chart lifecycle (collapsing 3 effects into 2), and sets the foundation for future interactivity features (click handlers, enhanced tooltips) that require persistent chart instances.

## What Changes

- Refactor the 3 chart `createEffect` blocks in `src/routes/reports/students.tsx` to use the `chart.update()` pattern: create chart instances once when the canvas mounts, then reactively update `data.labels`, `data.datasets[0].data`, and `data.datasets[0].label` on data changes.
- Merge the semester chart effect and year chart effect (which share a canvas and instance) into a single unified effect that switches data based on `semesterChartGrouping()`.
- Remove `requestAnimationFrame` scheduling — no longer needed since charts are created once and updated in place.
- Existing chart behavior (labels, colors, axes, visibility guards) remains identical.

## Capabilities

### New Capabilities
- `chart-update-pattern`: Refactors student report charts from destroy/recreate to Chart.js `chart.update()` lifecycle, enabling smooth animated transitions and persistent chart instances.

### Modified Capabilities

None. No spec-level behavior changes — this is a pure implementation refactor. Existing chart output remains identical.

## Impact

- **Code**: `src/routes/reports/students.tsx` — chart creation effects and cleanup logic.
- **Visual**: Charts animate between states instead of flickering on filter changes.
- **Downstream**: Enables `chart-click-and-tooltips` change — click handlers and tooltip plugins require persistent chart instances to avoid re-registration on every data change.
