# 길튼 시스템 (Gilteun System)

교회 예배 관리를 위한 웹 애플리케이션입니다. 악보 관리, 실시간 협업 드로잉, 명령 브로드캐스트 등을 지원합니다.

## 주요 기능

- **예배 관리**: 예배 생성/편집/삭제, 예배 유형별 분류
- **악보 관리**: 이미지 업로드, 드래그앤드롭 순서 변경, 인라인 제목 편집
- **실시간 드로잉**: 악보 위 자유 그리기 + 실시간 동기화, 핀치줌, 드래그 획 지우개
- **좌표 정규화**: 다양한 화면 크기에서 동일한 드로잉 표시
- **명령 브로드캐스트**: 예배 중 명령 버튼으로 모든 접속자에게 알림
- **페이지 호출**: 특정 악보 페이지로 다른 사용자를 초대
- **접속자 현황**: 같은 예배를 보고 있는 사용자 실시간 표시
- **프로필 시스템**: 역할별 프로필 (인도자, 건반, 기타 등)
- **오프라인 읽기**: 최근 데이터 캐싱으로 오프라인 읽기 지원

## 빠른 설치

아래 명령어 하나로 모든 설치가 자동으로 진행됩니다.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/UniM0cha/gilteun-system/main/setup.sh)
```

이미 레포를 클론한 경우 프로젝트 디렉토리에서 직접 실행할 수도 있습니다.

```bash
bash setup.sh
```

스크립트가 자동으로 처리하는 항목:

1. Xcode CLT / Homebrew / Node.js 24 LTS 설치 (없는 경우)
2. 레포 클론 (`$HOME/gilteun-system`)
3. 의존성 설치 (서버 + 클라이언트)
4. React 클라이언트 빌드
5. 데이터베이스 초기 데이터 투입
6. macOS 자동 시작 서비스 등록 (선택)

## 설치 및 실행 (수동)

### 요구사항

- Node.js 18+
- npm

### 설치

```bash
# 의존성 설치 (루트 + 서버 + 클라이언트)
npm install
npm run install:all
```

### 개발 모드

```bash
# 서버(3002) + 클라이언트(5174) 동시 실행
npm run dev
```

브라우저에서 `http://localhost:5174` 접속

### 프로덕션 모드

```bash
# 클라이언트 빌드
npm run build

# 서버 시작 (client/dist 정적 서빙 포함)
npm start
```

브라우저에서 `http://localhost:3000` 접속

### 초기 데이터

```bash
# 기본 역할, 명령, 예배 유형 등 시드 데이터 생성
npm run db:seed
```

## 로컬 네트워크 접속

같은 Wi-Fi에 연결된 다른 기기에서 접속할 수 있습니다.

1. 프로덕션 모드로 서버 실행: `npm start`
2. 서버 시작 시 출력되는 로컬 IP 주소 확인
3. 다른 기기에서 `http://<서버IP>:3000` 접속

## macOS 자동 시작 (launchd)

부팅 시 자동으로 서버를 시작하도록 설정할 수 있습니다.

```bash
# 서비스 등록
cd server && bash deploy/install.sh

# 상태 확인
launchctl list | grep gilteun

# 수동 시작/중지
launchctl start com.gilteun.server
launchctl stop com.gilteun.server

# 서비스 해제
cd server && bash deploy/uninstall.sh

# 로그 확인
tail -f /tmp/gilteun-server.log
tail -f /tmp/gilteun-server.error.log
```

## 제거

아래 명령어로 길튼 시스템을 완전히 제거할 수 있습니다.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/UniM0cha/gilteun-system/main/uninstall.sh)
```

또는 프로젝트 디렉토리에서 직접 실행:

```bash
bash uninstall.sh
```

처리 항목:

1. launchd 서비스 중지 및 해제
2. 로그 파일 삭제 (`/tmp/gilteun-server.log`, `/tmp/gilteun-server.error.log`)
3. 프로젝트 디렉토리 삭제 (확인 후 선택적으로)

## 기술 스택

- **백엔드**: Express v5, Socket.IO, Drizzle ORM, SQLite (better-sqlite3)
- **프론트엔드**: React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, Zustand
- **실시간**: Socket.IO (드로잉 동기화, 명령 브로드캐스트, 접속자 현황)
- **UI**: shadcn/ui (Radix 기반), lucide-react, sonner, @dnd-kit/react, react-swipeable

## 프로젝트 구조

```
gilteun-system/
├── server/          # 백엔드 (Express + Socket.IO + SQLite)
│   ├── db/          # 스키마, 마이그레이션, 시드
│   ├── routes/      # REST API
│   ├── socket/      # 실시간 핸들러
│   └── deploy/      # launchd 배포 스크립트
├── client/          # 프론트엔드 (React + Vite)
│   └── src/
│       ├── pages/       # 페이지 컴포넌트
│       ├── components/  # 공통 컴포넌트
│       ├── hooks/       # 커스텀 훅 (useSocket, useDrawingSync, queries)
│       ├── store/       # Zustand 스토어 (appStore)
│       └── lib/         # 유틸리티
└── 길튼 시스템/     # UI 목업 (참고용)
```
