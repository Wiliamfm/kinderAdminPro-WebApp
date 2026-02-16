# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the application code.
- `src/routes/` uses file-based routing (`index.tsx`, `about.tsx`, `[...404].tsx`).
- `src/components/` stores reusable UI components (for example, `Counter.tsx` and `Counter.css`).
- `src/entry-client.tsx` and `src/entry-server.tsx` are client/server entry points.
- `public/` is for static assets served as-is (for example, `public/favicon.ico`).
- Root config files: `app.config.ts`, `tsconfig.json`, and `package.json`.

## Build, Test, and Development Commands
- `bun install`: install dependencies from `bun.lock`.
- `bun run dev`: start the local SolidStart dev server (`vinxi dev`).
- `bun run build`: create a production build (`vinxi build`).
- `bun run start`: run the production server (`vinxi start`).
- `bun run version`: inspect Vinxi version info.

## Coding Style & Naming Conventions
- Language: TypeScript + TSX with SolidJS (`strict` mode enabled in `tsconfig.json`).
- Indentation: 2 spaces; keep imports grouped and concise.
- Components: PascalCase filenames and exports (`Counter.tsx`, `Home`).
- Routes: route-driven filenames in `src/routes/` (`about.tsx`, `index.tsx`, catch-all `[...404].tsx`).
- Use the configured path alias `~/` for imports from `src` (example: `import Counter from "~/components/Counter"`).
- Keep styles close to components when possible (`Component.tsx` + `Component.css`).

## Testing Guidelines
- No test framework is currently configured in `package.json`.
- For new tests, prefer colocated `*.test.ts` / `*.test.tsx` files near the feature under test.
- If adding a test runner (for example, Vitest), also add a `test` script and document usage here.

## Commit & Pull Request Guidelines
- Follow the existing commit style: short, imperative summaries (for example, `install dependencies`, `eslint fix`).
- Keep commits focused on one logical change.
- PRs should include:
  - clear description of behavior changes,
  - linked issue/task (if available),
  - screenshots or short recordings for UI updates,
  - steps used to validate locally (`bun run dev`, `bun run build`).

## Security & Configuration Tips
- Keep secrets in `.env` / `.env.ssr`; never commit real credentials.
- Confirm `node >= 22` is used, as required by `package.json`.
