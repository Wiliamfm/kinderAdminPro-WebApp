# Project Overview

Last updated: 2026-02-23

## Purpose
This application is a SolidJS frontend for staff and operational management workflows backed by PocketBase.

## Scope
Primary functional areas exposed through routes:
- Authentication (`/login`)
- Invitation onboarding (`/auth/set-password`)
- Home and backend health (`/`)
- Staff management (`/staff-management`, `/staff-management/employees`, `/staff-management/employees/:id`, `/staff-management/jobs`, `/staff-management/app-users`)
- Enrollment management (`/enrollment-management`)
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
- Store employee invoices in PocketBase:
  - `invoices` links each invoice to one employee (`employee_id`),
  - `invoices.name` stores the normalized original filename with a timestamp suffix (for example `factura_demo_20260223_1000.pdf`),
  - `invoice_files` stores the attached file,
  - invoice upload is available from a dedicated action icon in the employees table,
  - invoice history includes an edit action to upload a new file and replace the existing invoice file,
  - invoice history is shown in a modal with filename (`Nombre de archivo`) and date (`Fecha de registro`) columns, where date displays `update_datetime` and falls back to `creation_datetime`.

## Tech Stack
- SolidJS + TypeScript + Vite
- PocketBase JS SDK
- Tailwind CSS 4
- Vitest + Solid Testing Library + JSDOM
- Bun (preferred package manager and script runner)

## Environment
- `VITE_PB_URL` (optional; defaults to `http://127.0.0.1:8090`)
- Note: `VITE_*` variables are compile-time in Vite.
