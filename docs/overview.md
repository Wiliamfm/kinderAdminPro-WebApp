# Project Overview

Last updated: 2026-02-23

## Purpose
This application is a SolidJS frontend for staff and operational management workflows backed by PocketBase.

## Scope
Primary functional areas exposed through routes:
- Authentication (`/login`)
- Home and backend health (`/`)
- Staff management (`/staff-management`, `/staff-management/employees`, `/staff-management/employees/:id`)
- Enrollment management (`/enrollment-management`)
- Reports (`/reports`)
- Event management (`/event-management`)

## Core Workflows
- Authenticate against PocketBase `users`.
- List and manage employees.
- Manage employee leaves from the employee list modal:
  - create leave,
  - edit existing leave,
  - validate date order and overlap,
  - paginate leave history.

## Tech Stack
- SolidJS + TypeScript + Vite
- PocketBase JS SDK
- Tailwind CSS 4
- Vitest + Solid Testing Library + JSDOM
- Bun (preferred package manager and script runner)

## Environment
- `VITE_PB_URL` (optional; defaults to `http://127.0.0.1:8090`)
- Note: `VITE_*` variables are compile-time in Vite.
