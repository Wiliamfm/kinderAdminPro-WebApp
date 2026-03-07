## 1. Analytics data loading

- [ ] 1.1 Add a leave analytics PocketBase wrapper that returns leave rows with employee metadata needed for reporting.
- [ ] 1.2 Expose semester metadata needed to determine the current semester and fallback latest semester for the reports page.

## 2. Employee reports page

- [ ] 2.1 Implement leaves-per-employee chart aggregation with semester-overlap matching and leave-record counting.
- [ ] 2.2 Add the leave chart UI, semester selector, default current-semester active-employee view, and historical semester behavior to `src/pages/reports-employees.tsx`.

## 3. Validation and documentation

- [ ] 3.1 Add or update tests covering default leave chart behavior, historical semester filtering, inactive employee inclusion, and cross-semester leave overlap.
- [ ] 3.2 Update affected documentation for the employee reports data flow and chart behavior.
- [ ] 3.3 Run `bun run test` and `bun run build`.
