## 1. Backend API

- [x] 1.1 Create `src/lib/pocketbase/father-register-student.ts` with function to register student linked to existing father
- [x] 1.2 Implement function that creates student (active=true, accepted=false) and creates students_fathers link
- [x] 1.3 Add document_id uniqueness validation (check if student exists before create)
- [x] 1.4 Write tests for the new API function

## 2. Frontend - API Integration

- [x] 2.1 Create server action wrapper to call the new API function from client
- [x] 2.2 Add function to check document_id uniqueness (for blur validation)

## 3. Frontend - Modal & Form

- [x] 3.1 Add "Registrar nuevo estudiante" button to father-portal page
- [x] 3.2 Create modal component for student registration
- [x] 3.3 Add student form fields (reuse from /register route)
- [x] 3.4 Add relationship dropdown selector
- [x] 3.5 Add blur validation for document_id uniqueness
- [x] 3.6 Add error display for duplicate document_id

## 4. Frontend - Success Flow

- [x] 4.1 Handle successful registration: close modal
- [x] 4.2 Show success message "Tu solicitud está pendiente de aprobación"
- [x] 4.3 Refresh student list after successful registration

## 5. Testing & Validation

- [x] 5.1 Test complete flow: open modal, fill form, submit, verify student appears
- [x] 5.2 Test duplicate document_id validation
- [x] 5.3 Run existing tests to ensure no regressions
- [x] 5.4 Verify mobile responsive behavior
