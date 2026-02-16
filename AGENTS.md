# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the SolidJS app code.
- `src/pages/` holds route-level pages and route data loaders (for example, `about.tsx` and `about.data.ts`).
- `src/errors/404.tsx` defines the not-found UI.
- `src/routes.ts` and `src/app.tsx` configure routing and app composition.
- `src/index.tsx` and `src/index.css` are the entry point and global styles.
- `public/` is not currently present; add static assets there if needed.

## Build, Test, and Development Commands
- `npm install` (or `pnpm install`): install dependencies.
- `npm run dev` (or `npm start`): run the Vite dev server locally.
- `npm run build`: create a production bundle in `dist/`.
- `npm run serve`: preview the production build locally.

Use Node 22+ for compatibility with current toolchain versions.

## Coding Style & Naming Conventions
- Language: TypeScript + TSX with SolidJS.
- Indentation: 2 spaces; keep imports grouped and minimal.
- Components and page files: use clear, PascalCase exports where applicable.
- Route/data pattern: pair page modules with `.data.ts` files when route-scoped data fetching is needed.
- Keep CSS near the feature when practical, and use `src/index.css` for shared global styles.

## Testing Guidelines
- No test runner is configured yet in `package.json`.
- When adding tests, prefer colocated files such as `Component.test.tsx` or `feature.test.ts`.
- If introducing a framework (for example, Vitest), add a `test` script and document command usage in `README.md`.

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
