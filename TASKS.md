# 길튼 시스템 – 작업 백로그(TASKS)

이 문서는 남은 작업을 한국어로 정리한 체크리스트입니다. 우선순위와 관련 파일, 완료 기준을 명확히 적었습니다. 작업 진행 시 체크박스를 업데이트하세요.

표기

- [P0] 가장 긴급/차단 이슈
- [P1] 높은 우선순위
- [P2] 후순위/개선

---

## 전반 UI/UX 지침

- [P0] 모든 UI 구현은 `gilteun-system-ui-mockup.tsx`를 기준으로 진행하고 검수합니다.
- [P1] 모크업과 다를 필요가 있는 경우(단순화/축소/기기 제약), 차이점과 근거를 본 TASKS.md에 기록합니다.
- [P1] 화면/컴포넌트를 추가·변경할 때 해당 모크업 섹션을 명시하고 수용/제외 범위를 적습니다.

## 1) 즉시 수정 항목 (일관성/치명 이슈)

- [x] [P0] 헬스 체크 엔드포인트 불일치 수정
  - 클라이언트가 `GET /health`를 호출하도록 정합화 (또는 서버에 `/api/health` 추가). 서버는 이미 `/health`를 제공함.
  - 수정 파일
    - `src/pages/ProfileSelect.tsx` (서버 연결 테스트 fetch 경로)
    - `src/api/client.ts` (ApiClient `checkHealth` 경로)
  - 완료 기준: Electron 서버(기본 3001) 실행 시 프로필 선택 화면에서 “서버 연결 성공” 표시됨.

- [x] [P0] 불필요한 커서 이동 이벤트 코드 제거
  - 요구사항상 커서 이동 브로드캐스트/리스너 불필요. 관련 커스텀 이벤트(`cursorMove`) 등록/호출 제거.
  - 대상/검토
    - `src/pages/ScoreViewerPage.tsx` 내 `cursorMove` 이벤트 리스너 useEffect 제거
    - 동일 파일의 `handleCursorMove` 및 `onMouseMove`/`onTouchMove` 연결 제거/정리
    - `src/components/drawing/AnnotationEngine.tsx`에서 커스텀 이벤트 디스패치가 없는지 확인 (없으면 유지)
  - 완료 기준: `cursorMove` 관련 레퍼런스 없음, 그리기/실시간 동작 정상, 빌드 통과

- [x] [P1] 주석 API 사용 통일 (단일 표면)
  - 주석은 `src/api/annotations.ts` + `src/hooks/useAnnotationApi.ts`로 사용.
  - `src/hooks/useApi.ts` 내 중복 주석 훅 제거, `src/api/index.ts`의 주석 타입 export 제거.
  - 완료 기준: 검색 시 song스코프 주석 엔드포인트/훅 호출 없음. 모든 주석 CRUD는 `/api/annotations/*` 사용.

---

## 2) 테스트 가능성 및 E2E 정합

- [x] [P0] E2E에서 기대하는 data-testid 부여
  - `src/pages/ProfileSelect.tsx` 루트: `data-testid="profile-select"`
  - `src/pages/WorshipList.tsx` 각 예배 카드: `data-testid="worship-item"` 추가 (루트 컨테이너는 이미 `worship-list` 존재)
  - `src/pages/SongListPage.tsx` 각 찬양 카드: `data-testid="song-item"` 추가 (페이지 루트는 `song-list` 존재)
  - 완료 기준: `tests/e2e/multiuser-collaboration.spec.ts`의 셀렉터가 타임아웃 없이 찾힘

- [x] [P1] E2E 전제 정렬 (전역 의존 제거)
  - 전역 노출 삭제. 테스트는 UI/REST 기반으로 교체
  - 서버 연결: `/health` REST로 확인
  - 주석 동기화: `svg.real-time-drawing-paths path` 존재 여부로 확인
  - 레이어 토글: 토글 전후 path 개수 비교로 확인
  - 성능/스트레스: 전역 의존 테스트는 스킵 처리(추후 전용 페이지에서 측정)

---

## 3) 코어 UX – Phase 1.5 (모크업과 1차 수렴)

- [ ] [P1] 프로필 선택 최소 UI 개선
  - 간단 카드(아이콘/역할) 목록 + 신규 프로필 모달 스텁
  - 마지막 사용 프로필 저장(`useAppStore`)
  - 완료 기준: 랜딩→프로필 선택→예배 목록 진입 가능

- [ ] [P1] 예배 목록 개선
  - 간단 날짜 필터 + “새 예배 생성” 모달(`POST /api/worships` 연동)
  - 완료 기준: 생성 즉시 목록 반영

