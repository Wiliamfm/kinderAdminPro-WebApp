# Project Overview

Last updated: 2026-02-26

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
- Reports (`/reports`)
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
  - unique `document_id`,
  - `date_of_birth` stored as datetime with timezone offset,
  - list active students in an admin-only table,
  - create student records from modal form,
  - edit records in dedicated route,
  - soft delete via `active = false`.
- Store employee invoices in PocketBase:
  - `invoices` links each invoice to one employee (`employee_id`),
  - `invoices.name` stores the normalized original filename with a timestamp suffix (for example `factura_demo_20260223_1000.pdf`),
  - `invoice_files` stores the attached file,
  - invoice upload is available from a dedicated action icon in the employees table,
  - invoice history includes an edit action to upload a new file and replace the existing invoice file,
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
