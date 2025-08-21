# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**길튼 시스템**은 교회 찬양팀 예배 진행을 지원하는 PWA 기반 웹 애플리케이션입니다.

- **클라이언트**: iPad 친화적인 PWA 웹 앱 (설치 없이 브라우저 접속)
- **서버**: macOS Electron 데스크탑 앱 (Express + Socket.io 내장)
- **핵심 기능**: 실시간 악보 공유, 드로잉 동기화, 명령 전달 시스템

## 필수 개발 명령어

### 프로젝트 실행
```bash
# 전체 의존성 설치
npm install

# 개발 서버 실행 (TypeScript 컴파일 + Vite + Electron 동시 실행)
npm run dev

# 접속 URL (개발 모드)
# - 클라이언트: http://localhost:5174
# - 관리자 페이지: http://localhost:5174/admin
# - API 서버: http://localhost:3001 (Electron 내장)
```

### 현재 상태
- ✅ npm 기반 단일 프로젝트로 통합 완료
- ✅ TypeScript 컴파일 정상 동작
- ✅ Vite 빌드 정상 동작 
- ✅ Electron 개발 환경 구성 완료
- ✅ electron-builder 배포 빌드 완료 (macOS Universal, Windows 지원)
- ✅ ESLint v9 + Prettier 코드 품질 시스템 완료
- 🔧 관리자 기능은 브라우저에서 `/admin` 경로로 접속 가능

### 개발 모드 실행 원리
- `npm run dev`: 3가지 프로세스를 동시 실행
  1. `tsc --watch`: TypeScript 컴파일 (서버/공유 코드 → `dist/src/` 생성)
  2. `vite`: React 클라이언트 개발 서버 (HMR 지원)
  3. `nodemon + electron`: 서버 코드 변경 시 Electron 자동 재시작

### 빌드 및 배포
```bash
# 전체 빌드 (TypeScript 컴파일 + Vite 빌드 + Electron 배포 패키지)
npm run build

# 개별 빌드 단계
npm run typecheck     # 타입 체크만
vite build            # Vite 빌드만
tsc                   # TypeScript 컴파일만

# Electron 배포 빌드 (플랫폼별)
npm run build:dir     # 테스트용 언패키지 디렉토리 빌드
npm run build:mac     # macOS Universal DMG 패키지 (Intel + Apple Silicon)
npm run build:win     # Windows NSIS 인스톨러

# 빌드 결과 위치
# - release/ : 배포 패키지 (.dmg, .exe)
# - release/mac-universal/ : macOS 언패키지 Universal 앱
```

### 코드 품질 검증 (⚠️ 필수)
```bash
# 개별 검증
npm run lint          # ESLint 검사
npm run lint:fix      # ESLint 자동 수정
npm run typecheck     # TypeScript 타입 검사
npm run format        # Prettier 코드 포맷팅
npm run format:check  # Prettier 포맷 확인

# 전체 검증 (필수 실행)
npm run validate      # typecheck + lint + format:check 한번에 실행

# 테스트 (개발 중)
npm run test          # Vitest 단위 테스트
npm run test:e2e      # Playwright E2E 테스트
```

## 아키텍처 개요

### 모노리스 구조 (2024년 통합 후)
```
gilteun-system/
├── src/
│   ├── shared/     # 공통 타입, 유틸리티
│   ├── client/     # React PWA 클라이언트
│   └── server/     # Electron 서버 앱
├── dist/           # 컴파일된 JavaScript 출력
├── public/         # 정적 파일 (PWA 매니페스트, 아이콘 등)
└── package.json    # 단일 패키지 설정
```

### 기술 스택

#### Client (src/client/)
- **React 19** + **TypeScript** + **Vite**
- **React Router v7** (페이지 라우팅)
- **Tailwind CSS v4** + **shadcn/ui** (UI 컴포넌트)
- **Zustand** (상태 관리)
- **Socket.io-client** (실시간 통신)

#### Server (src/server/)
- **Electron** (macOS 데스크탑 앱)
- **Express** + **Socket.io** (API 서버)
- **Better-SQLite3** (로컬 데이터베이스)
- **Multer** (파일 업로드)

