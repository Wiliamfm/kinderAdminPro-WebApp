# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the SolidJS app code.
- `src/pages/` holds route-level pages (for example `home.tsx`, `staff-employees.tsx`, `login.tsx`).
- `src/errors/404.tsx` defines the not-found UI.
- `src/routes.ts` and `src/app.tsx` configure routing and app composition.
- `src/index.tsx` and `src/index.css` are the entry point and global styles.
- `src/lib/pocketbase/` holds PocketBase client wrappers and request helpers.
- `src/test/` contains test setup files.
- `public/` is not currently present; add static assets there if needed.

## Build, Test, and Development Commands
- `bun install`: install dependencies (preferred in this repository).
- `bun run dev` (or `bun run start`): run the Vite dev server locally.
- `bun run build`: create a production bundle in `dist/`.
- `bun run serve`: preview the production build locally.
- `bun run test`: run Vitest test suite once.
- `bun run test:watch`: run Vitest in watch mode.

NPM equivalents are available (`npm run dev`, `npm run build`, `npm run test`), but Bun is the default workflow.

Use Node 22+ for compatibility with current toolchain versions.

## Coding Style & Naming Conventions
- Language: TypeScript + TSX with SolidJS.
- Indentation: 2 spaces; keep imports grouped and minimal.
- Components and page files: use clear, PascalCase exports where applicable.
- Route/data pattern: pair page modules with `.data.ts` files when route-scoped data fetching is needed.
- Keep CSS near the feature when practical, and use `src/index.css` for shared global styles.
- All pages must be responsive across mobile, tablet, and desktop breakpoints.

## Testing Guidelines
- Test runner: Vitest + `@solidjs/testing-library` + JSDOM.
- When adding tests, prefer colocated files such as `Component.test.tsx` or `feature.test.ts`.
- Cover happy-path behavior plus key validation and authorization paths for UI features.
- Update tests whenever changing:
  - form validation logic,
  - modal action behavior,
  - PocketBase wrapper signatures (`src/lib/pocketbase/*.ts`).

## Commit & Pull Request Guidelines
- Follow existing commit style from history: short, imperative summaries (for example, `Add login route`, `install dependencies`).
- Keep each commit scoped to one logical change.
- PRs should include:
  - a concise behavior summary,
  - linked issue/task when available,
  - screenshots for UI changes,
  - local validation steps (for example, `npm run dev`, `npm run build`).

## Security & Configuration Tips
- Do not commit secrets; use environment files (for example, `.env`) and local-only values.
- Review dependency updates before merging and keep lockfiles in sync with the chosen package manager.

## Documentation Standards
- Use `docs/` as the primary reference set for architecture and future changes.
- Documentation style: Diataxis-lite (overview, reference architecture, process how-to, LLM playbook).
- When changing auth/rules/schema/routes, update related docs in the same PR.
- Keep docs in English for broad LLM/tool interoperability.

## LLM Context Rules
- Read `docs/README.md` before making substantial changes.
- Treat `docs/architecture.md` as the source of truth for module boundaries and data flow.
- For changes touching PocketBase schema/rules, include a short assumptions/impact note in PR description.

## Agent Skills
- `solidjs`: use for Solid component patterns, routing, reactivity, and TSX best practices.
- `solidjs-solidstart-expert`: use for advanced Solid/SolidStart architecture and production patterns.
- `pocketbase`: use for PocketBase integration, auth flows, schema usage, and API patterns.
- `pocketbase-best-practices`: use for security rules, access control, and SDK/query best practices.

Repository-local skill files:
- `.agents/skills/solidjs/SKILL.md`
- `.agents/skills/solidjs-solidstart-expert/SKILL.md`
- `.agents/skills/pocketbase/SKILL.md`
- `.agents/skills/pocketbase-best-practices/SKILL.md`
