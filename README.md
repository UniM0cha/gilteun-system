# **✅ 프로젝트 명: 길튼 시스템**

---

## **💡 프로젝트 개요**

‘길튼 시스템’은 **교회 찬양팀 예배 진행을 지원하기 위한 PWA 기반의 웹 애플리케이션**입니다.

모든 찬양팀원(세션)은 **각자의 아이패드**를 소지하고 예배에 참여하며, 해당 앱은 **iPad 친화적인 터치 중심 UI**로 설계되어야 합니다.

### **핵심 목적**

- 실시간 **악보 공유 및 마크업**
- **인도자 명령 전달** 기능
- **세션 구성원 간 시각적 동기화**
- 클라이언트는 **설치 없이 웹 브라우저로 접근**, 서버는 macOS에서 **Electron 기반 앱**으로 실행

---

## **🧩 기능 상세 정의**

### **1. 악보 공유 및 마크업**

- 예배별로 **악보 이미지를 업로드 및 열람**할 수 있음
    - PDF는 **제외**, JPG, PNG 등 **이미지 파일만 허용**
- 악보는 **모든 사용자가 열람 가능**
- 악보 위에 **자유롭게 드로잉 가능**
    - 예: **송폼 표시**, **코드 마킹**, **강조 라인** 등
    - 실시간 동기화 필수
- 보기 모드 / 그리기 모드 전환 가능
- 각 세션 사용자(찬양팀원)는 **현재 보고 있는 악보 페이지**를 서버에 전송하고 공유

---

### **2. 예배 관리 시스템**

- **예배 유형별 관리**: 관리자가 예배 유형을 추가/수정 가능
    - 기본 예배 유형: 주일 1부예배, 2부예배, 3부예배, 청년예배, 수요예배 등
    - 새로운 예배 유형은 언제든 추가 가능
- **날짜별 예배 생성**: 특정 날짜에 예배를 생성하고 해당 예배에 악보 업로드
- **예배별 악보 관리**: 각 예배마다 독립적인 악보 세트 관리
- **예배 선택 기능**: 사용자는 앱 접속 시 참여할 예배를 선택

### **3. 사용자 역할 및 프로필 시스템**

역할에 따라 UI 기능이 다음과 같이 달라짐:

| **역할**       | **권한 및 기능**                 |
|--------------|-----------------------------|
| 세션 사용자       | 악보 열람, 마크업 가능, 명령 수신 가능     |
| 인도자          | 악보 열람, 마크업 가능, 명령 전송 가능     |
| 목사님 (전체 관리자) | 인도자 권한 포함 + **전체 명령 전송** 가능 |

- **앱 최초 실행 시 프로필 선택 또는 생성**
    - 설정 항목: 역할, 닉네임, 악기 선택, 아이콘, 자주 사용하는 명령 아이콘
    - **악기 선택**: 드럼, 베이스, 기타, 키보드, 보컬 등 (관리자가 악기 종류 추가/수정 가능)
    - 각 악기는 고유 아이콘으로 표시되어 명령 오버레이에서 식별 용이

---

### **4. 명령 시스템 및 오버레이**

- 인도자(또는 목사님)가 전송한 명령은 모든 사용자에게 **악보를 가리지 않는 오버레이 UI**로 표시
- 예: 절 이동, 반복, 다음 곡 등 다양한 지시 명령
- 명령 종류는 **기본 제공 + 사용자 커스터마이징 가능**
- 사용자마다 자신만의 명령 이모티콘 또는 텍스트를 등록하고 사용할 수 있음
- 명령 정보는 서버를 통해 실시간 동기화됨

#### **오버레이 표시 상세**

- **발신자 정보 표시**: "이름(악기아이콘)" 형태로 간단하게 표시
    - 예: "철수(🥁)", "민지(🎸)", "준호(🎹)"
- **자동 사라짐**: 각 명령은 3초 후 자동으로 사라짐
- **스택 형태**: 여러 명령이 동시에 올 경우 스택 형태로 표시 (최신 명령이 상단)
- **최신 우선**: 시간 순서대로 표시되며, 발신자와 시간 정보 포함

---

### **5. 통신 구조 및 동기화**

- 모든 기기는 동일한 **Wi-Fi 네트워크 상에서 통신**
- 데이터는 로컬 서버를 통해 동기화됨
    - 서버는 **macOS에서 Electron 앱**으로 실행
    - Electron 앱은 웹 서버 + 관리용 UI를 포함