#### Shared (src/shared/)
- **TypeScript** 공통 타입 정의
- User, Worship, Score, Command 타입
- 공통 상수 및 유틸리티

### 실시간 통신 아키텍처

Socket.io를 통한 양방향 실시간 통신:

#### 주요 이벤트 흐름
```typescript
// 클라이언트 → 서버
'user:join'          // 사용자 입장
'score:page-change'  // 악보 페이지 변경
'score:drawing'      // 드로잉 데이터
'command:send'       // 명령 전송 (인도자만)

// 서버 → 클라이언트 (브로드캐스트)
'command:received'   // 명령 수신
'score:sync'         // 악보 상태 동기화
'users:update'       // 사용자 목록 업데이트
```

#### 실시간 동기화 항목
- **악보 페이지 상태**: 모든 사용자의 현재 보고 있는 페이지
- **드로잉 데이터**: Canvas 위 실시간 그리기 동기화
- **명령 전달**: 인도자 → 팀원 지시사항 (3초 후 자동 사라짐)
- **사용자 상태**: 접속/퇴장, 역할, 악기 정보

### 주요 컴포넌트 구조

#### 페이지 (src/client/pages/)
- **Home.tsx**: 프로필 선택, 예배 선택
- **Worship.tsx**: 메인 예배 화면
- **Admin.tsx**: 관리자 설정 화면

#### 핵심 컴포넌트
- **ScoreViewer**: 악보 이미지 표시 및 Canvas 오버레이
- **DrawingCanvas**: 실시간 드로잉 기능
- **CommandOverlay**: 명령 오버레이 (스택 형태, 3초 자동 사라짐)
- **ProfileSelector/Creator**: 사용자 프로필 관리
- **CommandPanel**: 명령 전송 패널 (인도자/목사님만)

#### 상태 관리 (src/client/stores/)
- **profileStore**: 사용자 프로필, 역할, 악기 정보

#### 서버 구조 (src/server/)
```
server/
├── main/           # Electron 메인 프로세스
├── api/            # Express 서버 + Socket.io
│   ├── server.ts   # API 서버 진입점
│   ├── routes/     # REST API 라우트
│   └── socket-handlers.ts  # Socket.io 이벤트 처리
├── services/       # 비즈니스 로직
└── database/       # SQLite 데이터베이스
```

## 중요 개발 규칙 및 제약사항

### ⚠️ 절대 준수사항

#### 1. 패키지 관리
- **필수 사용**: `npm install` 또는 `npm add` 명령어로만 패키지 설치
- **절대 금지**: `package.json` 파일 직접 수정
```bash
# ✅ 올바른 방법
npm install react-query

# ❌ 금지된 방법
# package.json 직접 편집
```

#### 2. Import 경로
- **공유 코드**: `@shared/types/타입명` 경로 사용
- **클라이언트 코드**: `@/components/...` 경로 사용
```typescript
// ✅ 올바른 import
import { Command } from '@shared/types/command';
import { Button } from '@/components/ui/button';

// ❌ 잘못된 import  
import { Command } from '@shared/types/score'; // 잘못된 파일
```

#### 3. shadcn/ui 테마
- **절대 금지**: 색상 팔레트, CSS 변수 수정
- **필수 유지**: 기본 테마 그대로 사용
- 다크모드는 기본 제공 테마 활용

#### 4. TypeScript Strict Mode
- **필수 설정**: strict mode 활성화 (이미 설정됨)
- **타입 안전성**: `noImplicitAny`, `strictNullChecks` 등 엄격한 타입 검사

#### 5. 코드 품질 검증
- **필수 실행**: 모든 코드 작성 후 `npm run validate` 실행
- **통과 조건**: 타입 오류 0개, 린트 오류 0개, 포맷팅 일관성 유지
- **자동 수정**: `npm run lint:fix`, `npm run format` 활용

### ✅ 개발 권장사항

#### 1. iPad 최적화 UI
- **터치 대상**: 최소 44px × 44px 크기
- **터치 이벤트**: touchstart, touchmove, touchend 처리
- **전체 화면**: fullscreen, landscape 최적화

