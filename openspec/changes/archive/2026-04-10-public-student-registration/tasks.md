## 1. Backend - Public PocketBase Client

- [x] 1.1 Create `src/lib/pocketbase/public.ts` with unauthenticated PocketBase instance
- [x] 1.2 Add `publicCreateFather()` function in `src/lib/pocketbase/public-fathers.ts`
- [x] 1.3 Add `publicCreateStudent()` function in `src/lib/pocketbase/public-students.ts` (active=true, accepted=false)
- [x] 1.4 Add `publicCreateStudentFatherLink()` function in `src/lib/pocketbase/public-students-fathers.ts`
- [x] 1.5 Create `src/lib/pocketbase/public.ts` barrel export file

## 2. Frontend - Route Setup

- [x] 2.1 Add public route `/register` in `src/app.tsx` (outside auth guard, like `/login`)
- [x] 2.2 Create `src/routes/register.tsx` as shell component

## 3. Frontend - Registration Form Component

- [x] 3.1 Build student form section with all fields from spec
- [x] 3.2 Build father form section with all fields from spec
- [x] 3.3 Add form validation (reuse patterns from existing student edit form)
- [x] 3.4 Add grade dropdown with active grades loading
- [x] 3.5 Add success state with "pending approval" message
- [x] 3.6 Add error handling and display

## 4. Integration - Form Submission

- [x] 4.1 On submit: create father first, then student, then link
- [x] 4.2 Handle partial failure (rollback on error)
- [x] 4.3 Wire up all form fields to state management

## 5. Testing

- [x] 5.1 Test form validation (required fields, numeric validation)
- [x] 5.2 Test successful submission creates records with correct flags
- [x] 5.3 Test error handling on partial failure
- [x] 5.4 Test public access without authentication

## 6. Verification

- [x] 6.1 Run `bun run build` to verify no type errors
- [x] 6.2 Verify enrollment appears in `/enrollment-management/requests`
