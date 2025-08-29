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

### Commit Message Policy (Codex/CI enforced)
- 커밋 메시지는 제목/본문 모두 한국어(한글)로 작성합니다. Conventional Commit 타입 토큰(예: `feat`, `fix`)은 예외로 허용합니다.
- 무엇을 왜 바꿨는지 요약: 72자 이내의 명확한 제목 + 필요한 경우 본문.
- 영향 영역을 명시: 주요 모듈/폴더를 나열(예: `components/drawing`, `electron/server`, `tests/e2e`).
- Conventional Commits 권장: 정확한 타입(`feat`, `fix`, `refactor` 등)과 선택적 scope 사용.
- 모호한 메시지 금지(예: `chore: commit pending changes`).
- 관련 변경만 묶어서 커밋. 기능과 무관한 리팩터를 섞지 않기.
- 의도적으로 버전 관리하는 빌드 아티팩트가 아니라면 제외. 포함 시 본문에 명시.
- 예시:
  - 제목: `feat(drawing): 실시간 주석과 커서 표시 추가`
  - 본문:
    - `- AnnotationEngine과 레이어드 캔버스 추가`
    - `- 웹소켓 스토어 + API 연동`
    - `- 멀티유저 동기화 E2E 테스트 추가`

## Security & Configuration Tips
- SQLite file `gilteun-system.db` is local; don’t commit it. Use `db:reset` when needed.
- Avoid committing build artifacts or secrets. Review `package.json` scripts before publishing.
- Electron: prefer `contextBridge` and avoid enabling `nodeIntegration` in renderer.
