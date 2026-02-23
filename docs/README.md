# Documentation Map

Last updated: 2026-02-23

## Purpose
This folder is the canonical documentation set for architecture, change process, and LLM collaboration in this repository.

## Standard
Docs follow a Diataxis-lite structure:
- `overview.md`: high-level explanation
- `architecture.md`: technical reference
- `change-management.md`: procedural guide for changes
- `llm-playbook.md`: practical guidance for AI-assisted edits

## Source Of Truth
- Runtime and script truth: `package.json`
- Routes and page wiring: `src/routes.ts`
- PocketBase access layer: `src/lib/pocketbase/`
- Agent behavior and repo conventions: `AGENTS.md`

## When To Update Docs
Update docs in the same PR whenever changes affect:
- PocketBase schema or API rules
- Auth/authorization behavior (for example `users.is_admin`)
- Route structure or page responsibilities
- Core UI workflows (forms, modal actions, validation)
- Build/test/developer scripts

## Reading Order For New Contributors And LLMs
1. `overview.md`
2. `architecture.md`
3. `change-management.md`
4. `llm-playbook.md`
