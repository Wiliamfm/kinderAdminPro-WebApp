## 1. Add helper functions to errors.ts

- [x] 1.1 Add `isUniqueFieldError(error, fieldName)` function in `src/lib/pocketbase/errors.ts`
- [x] 1.2 Add `getUniqueFieldLabel(fieldName)` mapping function in `errors.ts`
- [x] 1.3 Add unit tests for both helper functions in `errors.test.ts`

## 2. Update employees.ts

- [x] 2.1 Update `createEmployee()` to catch document_id unique errors and throw contextual message
- [x] 2.2 Run existing tests to verify no regression

## 3. Update public-students.ts

- [x] 3.1 Update `publicCreateStudent()` to catch document_id unique errors and throw contextual message
- [x] 3.2 Run existing tests to verify no regression

## 4. Update public-fathers.ts

- [x] 4.1 Update `publicCreateFather()` to catch document_id unique errors and throw contextual message
- [x] 4.2 Verify email error handling already exists
- [x] 4.3 Run existing tests to verify no regression

## 5. Update grades.ts

- [x] 5.1 Update `createGrade()` to catch name unique errors and throw contextual message
- [x] 5.2 Update `updateGrade()` to catch name unique errors
- [x] 5.3 Run existing tests to verify no regression

## 6. Update semesters.ts

- [x] 6.1 Update `createSemester()` to catch name unique errors and throw contextual message
- [x] 6.2 Update `updateSemester()` to catch name unique errors
- [x] 6.3 Run existing tests to verify no regression

## 7. Update bulletin-categories.ts

- [x] 7.1 Update `createBulletinCategory()` to catch name unique errors and throw contextual message
- [x] 7.2 Update `updateBulletinCategory()` to catch name unique errors
- [x] 7.3 Run existing tests to verify no regression

## 8. Integration testing

- [x] 8.1 Test the /register flow with duplicate document_id to verify clear error message
- [x] 8.2 Test staff employee creation with duplicate document_id
- [x] 8.3 Test grade creation with duplicate name
- [ ] 8.4 Run full test suite
