# 길튼 시스템 (Gilteun System)

교회 예배 관리 + 실시간 협업 드로잉 웹 애플리케이션

## 프로젝트 구조

```
gilteun-system/
├── server/          # Express v5 + Socket.IO + Drizzle ORM (SQLite)
│   ├── index.ts     # 진입점 (Express + HTTP + Socket.IO)
│   ├── config.ts    # 환경 설정 (PORT, DB 경로 등)
│   ├── db/          # Drizzle 스키마, 연결, 마이그레이션, 시드
│   ├── routes/      # REST API (worships, sheets, profiles, roles, commands, worshipTypes)
│   ├── socket/      # Socket.IO 핸들러 (drawing, command, presence)
│   ├── uploads/     # 악보 이미지 저장 (런타임 생성)
│   └── data/        # SQLite DB 파일 (런타임 생성)
├── client/          # React 19 + Vite + TypeScript + Tailwind v4
│   └── src/
│       ├── pages/       # 페이지 컴포넌트 (8개)
│       ├── components/  # SheetCanvas, UI 컴포넌트
│       ├── hooks/       # useSocket, useDrawingSync, queries (TanStack Query)
│       ├── store/       # Zustand 스토어 (appStore)
│       └── lib/         # 유틸리티 (cn, colors)
└── 길튼 시스템/     # UI 목업 (참고용, 수정 금지)
```

## 개발 명령어

```bash
# 의존성 설치
npm run install:all

# 개발 서버 (서버 + 클라이언트 동시)
npm run dev

# 서버만 (port 3001)
npm run dev:server

# 클라이언트만 (port 5173, 서버 프록시)
npm run dev:client

# 프로덕션 빌드
npm run build

# 프로덕션 실행 (port 3001, client/dist 정적 서빙)
npm start

# DB 시드 (초기 데이터)
npm run db:seed

# DB 마이그레이션
npm run db:migrate
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Express v5, Socket.IO v4, Drizzle ORM, better-sqlite3 |
| 프론트엔드 | React 19, Vite 6, TypeScript, Tailwind CSS v4 |
| 상태관리 | TanStack Query (서버 상태) + Zustand (클라이언트 상태) |
| 실시간 | Socket.IO (드로잉 동기화, 명령 브로드캐스트, 접속자 현황) |
| 드래그앤드롭 | @dnd-kit/react v0.3.2 |
| UI | shadcn/ui (Radix 기반), lucide-react, sonner, cmdk, vaul, react-swipeable |

## 코드 컨벤션

- **ESM**: 모든 패키지 `"type": "module"` 사용
- **ID 생성**: nanoid (서버 측)
- **라우팅**: React Router v7 (`react-router/dom`에서 import)
- **이미지**: 서버 파일시스템 저장 (`uploads/sheets/`), DB에 경로만 저장
- **좌표**: 0~1 비율로 정규화 (다른 화면 크기 지원)
- **펜 굵기**: `canvasWidth` 기준 비율로 정규화
- **Tailwind v4**: CSS 기반 설정 (`@import "tailwindcss"`, `@theme inline`)
- **컴포넌트 스타일**: `cn()` 유틸리티 + Tailwind 클래스
- **shadcn/ui**: `@/components/ui/` 경로, `npx shadcn@latest add <component>`로 추가
- **데이터 fetching**: TanStack Query + Axios (`@/hooks/queries.ts`에서 커스텀 훅)
- **TypeScript 체크**: `cd client && ./node_modules/.bin/tsc --noEmit` (npx tsc는 동작하지 않음)

## API 엔드포인트

```
GET/POST           /api/worship-types
PUT/DELETE         /api/worship-types/:id
GET/POST           /api/worships
GET/PUT/DELETE     /api/worships/:id
POST               /api/worships/:id/sheets     (multipart/form-data)
PUT/DELETE         /api/sheets/:id
PUT                /api/worships/:id/sheets/order
GET                /api/sheets/:id/drawings
GET/POST           /api/profiles
PUT/DELETE         /api/profiles/:id
GET/POST           /api/roles
PUT/DELETE         /api/roles/:id
GET/POST           /api/commands
DELETE             /api/commands/:id
POST               /api/commands/reset
```

## Socket.IO 이벤트

```
# 드로잉 동기화 (sheet room 단위)
drawing:start/move/end/delete/clear → drawing:started/moved/ended/deleted/cleared
drawing:state (전체 상태 동기화)

# 명령 브로드캐스트 (worship room 단위)
command:send → command:received

# 접속자 현황
join:worship/leave:worship → presence:update

# 페이지 호출
page:spotlight → page:spotlight

# 예배 실시간 갱신
worship:updated, sheets:updated
```

## 중요 제약사항

- `길튼 시스템/` 디렉토리는 UI 목업 참고용으로 절대 수정 금지
- 획 지우개는 Path 전체 삭제 (분할 없음), 드래그로 여러 획 연속 삭제 가능
- Undo/Redo는 자기 자신의 행위에만 적용
- 모든 사용자가 모든 Path를 삭제할 수 있음 (화이트보드 모델)
- 프로필 미선택 시 모든 기능 페이지에서 홈(`/`)으로 리다이렉트
- **react-swipeable**: ref 기반 DOM listener 부착 → 조건부 spread 무효, callback 내부에서 ref guard 필요
- **핀치줌**: CSS transform을 카드 컨테이너에 적용, canvas 내부 좌표계 변경 없음
- **캔버스 좌표 정규화**: `rect.width/height` 사용 (CSS transform 보정 자동 적용)
