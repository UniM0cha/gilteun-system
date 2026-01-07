# 길튼 시스템 (Gilteun System)

교회 찬양팀을 위한 실시간 협업 예배 지원 플랫폼

## 주요 기능

- **실시간 악보 주석** - Figma 스타일 협업, SVG 벡터 기반
- **Apple Pencil 지원** - 압력 감지, 손바닥 거치 방지
- **개인별 레이어** - 각 사용자 주석 on/off 전환
- **실시간 명령** - 팀 커뮤니케이션 (빠른 지시)
- **PWA 오프라인** - WiFi 끊겨도 현재 예배 접근 가능

## 아키텍처

```
┌─────────────────┐    WiFi    ┌─────────────────┐
│   Electron 서버  │ ◄────────► │   iPad PWA      │
│                 │            │                 │
│ • Express API   │            │ • React 19      │
│ • SQLite        │            │ • 실시간 동기화  │
│ • WebSocket     │            │ • 오프라인 캐시  │
└─────────────────┘            └─────────────────┘
```

## 기술 스택

| 영역 | 스택 |
|------|------|
| **서버** | Electron + Express 5 + SQLite (Kysely) |
| **클라이언트** | React 19 + TypeScript + Vite 7 (PWA) |
| **상태 관리** | Zustand + TanStack Query |
| **실시간** | WebSocket (ws) |
| **스타일** | Tailwind CSS + Lucide React |

## 시작하기

### 설치

```bash
git clone https://github.com/your-username/gilteun-system.git
cd gilteun-system
npm install
```

### 개발 서버

```bash
npm run dev
```

- **PWA**: http://localhost:5173
- **API**: http://localhost:3001

### 빌드

```bash
npm run build           # 프로덕션 빌드
npm run build:electron  # Electron 앱 패키징
```

## iPad 접속

1. Safari에서 `http://[서버IP]:5173` 접속
2. 공유 버튼 → "홈 화면에 추가"
3. PWA 앱으로 사용

## 개발 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (Vite + Electron) |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run type-check` | TypeScript 검사 |

## 지원 플랫폼

### 서버
- Windows 10/11
- macOS (Intel + Apple Silicon)

### 클라이언트
- iPad (iOS Safari PWA)
- 최적 화면: 10.2" ~ 12.9"

## 라이선스

MIT