- 클라이언트 웹 앱과 서버 간 데이터 흐름 예시:
    - 세션 사용자가 악보 페이지 이동 → 서버에 현재 페이지 상태 전송
    - 인도자가 명령 전송 → 서버가 전체 사용자에게 브로드캐스트
    - 드로잉 내용 → 서버에서 실시간 중계

---

## **🛠️ 개발 환경 설정**

### **필수 도구**
- **Node.js**: v18+ 권장
- **pnpm**: 패키지 매니저 (npm, yarn 대신 pnpm 사용)
- **TypeScript**: 전체 프로젝트에 TypeScript 적용

### **모노레포 구조**
```
gilton-system/
├── packages/
│   ├── client/          # PWA 클라이언트 앱
│   ├── server/          # Electron 서버 앱  
│   └── shared/          # 공통 타입, 유틸리티
├── pnpm-workspace.yaml  # pnpm 워크스페이스 설정
└── package.json         # 루트 패키지 설정
```

### **패키지 설치 규칙**
⚠️ **중요**: 반드시 CLI 명령어를 통해 패키지를 설치해야 합니다.

```bash
# 루트 의존성 설치
pnpm install

# 특정 패키지에 의존성 추가
pnpm add react --filter client
pnpm add express --filter server
pnpm add zod --filter shared

# 개발 의존성 추가
pnpm add -D typescript --filter client
```

❌ **금지**: package.json 파일을 직접 수정하여 의존성 추가
✅ **권장**: pnpm add 명령어로만 패키지 설치

## **🔧 기술 스택 및 구현 방식**

### **클라이언트(PWA 웹 앱)**

- **React** 기반 SPA (TypeScript)
- **React Router v7** 사용
- UI 프레임워크: **shadcn/ui**
- 데이터 페칭: **react-query**
- 전역 상태 관리: **Zustand**
- 배포 방식: **PWA**로 설치 없이 브라우저에서 사용
- 타겟 디바이스: **iPad 중심 UI 구성**, 멀티터치, 큰 터치 대상, 전체 화면 최적화

#### **shadcn/ui 설정**
```bash
# shadcn/ui 초기화 (packages/client 디렉토리에서)
pnpm dlx shadcn-ui@latest init

# 컴포넌트 설치 예시
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add dialog
```

⚠️ **중요**: shadcn/ui의 **기본 테마를 그대로 사용**해야 합니다.
- 색상 팔레트 변경 금지
- CSS 변수 수정 금지  
- 기본 다크모드 지원 활용

### **서버(Electron + Node)**

- macOS에서 실행 가능한 **Electron 기반 데스크탑 앱** (TypeScript)
- 내부에 **웹 서버 포함 (Express + Socket.io)**
- 상태 조회 및 제어용 UI 포함 (React + shadcn/ui)
- React Router v7로 서버 내 UI 라우팅 구성
- 서버는 전체 클라이언트의 상태를 실시간으로 추적 및 동기화 수행

#### **Electron 앱 구조**
```bash
packages/server/
├── src/
│   ├── main/           # Electron 메인 프로세스
│   ├── renderer/       # React UI (관리자 화면)
│   └── api/            # Express 서버 + Socket.io
├── public/             # Electron 정적 파일
└── build/              # 빌드 결과물
```

## **🔍 코드 품질 관리**

### **린팅 설정 (ESLint + Prettier)**

#### **루트 패키지 설정**
```bash
# ESLint 및 Prettier 설치
pnpm add -D eslint prettier
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
pnpm add -D eslint-config-prettier eslint-plugin-prettier
```

#### **ESLint 설정 (.eslintrc.json)**
```json
{
  "root": true,
  "env": { "browser": true, "es2020": true, "node": true },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "ignorePatterns": ["dist", ".eslintrc.cjs"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["react-refresh"],
  "rules": {
    "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }],
    "@typescript-eslint/no-unused-vars": "error",
    "react/react-in-jsx-scope": "off"
  }
}
```

#### **Prettier 설정 (.prettierrc)**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### **TypeScript 설정**

#### **Strict 모드 필수**
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## **⚡ 구체적인 기술 구현 방법**

### **실시간 통신 (WebSocket)**
```typescript
// Socket.io 이벤트 정의
interface SocketEvents {
  // 클라이언트 → 서버
  'user:join': (data: { userId: string, worshipId: string }) => void
  'score:page-change': (data: { page: number, userId: string }) => void
  'score:drawing': (data: DrawingData) => void
  'command:send': (data: CommandData) => void
  
  // 서버 → 클라이언트  
  'command:received': (data: CommandWithSender) => void
  'score:sync': (data: ScoreState) => void
  'users:update': (data: UserState[]) => void
}
```

