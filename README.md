# 길튼 시스템 (Gilteun System)

**교회 찬양팀을 위한 실시간 협업 예배 지원 플랫폼**

길튼 시스템은 찬양팀이 연습과 예배 중에 악보를 보고, 실시간으로 주석을 공유하며, 팀 간 소통할 수 있는 종합적인 디지털 플랫폼입니다.

## 📋 주요 기능

### 🎵 실시간 악보 협업

- **Figma 스타일 실시간 주석**: 여러 명이 동시에 악보에 주석을 달고 실시간으로 공유
- **개인별 레이어 관리**: 각 팀원의 주석을 개별적으로 표시하거나 숨김 처리
- **벡터 기반 그리기**: 확대/축소해도 선명한 주석 품질 유지
- **Apple Pencil 지원**: 압력 감지 및 손바닥 거치 방지 기능

### 📱 iPad 최적화 PWA

- **세로모드 우선 설계**: iPad 사용에 최적화된 UI/UX
- **핀치줌 & 더블탭**: 악보 확대/축소 및 fit-to-screen 기능
- **오프라인 지원**: WiFi 연결이 끊어져도 현재 예배 데이터 접근 가능
- **홈화면 설치**: PWA를 통한 네이티브 앱과 같은 사용 경험

### 🔄 실시간 팀 커뮤니케이션

- **빠른 명령 시스템**: "더 힘있게", "템포 업" 등 미리 정의된 명령
- **사용자 정의 명령**: 이모지와 텍스트로 개인화된 명령 생성
- **명령 히스토리**: 최근 전송된 명령들 확인 가능
- **실시간 브로드캐스트**: 모든 팀원에게 즉시 전달

### 🗂️ 예배 및 악보 관리

- **예배 일정 관리**: 달력 기반 예배 생성 및 관리
- **찬양 순서 구성**: 드래그 앤 드롭으로 찬양 순서 변경
- **일괄 악보 업로드**: 여러 악보 파일을 한 번에 업로드
- **메타데이터 관리**: 제목, 키(조), 연주 메모 등 상세 정보

## 🏗️ 시스템 아키텍처

### 서버-클라이언트 구조

```
┌─────────────────┐    WiFi    ┌─────────────────┐
│   Electron 서버  │ ◄────────► │   iPad PWA      │
│                 │            │   클라이언트     │
│ • SQLite DB     │            │                 │
│ • WebSocket     │            │ • 실시간 동기화  │
│ • 파일 저장소    │            │ • 오프라인 캐시  │
│ • 백업/복원     │            │ • 터치 최적화    │
└─────────────────┘            └─────────────────┘
```

### 사용 시나리오

#### 연습 모드

1. **예배 준비**: 관리자가 예배를 생성하고 찬양 목록을 구성
2. **악보 업로드**: 각 찬양별 악보 이미지 파일 업로드
3. **팀 연결**: 팀원들이 각자 iPad로 서버에 접속
4. **협업 주석**: 실시간으로 주석을 달며 연습 포인트 공유
5. **명령 전송**: 인도자가 "더 힘있게", "템포 조절" 등의 지시사항 전달

#### 예배 모드

1. **보기 전용**: 연습 때 작성한 주석들을 참고하며 악보 확인
2. **필요시 수정**: 예배 중에도 새로운 주석 추가 가능
3. **실시간 소통**: 급한 지시사항을 명령 시스템으로 전달

## 🛠️ 기술 스택

### Frontend (PWA)

- **React + TypeScript**: 타입 안전성을 갖춘 컴포넌트 기반 UI
- **Vite**: 빠른 개발 서버 및 빌드 도구
- **TanStack Query + Axios**: 효율적인 서버 상태 관리 및 데이터 페칭
- **Zustand**: 경량 전역 상태 관리
- **Tailwind CSS**: 유틸리티 우선 스타일링
- **Formik**: 폼 유효성 검사 및 상태 관리
- **date-fns**: 날짜 처리 유틸리티

### Backend (Electron Server)

- **Electron**: 크로스 플랫폼 데스크톱 애플리케이션
- **Express**: RESTful API 서버
- **WebSocket**: 실시간 양방향 통신
- **SQLite + Drizzle ORM**: 경량 로컬 데이터베이스
- **Multer**: 파일 업로드 처리
- **Archiver/Unzipper**: 백업/복원 기능

### 주요 라이브러리

