## 1. Refactor grade chart to create-once + update pattern

- [ ] 1.1 Replace the grade chart `createEffect` (destroy/recreate) with a creation effect that instantiates the Chart.js instance when `gradeChartCanvas()` becomes available, with empty initial data and full styling config (colors, border radius, axes, legend)
- [ ] 1.2 Add a separate `createEffect` that reads `gradeChartPoints()` and `gradeChartSemesterId()`, updates `gradeChartInstance.data.labels`, `gradeChartInstance.data.datasets[0].data`, and `gradeChartInstance.data.datasets[0].label`, then calls `gradeChartInstance.update()`
- [ ] 1.3 Remove `requestAnimationFrame` wrapping and its `onCleanup` for the grade chart

## 2. Refactor semester/year chart to unified create-once + update pattern

- [ ] 2.1 Replace the two semester/year chart `createEffect` blocks with a single creation effect that instantiates `semesterChartInstance` when `semesterChartCanvas()` becomes available, with empty initial data and semester chart styling
- [ ] 2.2 Add a single `createEffect` that reads `semesterChartGrouping()`, picks between `semesterChartPoints()` and `yearChartPoints()`, computes the appropriate label, and calls `semesterChartInstance.update()`
- [ ] 2.3 Remove `requestAnimationFrame` wrapping and its `onCleanup` for both semester/year chart effects

## 3. Update cleanup logic

- [ ] 3.1 Update the component-level `onCleanup` to remain as-is (destroy both instances and null them) — move chart-specific `onCleanup` into the creation effects instead

## 4. Verify

- [ ] 4.1 Run existing tests in `src/pages/reports-students.test.tsx` and confirm they pass without changes
- [ ] 4.2 Verify charts render correctly with data and animate smoothly when filters change
- [ ] 4.3 Verify semester/year grouping toggle animates the transition
- [ ] 4.4 Verify charts handle empty data gracefully (card hides, no errors)
