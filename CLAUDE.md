# CLAUDE.md

교회 찬양팀을 위한 실시간 협업 예배 지원 플랫폼.
Electron 데스크톱 서버 + iPad PWA 클라이언트 구조로, 로컬 WiFi 환경에서 최대 30명이 동시에 악보를 보고 주석을 공유합니다.

## 핵심 기능

- **실시간 악보 주석** - Figma 스타일 협업, SVG 벡터 기반
- **Apple Pencil 지원** - 압력 감지, 손바닥 거치 방지
- **개인별 레이어** - 각 사용자 주석 on/off 전환
- **실시간 명령** - 팀 커뮤니케이션
- **PWA 오프라인** - WiFi 끊겨도 현재 예배 접근 가능

## 기술 스택

| 영역 | 스택 |
|------|------|
| **서버** | Electron 33 + Express 5 + SQLite (Kysely) |
| **클라이언트** | React 19 + TypeScript + Vite 5 (PWA) |
| **상태 관리** | Zustand + TanStack Query |
| **실시간** | WebSocket (ws) |
| **스타일** | Tailwind CSS 4 + Lucide React |
| **주석** | js-draw (SVG 기반) |

## 디렉토리 구조

```
gilteun-system/
├── src/                              # PWA Frontend (Feature-First)
│   ├── app/                          # 라우팅 + 페이지
│   │   ├── layout/                   # 공통 레이아웃
│   │   ├── profile/                  # 프로필 선택
│   │   ├── worship/                  # 예배 목록/생성
│   │   ├── song/                     # 찬양 목록/업로드
│   │   └── score/                    # 악보 뷰어 (핵심)
│   ├── features/                     # 기능별 모듈
│   │   ├── profile/                  # 프로필 기능
│   │   ├── worship/                  # 예배 기능
│   │   ├── song/                     # 찬양 기능
│   │   ├── annotation/               # 주석 기능 (핵심)
│   │   └── realtime/                 # WebSocket
│   ├── components/                   # 공통 컴포넌트
│   │   ├── ui/                       # 기본 UI (Button, Card 등)
│   │   └── shared/                   # 공통 기능 (ErrorBoundary 등)
│   ├── hooks/                        # 전역 훅
│   ├── store/                        # Zustand 스토어
│   ├── lib/                          # 유틸리티
│   ├── types/                        # 타입 정의
│   └── constants/                    # 상수
├── electron/                         # Backend (Layered Architecture)
│   ├── main.ts                       # Electron 메인
│   ├── preload.ts                    # IPC 브릿지
│   └── server/
│       ├── app.ts                    # Express 앱
│       ├── routes/                   # HTTP 라우터 (얇게)
│       ├── services/                 # 비즈니스 로직
│       ├── repositories/             # 데이터 접근 (Kysely)
│       ├── database/                 # DB 설정 + 스키마
│       ├── websocket/                # WebSocket 서버
│       └── middleware/               # 미들웨어
└── public/                           # 정적 파일
```

## 도메인 모델

| 엔티티 | 설명 |
|--------|------|
| **Profile** | 사용자 프로필 (name, role, icon, color) |
| **Worship** | 예배 정보 (title, date, time, memo) |
| **Song** | 찬양 (title, key, memo, imagePath, orderIndex) |
| **Annotation** | 주석 (songId, profileId, svgPath, color, tool) |
| **Command** | 실시간 명령 (worshipId, profileId, message) |

## 개발 명령어

```bash
npm run dev          # Vite + Electron 개발 서버
npm run build        # 프로덕션 빌드
npm run dist         # 배포용 패키징
npm run lint         # ESLint (0개 오류/경고 필수)
npm run type-check   # TypeScript 검사
```

| 포트 | 용도 |
|------|------|
| 5173 | Vite 개발 서버 (PWA) |
| 3001 | Express API + WebSocket |

---

## 개발 워크플로우

### 검증 프로세스

```
코드 작성
    ↓
npm run lint        (0개 오류/경고)
    ↓
npm run type-check  (0개 오류)
    ↓
chrome-devtools MCP로 기능 검증
    ↓
code-reviewer 리뷰  ← 필수
    ↓
커밋
```

### code-reviewer 호출 (필수!)

**기능 구현 완료 후 반드시 code-reviewer 서브에이전트로 코드 리뷰를 실행해야 합니다.**

코드 파일 수정 후 커밋 전 **필수** 실행:

```
Plan 파일: ~/.claude/plans/[현재 plan].md
변경 범위: [수정한 기능/파일]

위 plan에 따른 변경사항을 리뷰해주세요.
```

### 기능 검증 (chrome-devtools MCP)

```
npm run dev → 브라우저 접속
    ↓
take_snapshot → UI 상태 확인
    ↓
click, fill → 기능 테스트
    ↓
list_network_requests → API 확인
```

---

## 코드 스타일

### 제로 톨러런스 (Critical)

| 금지 | 필수 |
|------|------|
| `React.FC` | 함수 선언문 |
| `any` 타입 | 명시적 타입 |
| 미사용 import | 즉시 제거 |
| 영문 주석 | 한글 주석 |
| 직접 api 호출 | TanStack Query |
| ESLint 경고 | 모두 수정 |

### 컴포넌트 패턴

```typescript
// ❌ 금지
const MyComponent: React.FC<Props> = ({ prop }) => { ... }

// ✅ 필수
export function MyComponent({ prop }: Props) { ... }
```

### API 호출 패턴

```typescript
// ❌ 금지
const data = await api.get('/worships');

// ✅ 필수
const { data } = useWorships();
```

### 백엔드 레이어 패턴

```
Repository (Kysely 쿼리)
    ↓
Service (비즈니스 로직)
    ↓
Route (HTTP 핸들러, 얇게 유지)
```

---

## 커밋 가이드

### 형식

```
<type>: <한글 메시지>

- 변경 사항
```

### 타입

| Type | 용도 |
|------|------|
| feature: | 새 기능 |
| fix: | 버그 수정 |
| refactor: | 리팩토링 |
| docs: | 문서 |
| chore: | 설정, 의존성 |
| test: | 테스트 |

### 커밋 가능 기준

| 조건 | 허용 |
|------|------|
| ESLint 오류/경고 | ❌ 0개만 |
| TypeScript 오류 | ❌ 0개만 |
| code-reviewer Critical | ❌ 0개만 |

---

## Git 안전 프로토콜

**명시적 승인 없이 금지**:
- `rm` (파일 삭제)
- `git restore` (변경 취소)
- `git reset --hard`
- `git push --force`

---

## 의사소통 정책

| 컨텍스트 | 언어 |
|---------|------|
| AI 응답 | 한글 (모든 상황) |
| 사용자 응답 | 한글 |
| 커밋 메시지 | 한글 |
| 코드 주석 | 한글 |
| 문서 | 한글 |
