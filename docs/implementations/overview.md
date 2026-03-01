# Implementations Documentation Standard

Last updated: 2026-03-01

## Purpose
Define a professional, consistent format for implementation-specific documents that are detailed enough for direct execution by engineers and LLM agents.

## Scope
Use `docs/implementations/*.md` for decision-complete implementation specs, including:
- new features,
- schema/rules changes,
- significant refactors,
- cross-module behavior changes.

Do not use this folder for high-level architecture or team process guides. Keep those in the root `docs/` files.

## Naming Convention
Use lowercase snake_case filenames:
- Format: `<category>_<use_case>.md`
- Allowed categories:
  - `feature`
  - `schema`
  - `refactor`
  - `fix`
  - `integration`
  - `rollout`

Examples:
- `feature_reports_students.md`
- `schema_bulletins_students.md`
- `integration_pocketbase_semesters_sync.md`

## Required Document Layout
Each implementation file must include, in this order:

1. `Title`
2. `Summary`
3. `Important Interfaces Or Schema Changes`
4. `Implementation Plan`
5. `Test Cases And Scenarios`
6. `Assumptions And Defaults`

This layout is mandatory because it is optimized for:
- human execution with minimal ambiguity,
- LLM planning/execution workflows,
- review traceability.

## Content Quality Rules
Every implementation spec must be:
- decision complete: no unresolved implementation choices left to the executor,
- explicit about scope boundaries (in-scope and out-of-scope),
- explicit about auth/security impacts,
- explicit about data model and migration implications,
- explicit about validation steps and acceptance criteria.

Avoid:
- vague language ("handle this", "improve that"),
- hidden assumptions,
- missing test definitions.

## Sensitive Data Policy (Mandatory)
Do not include sensitive information in any file under `docs/implementations/`.

Forbidden content includes:
- secrets and credentials (API keys, tokens, passwords, private keys),
- personally identifiable information (emails, phone numbers, document IDs, addresses),
- real production/internal hostnames, private IPs, or internal URLs,
- raw auth headers, cookies, session identifiers, or exported auth payloads,
- `.env` values or direct copies of environment configuration with real secrets.

Required practice:
- use placeholders (for example: `<API_KEY>`, `<TOKEN>`, `<ADMIN_EMAIL>`),
- redact examples when needed (`***REDACTED***`),
- describe where a value is sourced without printing it,
- keep logs and command examples sanitized.

If sensitive data is detected, it must be removed/redacted before merging documentation changes.

## Execution-Focused Writing Rules
- Prefer concrete file paths, route paths, collection names, and function signatures.
- Use imperative, implementation-ready language.
- Keep sections concise but technically complete.
- Record defaults when the requester did not specify a detail.

## Lifecycle And Maintenance
Each implementation file should include:
- `Last updated` date,
- `Status` (`Planned`, `In Progress`, `Completed`, `Superseded`).

When scope changes during execution:
- update the same file instead of creating duplicates,
- preserve the original intent and clearly document new decisions.

When superseded:
- keep the old file for history,
- add a short note at the top pointing to the newer file.