#### 2. 실시간 통신 패턴
- **이벤트 기반**: Socket.io 이벤트로 상태 동기화
- **에러 처리**: 연결 끊김, 재연결 로직 구현
- **성능**: 불필요한 데이터 전송 최소화

#### 3. 컴포넌트 설계
- **재사용성**: shadcn/ui 기반 공통 컴포넌트 활용
- **상태 분리**: Zustand로 전역 상태, React state로 로컬 상태
- **타입 안전성**: @shared 타입 활용
- **useEffect 최소화**: 상태 변화를 심층 분석하여 useEffect 없이 컴포넌트 설계
  - 상태 변화 흐름을 명확히 파악하여 파생 상태(derived state) 활용
  - 이벤트 핸들러와 직접적인 상태 업데이트로 사이드 이펙트 처리
  - useEffect는 정말 필요한 외부 시스템 연동에만 제한적 사용

## 자주 사용하는 개발 패턴

### Socket.io 이벤트 처리
```typescript
// 클라이언트 (useSocket 훅)
const socket = useSocket();

socket.emit('score:page-change', { page: 2, userId: 'user123' });

socket.on('command:received', (command) => {
  // 명령 오버레이 표시 로직
});
```

### 상태 관리 (Zustand)
```typescript
// stores/profileStore.ts
interface ProfileState {
  currentUser: User | null;
  setUser: (user: User) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
}));
```

### shadcn/ui 컴포넌트 추가
```bash
# 필요한 컴포넌트 설치
npx shadcn-ui@latest add button card dialog

# src/client/components/ui/ 에 자동 생성됨
```

## 문제 해결

### 일반적인 이슈

1. **타입 에러**: `npm run typecheck`로 확인 후 @shared 타입 활용
2. **린팅 에러**: `npm run lint`로 확인
3. **빌드 실패**: `npm run typecheck` 먼저 통과 확인
4. **Socket.io 연결 실패**: 포트 충돌 확인, CORS 설정 점검

### 의존성 문제
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 정리
npm cache clean --force
```

### 개발 환경 문제
```bash
# TypeScript 컴파일만 따로 확인
npm run typecheck

# Vite 빌드만 따로 확인  
npx vite build

# Electron 없이 웹만 테스트 (필요시)
npx vite dev
```

## 워크트리 작업 지침

워크트리를 생성해서 작업해달라는 요청이 있을 경우:

1. **워크트리 생성 위치**: 프로젝트 루트의 `worktree` 디렉토리 하위에 생성
    - `worktree` 디렉토리는 `.gitignore`에 추가되어 있음
    - 경로 예시: `worktree/feature-branch-name`

2. **워크트리 작업 플로우**:
   ```bash
   # 1. 워크트리 생성
   git worktree add worktree/[브랜치명] [브랜치명]
   
   # 2. 워크트리 디렉토리에서 작업 수행
   cd worktree/[브랜치명]
   # ... 작업 수행 ...
   
   # 3. 작업 완료 후 원래 디렉토리로 복귀
   cd ../../
   
   # 4. 워크트리 삭제 (작업 완전 완료 시에만)
   git worktree remove worktree/[브랜치명]
   ```

3. **워크트리 작업 규칙**:
    - 작업이 **완전히 완료**된 후에만 워크트리 삭제
    - 미완료 상태에서는 워크트리를 유지
    - 복수의 워크트리 동시 운영 가능


## 프로젝트 히스토리

### 2024년 12월: 모노리스 통합
- pnpm 워크스페이스 → npm 단일 프로젝트 변경
- packages/* → src/* 구조로 통합
- @gilteun/* 패키지 → @shared/* import로 변경
- 빌드 프로세스 단순화

이 문서는 길튼 시스템의 핵심 아키텍처와 개발 가이드라인을 제공합니다. 새로운 기능 추가나 수정 시 이 규칙들을 반드시 준수하여 코드 일관성과 품질을 유지하시기 바랍니다.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
When committing changes, DO NOT mention that the code was written by Claude or AI in commit messages.
