# CLAUDE.md

길튼 시스템 (Gilteun System) 개발 가이드 - Claude Code 개발자를 위한 상세 지침서

## 프로젝트 개요

**길튼 시스템**은 교회 찬양팀을 위한 실시간 협업 예배 지원 플랫폼입니다.

### 핵심 아키텍처

- **서버**: Electron 데스크톱 앱 (Windows/macOS)
- **클라이언트**: PWA (iPad Safari)
- **통신**: WiFi 로컬 네트워크
- **사용자**: 최대 30명 동시 접속

### 주요 기능

1. **실시간 악보 주석 시스템** (Figma 스타일)
2. **Apple Pencil 지원** (압력 감지 + 손바닥 거치 방지)
3. **개인별 레이어 관리** (주석 on/off)
4. **실시간 명령 시스템** (팀 커뮤니케이션)
5. **PWA 오프라인 캐싱**

## 기술 스택 사양

### Frontend (PWA - React + TypeScript)

```json
{
  "core": ["react", "typescript", "vite"],
  "state": "zustand",
  "data": ["axios", "@tanstack/react-query"],
  "forms": "formik",
  "dates": "date-fns",
  "ui": ["lucide-react", "tailwindcss"],
  "gestures": ["react-use-gesture", "framer-motion"],
  "dev": ["prettier", "eslint"]
}
```

### Backend (Electron + Node.js)

```json
{
  "core": ["electron", "express"],
  "database": ["better-sqlite3", "drizzle-orm"],
  "realtime": "ws",
  "files": ["multer", "archiver", "unzipper"],
  "utils": ["cors", "helmet"]
}
```

## 데이터베이스 스키마 (Drizzle ORM)

### 핵심 테이블

```typescript
// 예배 정보
export const worships = sqliteTable('worships', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(), // "3월 15일 금요 기도회"
  date: text('date').notNull(), // "2024-03-15"
  time: text('time'), // "19:30"
  description: text('description'), // "특별 기도 시간"
  createdAt: text('created_at').default(sql`datetime('now')`),
});

// 찬양 정보
export const songs = sqliteTable('songs', {
  id: integer('id').primaryKey(),
  worshipId: integer('worship_id').references(() => worships.id),
  title: text('title').notNull(), // "주 은혜임을"
  key: text('key'), // "G"
  memo: text('memo'), // "2절 후 간주 길게"
  imagePath: text('image_path'), // "./uploads/song1.jpg"
  order: integer('order'), // 1, 2, 3...
});

// 주석 데이터 (벡터 기반)
export const annotations = sqliteTable('annotations', {
  id: integer('id').primaryKey(),
  songId: integer('song_id').references(() => songs.id),
  userId: text('user_id').notNull(), // "user-123"
  userName: text('user_name').notNull(), // "김찬양"
  layer: text('layer').notNull(), // "김찬양의 주석"
  svgPath: text('svg_path').notNull(), // SVG 패스 데이터
  color: text('color'), // "#ff0000"
  tool: text('tool'), // "pen" | "highlighter" | "eraser"
  createdAt: text('created_at').default(sql`datetime('now')`),
});
```

## 실시간 통신 명세

### WebSocket 이벤트

```typescript
// 실시간 주석 동기화
'annotation:start'; // 그리기 시작
'annotation:update'; // 그리기 진행 (Figma 스타일)
'annotation:complete'; // 그리기 완료
'annotation:undo'; // 실행 취소
'annotation:redo'; // 다시 실행

// 명령 시스템
'command:send'; // 명령 전송
'command:broadcast'; // 모든 클라이언트에 브로드캐스트

// 연결 관리
'user:connect'; // 사용자 접속
'user:disconnect'; // 사용자 연결 해제
'server:status'; // 서버 상태 (접속자 수 등)

// 데이터 동기화
'sync:request'; // 데이터 동기화 요청
'sync:response'; // 데이터 동기화 응답
```

## 주요 개발 원칙

### 1. iPad 세로모드 우선 설계

