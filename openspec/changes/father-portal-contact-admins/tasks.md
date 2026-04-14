## 1. Add Contact Button to Father Portal

- [x] 1.1 Add "Contactar" button in the header actions area of father-portal.tsx
- [x] 1.2 Create state signals for modal visibility (contactModalOpen)

## 2. Fetch Father Data

- [x] 2.1 Add import for `getAuthenticatedPbWithUserId` in father-portal.tsx
- [x] 2.2 Create function to fetch father's `full_name` and `email` from `fathers` collection by user_id
- [x] 2.3 Add resource to load father data when modal opens

## 3. Fetch Employee List

- [x] 3.1 Add import for `listActiveEmployees` and `EmployeeRecord` type
- [x] 3.2 Create resource to load active employees for the multi-select dropdown

## 4. Create Contact Modal Component

- [x] 4.1 Add state signals: selectedEmployeeIds, subjectInput, bodyText, sendBusy
- [x] 4.2 Create multi-select dropdown for employees with format "Name - email"
- [x] 4.3 Create subject input with auto-prefix "{fatherEmail} - {fatherName}:"
- [x] 4.4 Create body textarea for message composition
- [x] 4.5 Add "Cancelar" and "Enviar" buttons in modal footer

## 5. Implement Form Validation

- [x] 5.1 Validate at least one employee is selected before enabling send
- [x] 5.2 Validate subject is not empty after the prefix
- [x] 5.3 Validate body is not empty

## 6. Implement Send Functionality

- [x] 6.1 Build full subject: "{fatherEmail} - {fatherName}: {userSubject}"
- [x] 6.2 Import and call `resolveEmployeeRecipients()` with selected employee IDs
- [x] 6.3 Import and call `sendEventEmail()` with composed subject and body
- [x] 6.4 Handle success: display success message, close modal, reset form
- [x] 6.5 Handle error: display error message

## 7. Add Success/Error Feedback

- [x] 7.1 Reuse existing `actionError` and `successMessage` signals for inline alerts
- [x] 7.2 Display success message after successful send
- [x] 7.3 Display error message on failure

## 8. Reset Modal State on Close

- [x] 8.1 Clear selected employees on modal close
- [x] 8.2 Clear subject and body on modal close
- [x] 8.3 Clear any error/success messages

## 9. Testing

- [x] 9.1 Test modal opens on button click
- [x] 9.2 Test employee list loads and displays correctly
- [x] 9.3 Test validation prevents sending without recipients/subject/body
- [x] 9.4 Test send persists email to database
- [x] 9.5 Test success/error feedback displays correctly
