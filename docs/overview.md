# Project Overview

Last updated: 2026-03-01

## Purpose
This application is a SolidJS frontend for staff and operational management workflows backed by PocketBase.

## Scope
Primary functional areas exposed through routes:
- Authentication (`/login`)
- Invitation onboarding (`/auth/set-password`)
- Home and backend health (`/`)
- Staff management (`/staff-management`, `/staff-management/employees`, `/staff-management/employees/:id`, `/staff-management/jobs`, `/staff-management/app-users`)
- Enrollment management (`/enrollment-management`)
- Enrollment students (`/enrollment-management/students`, `/enrollment-management/students/:id`)
- Enrollment grades (`/enrollment-management/grades`)
- Enrollment semesters (`/enrollment-management/semesters`, `/enrollment-management/semesters/:id`)
- Enrollment bulletins (`/enrollment-management/bulletins`)
- Reports (`/reports`)
- Reports students (`/reports/students`)
- Event management (`/event-management`)

## Core Workflows
- Authenticate against PocketBase `users`.
- List and manage employees.
- List and manage employee jobs (`employee_jobs`) and assign them as relation on employees (`employees.job_id`).
- Create employees from the staff list:
  - create linked auth user (`users`) with default `is_admin = false`,
  - persist `employees.user_id` relation,
  - persist `employees.job_id` relation,
  - send password setup email,
  - allow admin resend of onboarding invite.
- Manage employee leaves from the employee list modal:
  - create leave,
  - edit existing leave,
  - validate date order and overlap,
  - paginate leave history.
- Manage enrollment students data in PocketBase `students` collection:
  - admin-only CRUD access,
  - required relation `grade_id` to `grades`,
  - numeric-only unique `document_id`,
  - `date_of_birth` stored as datetime with timezone offset,
  - list active students in an admin-only table,
  - create student records from modal form,
  - edit records in dedicated route,
  - soft delete via `active = false`.
- Manage student-family data in PocketBase:
  - `fathers` collection stores parent/tutor identity and contact data,
  - admin-only CRUD access for `fathers`,
  - required `full_name` and unique `document_id`,
  - soft delete via `is_active = false`,
  - optional duplicated `email`,
  - `students_fathers` collection models n:n student-parent links,
  - each link requires `student_id`, `father_id`, and `relationship` (`father`, `mother`, `other`),
  - each link stores `created_at` as auto-created datetime with timezone offset,
  - duplicate `student_id` + `father_id` pairs are blocked by unique index,
  - relation reads are ordered by `created_at,id`,
  - student and tutor create/edit flows require at least one linked counterpart.
- Manage enrollment grades data in PocketBase `grades` collection:
  - admin-only CRUD access,
  - unique `name`,
  - integer `capacity` greater than 0,
  - prevent deletion while active students are linked to the grade.
- Manage enrollment semesters data in PocketBase `semesters` collection:
  - admin-only create/list/update access from enrollment module,
  - required `name` (unique), `start_date`, `end_date`, plus `is_current` (bool default `false`),
  - `created_at` and `updated_at` stored as backend-managed autodate fields,
  - `end_date` must be at least 1 day after `start_date`,
  - when `is_current = true`, date range must include today,
  - setting `is_current = true` automatically unsets the previously current semester.
- Manage enrollment bulletins data in PocketBase:
  - `bulletin_categories` collection stores bulletin categories with required `name` (unique) and `description`,
  - `bulletin_categories` includes backend-managed `created_at` and `updated_at` autodate fields,
  - `bulletins` collection stores student bulletin entries with required `category_id`, `grade_id`, `description`,
  - `bulletins` stores audit fields `created_by` and `updated_by` as relations to `users`,
  - `bulletins` includes backend-managed `created_at` and `updated_at` autodate fields,
  - list and create/edit/delete workflows are admin-only and available in `/enrollment-management/bulletins`,
  - bulletin deletion is soft delete via `is_deleted = true`,
  - category deletion is hard delete and blocked when linked bulletins exist.
- Manage student report notes in PocketBase:
  - `bulletins_students` collection stores the relation between bulletin, student, grade, and semester,
  - required relations: `bulletin_id`, `student_id`, `grade_id`, `semester_id`,
  - required integer `note` greater than `0` plus optional `comments`,
  - admin-only list/create/update/delete access,
  - audit fields `created_by` and `updated_by` are stored as `users` relations,
  - backend-managed `created_at` and `updated_at` autodate fields are exposed in UI,
  - deletion is soft delete via `is_deleted = true`,
  - workflow is available in `/reports/students` with sortable and paginated table plus create/edit/delete modals.
- Store employee invoices in PocketBase:
  - `invoices` links each invoice to one employee (`employee_id`),
  - `invoices` links each invoice to one semester (`semester_id`, required relation to `semesters`),
  - `invoices.name` stores the normalized original filename with a timestamp suffix (for example `factura_demo_20260223_1000.pdf`),
  - `invoice_files` stores the attached file,
  - invoice upload is available from a dedicated action icon in the employees table,
  - invoice create uses the current active semester (`is_current = true`) as a required read-only value in UI,
  - invoice create is blocked when there is no active semester,
  - invoice history includes an edit action to upload a new file and replace the existing invoice file while keeping its existing semester,
  - invoice history is shown in a modal with filename (`Nombre de archivo`) and date (`Fecha de registro`) columns, where date displays `update_datetime` and falls back to `creation_datetime`.

## Temporal Data Standard
- All temporal values must be modeled and exchanged as datetime with timezone offset (RFC3339/ISO 8601 style).
- Date-only storage is not allowed for new or migrated schema fields.
- UI inputs like `datetime-local` are accepted for capture, but must be converted to offset-aware datetime strings before persistence.

## Tech Stack
- SolidJS + TypeScript + Vite
- PocketBase JS SDK
- Tailwind CSS 4
- Vitest + Solid Testing Library + JSDOM
- Bun (preferred package manager and script runner)

## Environment
- `VITE_PB_URL` (optional; defaults to `http://127.0.0.1:8090`)
- Note: `VITE_*` variables are compile-time in Vite.
