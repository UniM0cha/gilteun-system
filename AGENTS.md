# 저장소 가이드라인 (AGENTS)

## 프로젝트 구조 & 모듈 구성
- 소스: `src/` — React/TypeScript 앱. 핵심 영역: `components/`, `pages/`, `store/`, `api/`, `hooks/`, `components/drawing/`, `types/`.
- 일렉트론: `electron/`(메인 프로세스, 패키징). 엔트리 `main.js`는 `dist-electron/`에 빌드됨.
- 에셋: `public/`(정적 파일), Vite 엔트리 `index.html`.
- 빌드 산출물: `dist/`(렌더러) · `dist-electron/`(메인) — 직접 수정 금지.
- 테스트: `tests/e2e/`(Playwright).
- 설정: `vite.config.ts`, `electron-builder.json5`, `tailwind.config.js`, `.eslintrc.cjs`, `drizzle.config.ts`.

## 빌드/테스트/개발 커맨드
- `npm run dev`: Vite 렌더러 개발 서버 실행.
- `npm run electron:dev`: 현재 빌드 출력 기반으로 Electron 실행(렌더러 준비 필요).
- `npm run build`: 타입 체크 → Vite 빌드 → `electron-builder` 패키징.
- `npm run start`: 패키징된 Electron 앱 실행(`dist-electron/main.js`).
- `npm run clean`: `dist/`, `dist-electron/` 정리.
- 데이터베이스(Drizzle/SQLite): `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`, `npm run db:reset`.
- 테스트(Playwright): `npx playwright test` (설정: `playwright.config.ts`).

## 코딩 스타일 & 네이밍 규칙
- 언어: TypeScript + React. 들여쓰기 2칸, ES modules 선호.
- 컴포넌트/페이지: PascalCase 파일명(예: `ScoreViewerPage.tsx`).
- 훅: `useX.ts`. 스토어: `somethingStore.ts`.
- 모듈은 작게 유지하고 기능 폴더에 공존(colocate).
- 린트: `npm run lint`(ESLint + typescript-eslint). 타입 체크: `npm run type-check`.

## 테스트 가이드라인
- 프레임워크: Playwright(`tests/e2e/*.spec.ts`).
- 스펙 파일명은 기능 기준(예: `multiuser-collaboration.spec.ts`).
- 로컬에서는 headless 실행 권장. PR 시 실패 스크린샷 첨부.
- 우선 커버 흐름: 시작, 라우팅, DB 동작, 실시간 드로잉.

## 커밋 & PR 가이드라인
- Conventional Commits 권장: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:` 등.
- 커밋은 작고 집중적으로, 현재형 사용. 예: `feat: 악보 뷰어에 실시간 커서 추가`.
- PR: 명확한 설명, 관련 이슈 링크(`Closes #123`), 테스트 절차, UI 변경 시 스크린샷/애니메이션 첨부.

### 커밋 메시지 정책 (Codex/CI 적용)
- 커밋 메시지는 제목/본문 모두 한국어(한글)로 작성합니다. Conventional Commit 타입 토큰(예: `feat`, `fix`)은 예외로 허용합니다.
- 무엇을 왜 바꿨는지 요약: 72자 이내의 명확한 제목 + 필요한 경우 본문.
- 영향 영역 명시: 주요 모듈/폴더(예: `components/drawing`, `electron/server`, `tests/e2e`).
- 모호한 메시지 금지(예: `chore: commit pending changes`). 구체적으로 작성합니다.
- 관련 변경만 묶어서 커밋하고, 기능 변경과 무관한 리팩터는 분리합니다.
- 의도적으로 버전 관리하는 빌드 산출물이 아니면 제외합니다. 포함 시 본문에 이유를 명시합니다.
- 예시:
  - 제목: `feat(drawing): 실시간 주석과 커서 표시 추가`
  - 본문:
    - `- AnnotationEngine과 레이어드 캔버스 추가`
    - `- 웹소켓 스토어 + API 연동`
    - `- 멀티유저 동기화 E2E 테스트 추가`

## 보안 & 설정 팁
- SQLite 파일 `gilteun-system.db`는 로컬 전용이며 커밋하지 않습니다. 필요 시 `db:reset` 사용.
- 빌드 산출물/시크릿 커밋 금지. 배포 전 `package.json` 스크립트 점검.
- Electron 보안: 가능하면 `contextBridge` 사용, 렌더러에서 `nodeIntegration` 활성화는 지양.