- [ ] [P1] 찬양 목록 개선
  - 순서(상하 이동)로 간단 재정렬 → `order` 업데이트
  - 생성/수정 폼 검증 및 리셋 흐름 보완
  - 완료 기준: 추가/수정/순서변경 저장 정상 동작

---

## 4) 악보 이미지 업로드 (Phase 2)

- [ ] [P1] 백엔드 업로드 구현
  - `POST /api/songs/:id/score` (multipart) → 파일 저장, DB `imagePath` 갱신, 삭제 엔드포인트 포함
  - 완료 기준: `GET /api/songs/:id` 응답의 `imagePath` 유효

- [ ] [P1] 프런트 업로드 연결
  - `SongListPage` 업로드 모달에서 `useUploadScore` 사용, 검증/미리보기, 카드 상태 갱신
  - `ScoreViewerPage`에서 이미지 표시 및 자동 맞춤
  - 완료 기준: 업로드 이후 카드 “악보 있음”, 뷰어 표시 정상

---

## 5) 실시간 주석 안정화 (Phase 2)

- [ ] [P1] AnnotationEngine 성능/수명주기 점검
  - 포인터 처리/정리(cleanup) 검증, 성능 모니터 토글 옵션 제공
  - 완료 기준: 경고/메모리 누수 없음, 60fps 근접

- [ ] [P1] AnnotationStorage 오프라인 큐 영속화
  - 로컬 저장(예: localStorage/IndexedDB) 유지 + 재연결 시 자동 플러시
  - 완료 기준: 오프라인 그리기 후 새로고침→온라인 전환 시 서버 반영

- [ ] [P1] WebSocket 페이로드 일치
  - `sendAnnotationUpdate/Complete` 페이로드가 서버 핸들러 기대와 일치하는지 점검
  - 완료 기준: 서로 다른 2개 클라이언트에서 거의 실시간 동기화 + REST 조회 시 저장 반영

- [ ] [P2] 레이어 표시 UX 다듬기
  - 각 사용자 토글에 `data-testid` 추가, 화면 상태와 일관된 반영
  - 완료 기준: 사용자 레이어 토글 시 즉시 반영

---

## 6) 명령 패널/관리자 (Phase 3)

- [ ] [P2] 명령 패널 편집 UI
  - 명령 칩(이모지/텍스트/색상) CRUD + 빠른 전송 모달
  - 완료 기준: 프리셋 생성→전송→타 사용자 토스트 노출(`command:broadcast`)

- [ ] [P2] 관리자 대시보드
  - `/api/status` + WS 접속자/리소스, 실시간 피드
  - 완료 기준: 관리자에서 라이브 메트릭/사용자 확인 가능

- [ ] [P2] 설정 페이지
  - 다크모드/입력 설정/위험 구역(로컬 데이터 초기화)
  - 완료 기준: 설정이 영속/즉시 반영, 초기화 동작

---

## 7) API/DB 보강

- [ ] [P1] 주석 REST/WS 정합성 보완
  - `/api/annotations/*` CRUD가 WS 삽입과 일관되도록 스키마/필드 확인(strokeWidth/opacity/version/soft-delete)
  - 완료 기준: 양 경로 모두 정상 동작

- [ ] [P2] 검색/정렬 고도화
  - 예배/찬양 API 파라미터 확장 및 UI 연결
  - 완료 기준: UI에서 필터/정렬이 서버 반영

---

## 8) QA/Lint/형상

- [ ] [P1] Lint/Type 체크 정리
  - `npm run lint` / `npm run type-check` 무결성 확보

- [ ] [P1] Playwright E2E 통과
  - 렌더러/서버 기동 후 `npx playwright test`
  - 불안정성 시 대기/셀렉터 개선

- [ ] [P2] 성능 벤치마크 문서화
  - 실행 방법/지표 해석 정리, 목표 점수 정의

---

## 9) 문서화

- [ ] [P2] 기여 가이드
  - 로컬 실행/빌드/DB/테스트/WS 이벤트 요약 문서

- [ ] [P2] 기능 문서
  - 주석 엔진/오프라인/명령 패널/관리자 요약 문서

---

## 10) 향후 과제

- [ ] [P2] 다페이지 악보(PDF→이미지) 지원
- [ ] [P2] iPad 제스처 정교화(핀치/회전/관성)
- [ ] [P2] 이미지 자산 캐싱 & 오프라인 PWA 동작

---

## 변경 이력

- 2025-08-29: 초기 백로그 작성 및 P0(헬스 체크) 처리
