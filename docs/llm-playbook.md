# LLM Playbook

Last updated: 2026-02-23

## Purpose
Provide concise operational guidance for LLMs and agentic tools working in this repository.

## Source Of Truth
- Repo rules: `AGENTS.md`
- Architecture: `docs/architecture.md`
- Process: `docs/change-management.md`

## Expected Workflow
1. Explore first (routes, feature page, wrapper modules, tests).
2. Propose a change scoped to existing patterns.
3. Implement with minimal surface area.
4. Validate with tests/build.
5. Update docs when architecture/process changed.

## File Ownership Hints
- Routing and page registration: `src/routes.ts`
- Auth utilities and session-derived state: `src/lib/pocketbase/auth.ts`
- PocketBase collection wrappers: `src/lib/pocketbase/*.ts`
- Employee + leaves UI workflow: `src/pages/staff-employees.tsx`
- Reusable modal behavior: `src/components/Modal.tsx`

## Common Pitfalls
- Confusing PocketBase superusers with app `users` records.
- Forgetting that `VITE_*` vars are compile-time.
- Incorrect timezone assumptions with `datetime-local` values.
- Repeating overlap checks without excluding the record currently edited.
- Adding direct collection calls in pages instead of wrapper modules.

## Minimum Validation Before Completion
- `bun run test`
- `bun run build`

## Documentation Contract
If a change modifies core behavior, update at least one of:
- `docs/overview.md`
- `docs/architecture.md`
- `docs/change-management.md`
- `AGENTS.md`
