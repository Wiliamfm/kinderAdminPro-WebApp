## 1. Database Changes

- [x] 1.1 Add `accepted` field to students collection (bool, default false)
- [x] 1.2 Add `rejected` field to students collection (datetime)

## 2. Backend API Functions

- [x] 2.1 Add `listPendingEnrollmentRequests` function in `src/lib/pocketbase/students.ts`
- [x] 2.2 Add `acceptEnrollmentRequest` function in `src/lib/pocketbase/students.ts`
- [x] 2.3 Add `rejectEnrollmentRequest` function in `src/lib/pocketbase/students.ts`

## 3. Frontend Page

- [x] 3.1 Create route file `src/routes/enrollment-management/requests.tsx`
- [x] 3.2 Implement pending requests table with columns: name, document_id, grade, birth_place, department, father_name, created, actions
- [x] 3.3 Add Accept button that calls `acceptEnrollmentRequest`
- [x] 3.4 Add Reject button that calls `rejectEnrollmentRequest`
- [x] 3.5 Add loading states and error handling
- [x] 3.6 Add access control (require 'enrollment' module)

## 4. Verification

- [ ] 4.1 Test that pending requests appear in the table — **manual verification required**
- [ ] 4.2 Test Accept action moves student to active status — **manual verification required**
- [ ] 4.3 Test Reject action marks student as rejected — **manual verification required**
- [ ] 4.4 Verify no access for users without enrollment permission — **manual verification required**