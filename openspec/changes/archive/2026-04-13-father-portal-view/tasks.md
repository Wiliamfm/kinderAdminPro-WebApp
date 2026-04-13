## 1. Auth Module Updates

- [x] 1.1 Add 'father-portal' to ProtectedModule type in src/lib/auth/shared.ts
- [x] 1.2 Update canUserAccessModule to grant father-portal access for users with 'father' role

## 2. API Functions

- [x] 2.1 Create listFatherStudents function in src/lib/pocketbase/ to fetch father's linked students with status
- [x] 2.2 Create listFatherBulletin function to fetch bulletins for a specific student
- [x] 2.3 Create exportFatherStudentReport function in src/lib/server/exports/

## 3. Frontend Page

- [x] 3.1 Create src/routes/father-portal.tsx page
- [x] 3.2 Implement student list with status display
- [x] 3.3 Implement expand/collapse to show bulletins per student
- [x] 3.4 Add PDF export button per student row
- [x] 3.5 Add empty state handling

## 4. Navigation & Polish

- [x] 4.1 Update index page or create redirect to send father-role users to /father-portal
- [x] 4.2 Verify responsive design works on mobile
- [x] 4.3 Test with multiple linked students
