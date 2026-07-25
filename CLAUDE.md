# 길튼 시스템

## Git

- **커밋 작성자는 항상 `Jeongyun Lee <solst_ice@naver.com>`** — 저장소 기존 커밋과 같은 신원이어야 GitHub 귀속이 이어짐
  - 원격/컨테이너 환경은 git 기본값이 `Claude <noreply@anthropic.com>`로 잡혀 있는 경우가 있음. **커밋 전에 `git config user.email`을 확인할 것**
  - `git config user.name "Jeongyun Lee" && git config user.email "solst_ice@naver.com"`
  - 이미 잘못된 신원으로 푸시했다면 `git commit --amend --author="Jeongyun Lee <solst_ice@naver.com>"` 후 force push (`--reset-author`는 작성 시각까지 지우므로 쓰지 말 것)
- 커밋 메시지에 `Co-Authored-By` 태그 절대 붙이지 않기
- PR 본문/설명에 `🤖 Generated with Claude Code` 등 Claude Code 생성 표기·서명 붙이지 않기
  - PR 생성 API가 본문 끝에 서명을 자동으로 붙이는 경우가 있음 — 생성 후 본문을 확인하고 붙어 있으면 제거할 것
- `develop` 브랜치에서 개발 → `main`에 머지/push 시 Railway 자동 배포
- 평소 작업은 `develop`에서 진행할 것

## 배포 환경 (Railway)

- **production**: `main` 푸시 시 자동 배포 → https://gilteun-system.up.railway.app
- **staging**: `develop` 푸시 시 자동 배포 → https://gilteun-staging.up.railway.app
- 두 환경은 볼륨(DB·업로드)이 분리되어 있음 — staging 데이터는 테스트용, production과 무관
- PIN은 두 환경 동일 (환경 변수 `AUTH_PIN`으로 복제됨)

## 품질 체크

- 작업 완료 후 반드시 `npm run check` 실행 (타입체크 + ESLint)
- lint warning도 에러와 동일 취급 — warning이 남아있으면 커밋 금지

## Preview 테스트

- 이 앱은 **아이패드 + 모바일 레이아웃**을 지원 — preview 검증은 아래 두 크기에서 수행할 것
- 기본: **아이패드 세로 모드 `834×1194`** (preview_resize의 width/height로 지정). 항상 세로 기준으로 볼 것
- 모바일: **아이폰 `390×844`**도 함께 검증할 것
- 데스크톱 임의 폭으로 검증하지 말 것 — 위 두 기준 외 폭에선 패널 동작이 다르게 보임

## 수정 금지

- `길튼 시스템/` 디렉토리 — UI 목업 참고용, 절대 수정하지 않을 것

## 드로잉 설계 원칙

- **화이트보드 모델**: 모든 사용자가 모든 Path를 삭제 가능 (권한 체크 없음)
- **획 지우개**: Path 전체를 삭제 (분할 없음), 드래그로 여러 획 연속 삭제
- **Undo/Redo**: 자기 자신의 행위(localPaths)에만 적용 — 타인 획에 영향 없음

## 프로필 가드

- 프로필 미선택 시 모든 기능 페이지에서 홈(`/`)으로 리다이렉트
- 새 페이지 추가 시 상단에 반드시 프로필 가드 패턴 적용
