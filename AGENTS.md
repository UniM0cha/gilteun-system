# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` — React/TS app. Key areas: `components/`, `pages/`, `store/`, `api/`, `hooks/`, `components/drawing/`, `types/`.
- Electron: `electron/` (main process, packaging), entry `main.js` built to `dist-electron/`.
- Assets: `public/` (static), `index.html` (Vite entry).
- Builds: `dist/` (renderer) and `dist-electron/` (main) — do not edit.
- Tests: `tests/e2e/` (Playwright).
- Config: `vite.config.ts`, `electron-builder.json5`, `tailwind.config.js`, `.eslintrc.cjs`, `drizzle.config.ts`.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server for renderer.
- `npm run electron:dev`: Launch Electron using current build output (ensure renderer is available).
- `npm run build`: Type-check, build Vite, and package with `electron-builder`.
- `npm run start`: Run packaged Electron app from `dist-electron/main.js`.
- `npm run clean`: Remove `dist/` and `dist-electron/`.
- Database (Drizzle/SQLite): `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`, `npm run db:reset`.
- Tests (Playwright): `npx playwright test` (config in `playwright.config.ts`).

## Coding Style & Naming Conventions
- Language: TypeScript + React. Indent 2 spaces; prefer ES modules.
- Components/Pages: PascalCase files (e.g., `ScoreViewerPage.tsx`). Hooks: `useX.ts`. Stores: `somethingStore.ts`.
- Keep modules small and colocate with feature folders.
- Linting: `npm run lint` (ESLint + typescript-eslint). Type-check: `npm run type-check`.

## Testing Guidelines
- Framework: Playwright for E2E under `tests/e2e/*.spec.ts`.
- Name specs by feature (e.g., `multiuser-collaboration.spec.ts`).
- Run headless locally; attach screenshots on failures when filing PRs.
- Aim to cover critical flows: startup, routing, DB actions, realtime drawing.

## Commit & Pull Request Guidelines
- Use Conventional Commits where practical: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` (seen in history).
- Commits: small, focused; present tense. Example: `feat: add real-time cursors to score viewer`.
- PRs: clear description, linked issues (`Closes #123`), steps to test, and screenshots/GIFs for UI.

## Security & Configuration Tips
- SQLite file `gilteun-system.db` is local; don’t commit it. Use `db:reset` when needed.
- Avoid committing build artifacts or secrets. Review `package.json` scripts before publishing.
- Electron: prefer `contextBridge` and avoid enabling `nodeIntegration` in renderer.