### **악보 드로잉 시스템**
- **Canvas API** 활용하여 악보 위 실시간 드로잉
- **Fabric.js** 또는 **Konva.js** 라이브러리 사용 고려
- 드로잉 데이터는 SVG 형태로 저장 및 동기화

### **PWA 설정**
```json
// public/manifest.json
{
  "name": "길튼 시스템",
  "short_name": "길튼",
  "display": "fullscreen",
  "orientation": "landscape",
  "start_url": "/",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

### **iPad 최적화**
- **터치 이벤트** 처리 (touchstart, touchmove, touchend)
- **Viewport meta tag**: `width=device-width, initial-scale=1, user-scalable=no`
- **CSS**: `touch-action: manipulation` 적용
- **큰 터치 대상**: 최소 44px × 44px

---

## **🏗️ 상세 프로젝트 구조**

### **전체 디렉토리 구조**
```
gilton-system/
├── packages/
│   ├── shared/                    # 공통 타입 및 유틸리티
│   │   ├── src/
│   │   │   ├── types/             # TypeScript 타입 정의
│   │   │   │   ├── user.ts        # 사용자 관련 타입
│   │   │   │   ├── worship.ts     # 예배 관련 타입
│   │   │   │   ├── score.ts       # 악보 관련 타입
│   │   │   │   └── command.ts     # 명령 관련 타입
│   │   │   ├── utils/             # 공통 유틸리티
│   │   │   └── constants/         # 상수 정의
│   │   └── package.json
│   │
│   ├── client/                    # PWA 클라이언트
│   │   ├── src/
│   │   │   ├── components/        # shadcn/ui 기반 컴포넌트
│   │   │   │   ├── ui/            # shadcn/ui 컴포넌트
│   │   │   │   ├── score/         # 악보 관련 컴포넌트
│   │   │   │   ├── command/       # 명령 관련 컴포넌트
│   │   │   │   └── profile/       # 프로필 관련 컴포넌트
│   │   │   ├── pages/             # 페이지 컴포넌트
│   │   │   │   ├── Home.tsx       # 홈/프로필 선택
│   │   │   │   ├── Worship.tsx    # 예배 화면
│   │   │   │   └── Profile.tsx    # 프로필 생성/수정
│   │   │   ├── hooks/             # React 커스텀 훅
│   │   │   ├── stores/            # Zustand 스토어
│   │   │   ├── services/          # API 서비스
│   │   │   └── lib/               # 라이브러리 설정
│   │   ├── public/
│   │   │   ├── manifest.json      # PWA 매니페스트
│   │   │   └── sw.js              # Service Worker
│   │   └── package.json
│   │
│   └── server/                    # Electron 서버
│       ├── src/
│       │   ├── main/              # Electron 메인 프로세스
│       │   │   ├── main.ts        # Electron 진입점
│       │   │   └── menu.ts        # 애플리케이션 메뉴
│       │   ├── api/               # Express 서버
│       │   │   ├── server.ts      # Express + Socket.io 서버
│       │   │   ├── routes/        # API 라우트
│       │   │   └── middleware/    # 미들웨어
│       │   ├── renderer/          # 관리자 UI (React)
│       │   │   ├── components/    # 관리자 UI 컴포넌트
│       │   │   ├── pages/         # 관리자 페이지
│       │   │   └── App.tsx        # 관리자 앱 루트
│       │   └── database/          # 로컬 데이터베이스
│       │       ├── schema.ts      # 데이터베이스 스키마
│       │       └── queries.ts     # 쿼리 함수
│       └── package.json
├── pnpm-workspace.yaml            # pnpm 워크스페이스 설정
├── tsconfig.json                  # 루트 TypeScript 설정
└── package.json                   # 루트 패키지 설정
```

### **패키지별 주요 의존성**

#### **shared 패키지**
```bash
pnpm add zod --filter shared              # 스키마 검증
pnpm add -D typescript --filter shared    # TypeScript
```

#### **client 패키지**  
```bash
pnpm add react react-dom --filter client
pnpm add @tanstack/react-router --filter client    # React Router v7
pnpm add @tanstack/react-query --filter client     # 데이터 페칭
pnpm add zustand --filter client                   # 상태 관리
pnpm add socket.io-client --filter client          # WebSocket 클라이언트
pnpm add fabric --filter client                    # Canvas 드로잉
```

#### **server 패키지**
```bash
pnpm add electron --filter server
pnpm add express socket.io --filter server
pnpm add sqlite3 better-sqlite3 --filter server    # 로컬 데이터베이스
pnpm add multer --filter server                    # 파일 업로드
```

## **📋 페이지 구성 및 예상 컴포넌트 (클라이언트 기준)**

### **1. 홈 / 프로필 선택 화면**

#### **컴포넌트 구조**
```typescript
// src/pages/Home.tsx
- ProfileSelector          # 기존 프로필 목록
- ProfileCreator           # 새 프로필 생성 폼
- WorshipSelector          # 예배 선택 드롭다운
```

### **2. 예배 화면**

#### **컴포넌트 구조** 
```typescript
// src/pages/Worship.tsx
- ScoreNavigation          # 좌측 페이지 네비게이션
- ScoreViewer             # 중앙 악보 이미지 + Canvas 오버레이
- DrawingToolbar          # 드로잉 도구 모음
- CommandOverlay          # 명령 오버레이 (스택 형태)
- CommandPanel            # 명령 전송 패널 (인도자만)
```

### **3. 관리자 화면 (서버 앱)**

#### **컴포넌트 구조**
```typescript
// server/src/renderer/App.tsx
- WorshipManager          # 예배 관리
- InstrumentManager       # 악기 관리  
- ScoreUploader          # 악보 업로드
- UserMonitor            # 실시간 사용자 모니터링
```

---

## **📡 데이터 동기화 항목 요약**

| **항목**    | **송신 주체** | **수신 대상**   | **실시간** |
|-----------|-----------|-------------|---------|
| 악보 페이지 상태 | 세션 사용자    | 서버 → 전체 사용자 | O       |
| 드로잉 정보    | 세션 사용자    | 서버 → 전체 사용자 | O       |
| 명령 전송     | 인도자       | 서버 → 전체 사용자 | O       |
| 사용자 접속 상태 | 모든 사용자    | 서버          | O       |
| 예배 선택 상태  | 세션 사용자    | 서버          | O       |

## **🗄️ 주요 데이터 구조**

### **예배 데이터**

- 예배 ID, 유형(주일 1부/2부/3부 등), 날짜
- 악보 이미지 목록 (파일 경로, 순서)
- 생성일, 수정일

### **프로필 데이터**

- 사용자 ID, 이름, 역할(세션/인도자/관리자)
- 악기 정보 (ID, 이름, 아이콘)
- 자주 사용하는 명령 목록
- 프로필 아이콘

### **명령 데이터**

- 명령 ID, 내용, 발신자 정보 (이름, 악기)
- 타임스탬프, 대상 사용자 (전체/특정 그룹)
- 표시 시간 (3초 기본값)

### **관리자 설정 데이터**

- 예배 유형 목록 (추가/수정 가능)
- 악기 종류 목록 (이름, 아이콘, 추가/수정 가능)
- 시스템 설정 (서버 포트, 네트워크 설정 등)

## **🗺️ 개발 순서 로드맵**

### **Phase 1: 환경 설정 및 기본 구조**
1. **프로젝트 초기화**
   ```bash
   # 루트 디렉토리에서
   pnpm init
   # pnpm-workspace.yaml 생성
   # packages 디렉토리 생성
   ```

2. **🔍 코드 품질 도구 설정 (최우선)**
   ```bash
   # 루트 패키지에 린팅/포매팅 도구 설치
   pnpm add -D eslint prettier
   pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
   pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
   pnpm add -D eslint-config-prettier eslint-plugin-prettier
   
   # 설정 파일 생성
   # .eslintrc.json, .prettierrc, tsconfig.json 작성
   ```

3. **shared 패키지 설정**
   ```bash
   cd packages/shared
   pnpm init
   pnpm add -D typescript
   # TypeScript 타입 정의 작성
   # tsconfig.json strict 모드 설정
   ```

4. **client 패키지 기본 설정**
   ```bash
   cd packages/client  
   pnpm create vite . --template react-ts
   pnpm dlx shadcn-ui@latest init
   # 기본 컴포넌트 설치
   # ESLint, Prettier 설정 상속
   ```

5. **server 패키지 기본 설정**
   ```bash
   cd packages/server
   pnpm init
   pnpm add electron express socket.io
   # Electron 기본 구조 설정
   # ESLint, Prettier 설정 상속
   ```

6. **🚨 검증 스크립트 설정**
   ```bash
   # 각 패키지의 package.json에 스크립트 추가
   # "lint", "typecheck", "validate" 스크립트
   # 루트에서 전체 검증 가능하도록 설정
   ```

### **Phase 2: 핵심 기능 개발**
1. **사용자 프로필 시스템** (client)
   - 프로필 생성/선택 UI
   - 악기 선택 기능
   - 로컬 스토리지 저장
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

2. **예배 관리 시스템** (server)
   - 예배 생성/수정 API
   - 악보 업로드 기능
   - SQLite 데이터베이스 스키마
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

3. **실시간 통신 구현** (client + server)
   - Socket.io 기본 연결
   - 사용자 입장/퇴장 이벤트
   - 기본 상태 동기화
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

### **Phase 3: 악보 및 드로잉 시스템**
1. **악보 뷰어 구현** (client)
   - 이미지 표시 및 페이지 네비게이션
   - Canvas 오버레이 준비
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

2. **드로잉 기능** (client)
   - Fabric.js 또는 Canvas API 활용
   - 실시간 드로잉 동기화
   - 드로잉 데이터 저장/로드
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

### **Phase 4: 명령 시스템**
1. **명령 전송/수신** (client + server)
   - 명령 생성 UI (인도자용)
   - 오버레이 표시 시스템
   - 3초 자동 사라짐 구현
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

2. **고급 기능**
   - 명령 커스터마이징
   - 사용자별 권한 관리
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

### **Phase 5: 최적화 및 완성**
1. **PWA 설정**
   - Service Worker 구현
   - 매니페스트 설정
   - iPad 최적화
   - ✅ **각 기능 완성 후 `pnpm validate` 실행**

2. **Electron 앱 완성**
   - 관리자 UI 완성
   - 앱 패키징 및 배포 준비
   - ✅ **최종 배포 전 전체 `pnpm validate` 필수**

### **🚨 Phase별 완료 조건**
각 Phase 완료 시 반드시 다음을 확인:
1. ✅ `pnpm lint` - 모든 린팅 오류 해결
2. ✅ `pnpm typecheck` - 모든 타입 오류 해결  
3. ✅ `pnpm validate` - 통합 검증 통과
4. ✅ 기능 테스트 완료

---

## **⚠️ 중요 개발 규칙 및 제약사항**

### **🚫 절대 금지사항**
- ❌ **package.json 직접 수정**: 반드시 `pnpm add` 명령어만 사용
- ❌ **shadcn/ui 테마 변경**: 색상, CSS 변수 수정 금지
- ❌ **TypeScript 없이 개발**: 모든 코드는 TypeScript로 작성
- ❌ **npm/yarn 사용**: 반드시 pnpm만 사용

### **✅ 필수 준수사항**
- ✅ **CLI 명령어 사용**: 모든 패키지 설치는 명령어로
- ✅ **shadcn/ui 기본 테마**: 디자인 일관성 유지
- ✅ **모노레포 구조**: packages/* 구조 유지
- ✅ **TypeScript**: 타입 안전성 확보
- ✅ **iPad 친화적 UI**: 터치 대상 44px 이상
- ✅ **코드 검증**: 모든 코드 작성 후 린팅과 타입 체크 필수 실행

### **🔧 개발 명령어 참고**

#### **기본 개발 명령어**
```bash
# 전체 의존성 설치
pnpm install