- **Lucide React**: 일관된 아이콘 시스템
- **react-use-gesture**: 터치 제스처 처리
- **Framer Motion**: 부드러운 애니메이션

## 📱 지원 플랫폼

### 서버

- **Windows 10/11**: Electron 데스크톱 애플리케이션
- **macOS**: Intel 및 Apple Silicon 지원

### 클라이언트

- **iPad**: iOS Safari 브라우저 PWA
- **최적 화면 크기**: 10.2" ~ 12.9" iPad
- **세로 모드**: 기본 사용 방향

## 🚀 설치 및 실행

### 개발 환경 구성

```bash
# 저장소 클론
git clone https://github.com/your-username/gilteun-system.git
cd gilteun-system

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 운영 환경 배포

```bash
# 프로덕션 빌드
npm run build

# Electron 앱 패키징
npm run build:electron

# 배포 파일 생성
npm run dist
```

### PWA 클라이언트 접속

1. iPad에서 Safari 브라우저 열기
2. 서버 IP 주소 입력 (예: `http://192.168.1.100:3000`)
3. 공유 버튼 → "홈 화면에 추가" 선택
4. PWA 앱 아이콘으로 접속

## 💾 데이터 구조

### 예배 정보

```typescript
interface Worship {
  id: number;
  title: string; // "3월 15일 금요 기도회"
  date: string; // "2024-03-15"
  time?: string; // "19:30"
  description?: string; // "특별 기도 시간"
  createdAt: string;
}
```

### 찬양 정보

```typescript
interface Song {
  id: number;
  worshipId: number;
  title: string; // "주 은혜임을"
  key?: string; // "G"
  memo?: string; // "2절 후 간주 길게"
  imagePath: string; // "./uploads/song1.jpg"
  order: number; // 1, 2, 3...
}
```

### 주석 데이터

```typescript
interface Annotation {
  id: number;
  songId: number;
  userId: string; // "user-123"
  userName: string; // "김찬양"
  layer: string; // "김찬양의 주석"
  svgPath: string; // SVG 패스 데이터
  color: string; // "#ff0000"
  tool: 'pen' | 'highlighter' | 'eraser';
  createdAt: string;
}
```

## 🔧 주요 설정

### WebSocket 이벤트

- `annotation:start/update/complete`: 실시간 주석 동기화
- `command:send/broadcast`: 명령 전송 및 브로드캐스트
- `user:connect/disconnect`: 사용자 연결 관리
- `sync:request/response`: 데이터 동기화

### 오프라인 캐싱

- **현재 예배**: 모든 악보 이미지 및 주석 데이터
- **앱 셸**: PWA 기본 UI 컴포넌트
- **사용자 설정**: 테마, 레이어 표시 상태 등

### 백업/복원

- **백업 포함 항목**: 예배 데이터, 악보 파일, 주석 정보
- **형식**: ZIP 압축 파일
- **복원**: 원클릭 ZIP 파일 업로드로 완전 복원

## 🎯 개발 로드맵

### Phase 1: 핵심 인프라 (4주)

- [x] 프로젝트 초기 설정
- [ ] Electron 서버 + Express API
- [ ] SQLite + Drizzle ORM 설정
- [ ] PWA 기본 구조 구현
- [ ] WebSocket 실시간 통신

### Phase 2: 실시간 주석 시스템 (6주)

- [ ] Canvas 기반 그리기 엔진
- [ ] 벡터 기반 주석 저장/로드
- [ ] Figma 스타일 실시간 동기화
- [ ] 개인별 레이어 관리
- [ ] Apple Pencil 최적화

### Phase 3: iPad 최적화 (4주)

- [ ] 터치 제스처 구현
- [ ] 핀치줌 & 더블탭 확대
- [ ] 세로모드 UI 완성
- [ ] PWA 홈화면 설치 최적화

### Phase 4: 고급 기능 (4주)

- [ ] 명령 시스템 + 히스토리
- [ ] 오프라인 캐싱 구현
- [ ] 백업/복원 기능
- [ ] 관리자 모니터링 패널

## 🤝 기여 가이드

### 개발 규칙

- **Code Style**: Prettier + ESLint 설정 준수
- **Commit Message**: Conventional Commits 형식
- **Branch**: feature/기능명 브랜치에서 작업 후 PR

### 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 타입 체크
npm run type-check
```

---

**길튼 시스템으로 더욱 은혜로운 찬양 시간을 만들어보세요!** 🎵✨
