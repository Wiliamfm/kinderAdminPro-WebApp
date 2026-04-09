## 1. Batch 1 - Main Routes (Home & Enrollment)

- [x] 1.1 Update `routes/index.tsx` - "Sin semestre activo" → "Sin trimestre activo"
- [x] 1.2 Update `routes/enrollment-management/semesters.tsx` - labels, headers, buttons
- [x] 1.3 Update `routes/enrollment-management/semesters/[id].tsx` - edit form labels
- [x] 1.4 Update `lib/section-index.ts` - navigation label "Gestion de semestres"

## 2. Batch 2 - Feature Pages

- [x] 2.1 Update `routes/reports/students.tsx` - chart labels, filters, headers
- [x] 2.2 Update `routes/reports/employees.tsx` - chart labels, filters, headers
- [x] 2.3 Update `routes/staff-management/employees.tsx` - leave/invoice semester labels
- [x] 2.4 Update `routes/professor/personal/leaves.tsx` - error messages, labels
- [x] 2.5 Update `routes/professor/personal/invoices.tsx` - semester label
- [x] 2.6 Update `routes/professor/students/[id].tsx` - semester labels, history

## 3. Batch 3 - Error Messages & Tests

- [ ] 3.1 Update `lib/pocketbase/leaves.ts` - validation error messages
- [x] 3.2 Update test files in `src/pages/` - semester-related test strings
- [x] 3.3 Update test files in `src/lib/pocketbase/` - validation test strings

## 4. Verification

- [x] 4.1 Run `grep -r "semestre" src/` to verify no remaining occurrences
- [x] 4.2 Run `bun run test` to ensure all tests pass
- [x] 4.3 Run `bun run build` to verify no build errors