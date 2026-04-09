## 1. Add Translation Mapping

- [x] 1.1 Add `formatRelationshipLabel()` function to `src/lib/pocketbase/students-fathers.ts`
  - Map: `'father'` → `'Padre'`, `'mother'` → `'Madre'`, `'other'` → `'Otro'`

## 2. Update Student Edit Form

- [x] 2.1 Update dropdown in `src/routes/enrollment-management/students/[id].tsx`
  - Replace direct `{relationship}` with `{formatRelationshipLabel(relationship)}`

## 3. Update Tutors Create Form

- [x] 3.1 Update dropdown in `src/routes/enrollment-management/tutors.tsx`
  - Same pattern as student edit

## 4. Update Tutor Edit Form

- [x] 4.1 Update dropdown in `src/routes/enrollment-management/tutors/[id].tsx`
  - Same pattern as student edit

## 5. Update Student List Column Header

- [x] 5.1 Change header in `src/routes/enrollment-management/students.tsx`
  - From "father_names" or implied English to "Padres"