- **기본 방향**: Portrait (세로) 모드
- **최적 해상도**: 1668x2388 (11" iPad Pro)
- **터치 최적화**: 44px 최소 터치 영역
- **홈 인디케이터**: 하단 34px 여백 확보

### 2. 실시간 주석 시스템 구현

```typescript
// Canvas 기반 벡터 그리기
interface DrawingEngine {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  isDrawing: boolean;
  tool: 'pen' | 'highlighter' | 'eraser';
  color: string;
  thickness: number;

  // Apple Pencil 지원
  supportsPressure: boolean;
  currentPressure: number;
}

// 실시간 동기화
interface RealtimeAnnotation {
  userId: string;
  userName: string;
  action: 'start' | 'update' | 'complete';
  svgPath: string;
  timestamp: number;
}
```

### 3. PWA 오프라인 지원

```javascript
// Service Worker 캐싱 전략
const CACHE_STRATEGY = {
  // 앱 셸 (UI 컴포넌트)
  shell: 'cache-first',

  // 현재 예배 데이터
  worship: 'network-first',

  // 악보 이미지
  images: 'cache-first',

  // 주석 데이터
  annotations: 'network-first',
};
```

### 4. 터치 제스처 구현

```typescript
// react-use-gesture 사용
interface GestureHandlers {
  // 핀치 줌 (필수)
  onPinch: (state: PinchState) => void;

  // 더블 탭 확대 (필수)
  onDoubleTab: () => void;

  // 스와이프 페이지 이동
  onSwipe: (direction: 'left' | 'right') => void;

  // 드래그 (악보 이동)
  onDrag: (state: DragState) => void;
}
```

## 개발 가이드라인

### 1. 코드 스타일 (.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 2. 상태 관리 패턴 (Zustand)

```typescript
// 전역 상태 스토어
interface AppState {
  // 현재 예배/찬양
  currentWorship: Worship | null;
  currentSong: Song | null;

  // UI 상태
  isDrawingMode: boolean;
  selectedTool: DrawingTool;
  zoomLevel: number;

  // 연결 상태
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  connectedUsers: number;

  // 주석 레이어
  visibleLayers: Record<string, boolean>;
}
```

### 3. API 설계 (TanStack Query + Axios)

```typescript
// 쿼리 키 패턴
const queryKeys = {
  worships: ['worships'] as const,
  worship: (id: number) => ['worship', id] as const,
  songs: (worshipId: number) => ['songs', worshipId] as const,
  annotations: (songId: number) => ['annotations', songId] as const,
};

// 뮤테이션 패턴
const useCreateAnnotation = () => {
  return useMutation({
    mutationFn: (annotation: CreateAnnotationDto) => annotationApi.create(annotation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.annotations });
    },
  });
};
```

## 디렉토리 구조

```
gilteun-system/
├── src/                          # PWA Frontend
│   ├── components/               # 재사용 컴포넌트
│   │   ├── ui/                  # 기본 UI 컴포넌트
│   │   ├── drawing/             # 그리기 관련 컴포넌트
│   │   └── gesture/             # 터치 제스처 컴포넌트
│   ├── pages/                   # 페이지 컴포넌트
│   │   ├── ProfileSelect.tsx
│   │   ├── WorshipList.tsx
│   │   ├── SongList.tsx
│   │   ├── ScoreViewer.tsx
│   │   ├── CommandEditor.tsx
│   │   ├── Admin.tsx
│   │   └── Settings.tsx
│   ├── hooks/                   # 커스텀 훅
│   │   ├── useWebSocket.ts
│   │   ├── useDrawing.ts
│   │   ├── useGestures.ts
│   │   └── useOffline.ts
│   ├── store/                   # Zustand 스토어
│   ├── api/                     # API 클라이언트
│   ├── types/                   # TypeScript 타입
│   └── utils/                   # 유틸리티 함수
├── electron/                    # Electron Backend
│   ├── main.ts                  # 메인 프로세스
│   ├── preload.ts               # 프리로드 스크립트
│   ├── server/                  # Express 서버
│   │   ├── api/                 # API 라우터
│   │   ├── websocket/           # WebSocket 핸들러
│   │   ├── database/            # Drizzle 스키마
│   │   └── uploads/             # 파일 업로드 디렉토리
├── public/                      # PWA 정적 파일
│   ├── manifest.json            # PWA 매니페스트
│   ├── sw.js                    # Service Worker
│   └── icons/                   # PWA 아이콘
└── docs/                        # 추가 문서
```

## 개발 워크플로우

### 1. 로컬 개발 환경

```bash
# 개발 서버 실행 (Electron + Vite HMR)
npm run dev

# 타입 체크
npm run type-check

# 린팅 + 포맷팅
npm run lint
npm run format

# 빌드 테스트
npm run build
```

### 2. PWA 테스트

```bash
# 프로덕션 빌드 후 미리보기
npm run build && npm run preview

# iPad Safari에서 테스트
# http://[서버IP]:4173 접속
# 홈화면에 추가 → PWA 설치 테스트
```

### 3. 디버깅 도구

- **Electron DevTools**: 메인 프로세스 디버깅
- **Chrome DevTools**: 렌더러 프로세스 (PWA) 디버깅
- **React Developer Tools**: 컴포넌트 상태 확인
- **TanStack Query DevTools**: 서버 상태 모니터링

## 성능 최적화 가이드

### 1. 메모리 관리

- **악보 이미지**: 현재 예배만 메모리 로드
- **주석 데이터**: SVG 패스로 효율적 저장
- **WebSocket**: 연결 풀링으로 리소스 절약

### 2. 렌더링 최적화

- **Canvas**: requestAnimationFrame으로 부드러운 그리기
- **React**: React.memo, useMemo, useCallback 적극 활용
- **이미지**: lazy loading + 압축 최적화

### 3. 네트워크 최적화

- **WebSocket**: 불필요한 메시지 필터링
- **API**: TanStack Query 캐싱 전략 활용
- **파일**: 이미지 압축 + 점진적 로딩

## 테스트 전략

### 1. 단위 테스트

- **컴포넌트**: React Testing Library
- **훅**: @testing-library/react-hooks
- **유틸리티**: Jest

### 2. 통합 테스트

- **API**: Supertest
- **WebSocket**: ws 클라이언트 테스트
- **Database**: SQLite in-memory

### 3. E2E 테스트

- **Playwright**: PWA 기능 테스트
- **iPad 시뮬레이터**: 터치 제스처 테스트
- **실제 디바이스**: Apple Pencil 테스트

## 배포 가이드

### 1. Electron 앱 패키징

```bash
# 플랫폼별 빌드
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux

# 배포 파일 생성
npm run dist
```

### 2. PWA 배포

- **HTTPS 필수**: 로컬 네트워크에서도 SSL 인증서 필요
- **매니페스트**: PWA 설치 요구사항 충족
- **Service Worker**: 캐싱 전략 최적화

## 트러블슈팅

### 자주 발생하는 문제들

1. **Apple Pencil 인식 안됨**
   - `pointer` 이벤트 대신 `touch` 이벤트 사용
   - `touch-action: none` CSS 설정

2. **WebSocket 연결 끊김**
   - 재연결 로직 구현
   - 지수 백오프 적용

3. **PWA 설치 안됨**
   - HTTPS 요구사항 확인
   - manifest.json 유효성 검사

4. **메모리 누수**
   - Canvas 컨텍스트 정리
   - WebSocket 연결 해제
   - 이벤트 리스너 cleanup

## 중요 참고사항

### 개발 시 반드시 고려할 사항

1. **Figma 스타일 실시간 주석**: 다른 사용자가 그리는 과정을 실시간으로 볼 수 있어야 함
2. **벡터 기반 저장**: SVG 패스로 저장하여 확대/축소 시에도 선명함 유지
3. **개인별 레이어**: 각 사용자의 주석을 개별적으로 on/off 할 수 있어야 함
4. **Apple Pencil 최적화**: 압력 감지, 손바닥 거치 방지 등 전문적인 그리기 도구 지원
5. **오프라인 모드**: WiFi 끊김 시에도 현재 예배 데이터는 접근 가능해야 함

이 시스템은 실제 교회 환경에서 사용될 전문적인 도구이므로, 안정성과 사용성을 최우선으로 고려하여 개발해주세요.
