## Why

Fathers (and mothers/other guardians) need to see their children's academic progress online. Currently, they have user accounts with the 'father' role but no way to log in and view their students' information. This prevents parents from staying informed about their children's grades, bulletins, and enrollment status.

## What Changes

- Add a new protected module `father-portal` accessible to users with the 'father' role
- Create API to fetch all students linked to an authenticated father, including their status and bulletins
- Create a new page `/father-portal` showing a list of linked students with their status and bulletins
- Add PDF export per student (similar to existing reports export)

## Capabilities

### New Capabilities
- `father-student-list`: List all students linked to the authenticated guardian with their enrollment status (active, pending, rejected)
- `father-bulletin-view`: View bulletins/grades for each linked student grouped by grade and semester
- `father-student-export`: Export individual student bulletins as PDF

### Modified Capabilities
- `auth-module-access`: Add 'father' role to access protected modules (currently only admin/professor have access)

## Impact

- New route: `src/routes/father-portal.tsx`
- New API functions in `src/lib/pocketbase/`:
  - Function to get father's linked students with status
  - Function to get bulletins for a student's linked guardian
- Modified `src/lib/auth/shared.ts` module access rules
- New PDF export server function