# 개발 서버 실행
pnpm -C packages/client dev
pnpm -C packages/server dev

# 빌드
pnpm -C packages/client build
pnpm -C packages/server build
```

#### **🚨 필수 검증 명령어 (코드 작성 후 반드시 실행)**
```bash
# 1. 린팅 검사
pnpm lint                                    # 전체 프로젝트 린팅
pnpm -C packages/client lint                 # 클라이언트만 린팅
pnpm -C packages/server lint                 # 서버만 린팅

# 2. 타입스크립트 컴파일 검사  
pnpm typecheck                               # 전체 프로젝트 타입 체크
pnpm -C packages/client typecheck            # 클라이언트만 타입 체크
pnpm -C packages/server typecheck            # 서버만 타입 체크

# 3. 통합 검증 (린팅 + 타입 체크)
pnpm validate                                # 전체 검증
pnpm -C packages/client validate             # 클라이언트만 검증
pnpm -C packages/server validate             # 서버만 검증

# 4. 자동 수정 (가능한 경우)
pnpm lint:fix                                # 린팅 오류 자동 수정
pnpm format                                  # Prettier 포매팅 적용
```

#### **package.json 스크립트 예시**
```json
{
  "scripts": {
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "validate": "pnpm lint && pnpm typecheck"
  }
}
```

---

## **⚙️ 개발 및 테스트 시 유의사항**

- 클라이언트는 **설치 없이 브라우저 접속만으로 사용** 가능해야 함
- 서버는 반드시 macOS에서 Electron 앱 형태로 구동
- 전체 앱은 **오프라인 캐싱(PWA 기능)** 을 고려할 필요는 없음 (Wi-Fi 상시 연결 가정)
- **다중 사용자 동시 접속 환경**에서도 성능 저하 없이 동작해야 함
