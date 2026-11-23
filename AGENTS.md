# 길튼 시스템

## Git

- **커밋 작성자는 항상 `Jeongyun Lee <solst_ice@naver.com>`** — 저장소 기존 커밋과 같은 신원이어야 GitHub 귀속이 이어짐
  - 원격/컨테이너 환경은 git 기본값이 `Claude <noreply@anthropic.com>`로 잡혀 있는 경우가 있음
  - `git config user.name "Jeongyun Lee" && git config user.email "solst_ice@naver.com"`
  - **커밋 전 확인은 `git var GIT_AUTHOR_IDENT`로 할 것.** `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` 환경변수가 `user.name`/`user.email` config를 덮어쓰므로, `git config user.email`만 보면 값은 맞는데 실제 작성자는 `Claude`로 들어간다. 커밋 후 `git log -1 --format='%an <%ae>'`로 한 번 더 확인하면 확실하다
  - 이미 잘못된 신원으로 푸시했다면 아래로 되돌린 뒤 force push 한다 (`--force`는 남의 푸시를 덮어쓸 수 있음)
    - **커밋 1개**: `git commit --amend --author="Jeongyun Lee <solst_ice@naver.com>"`
    - **여러 개**: `--amend`는 맨 위 커밋 하나만 고친다. 아래처럼 일괄 처리할 것 (`-i` 없이 동작하고, 지정한 커밋 **다음**부터 고쳐진다)
      - `git rebase <마지막_정상_커밋> --exec 'git commit --amend --no-edit --author="Jeongyun Lee <solst_ice@naver.com>"'`
      - 재작성 범위에 **머지 커밋이 있으면 이력이 평탄화된다.** 이 저장소는 feature 브랜치가 `develop`을 머지해 오는 패턴을 상시로 쓰므로, 실행 전 `git log --merges <마지막_정상_커밋>..HEAD`로 확인하고 머지가 걸리면 범위를 좁히거나 `--rebase-merges`를 함께 쓸 것
    - **스택 PR**이면 **base 브랜치를 먼저 고친 뒤 그 위에 쌓인 후속 브랜치를 옮긴다** — `git switch <후속_브랜치> && git rebase --onto <base_새_헤드> <base_옛_헤드>` (예: #30이 base, 그 위의 #32가 후속). "위/아래"로 외우지 말 것 — 방향을 반대로 잡으면 base 브랜치가 후속 브랜치 헤드로 통째로 이동해 diff가 오염된다
    - 되돌린 뒤 `git push --force-with-lease=<브랜치>:<재작성_전_원격_SHA> origin <로컬_ref>:<브랜치>` — **기대 SHA를 반드시 명시할 것.** 값 없는 `--force-with-lease`는 remote-tracking ref만 보고 판단하므로, 에디터나 다른 세션이 백그라운드에서 `git fetch`를 돌리면 보호가 무효화된다
    - `--reset-author`는 원래 작성 시각까지 지우므로 쓰지 말 것
- 커밋 메시지에 `Co-Authored-By` 태그 절대 붙이지 않기
- PR 본문/설명에 `🤖 Generated with Claude Code` 등 Claude Code 생성 표기·서명 붙이지 않기
  - PR 생성 API가 본문 끝에 서명을 자동으로 붙이는 경우가 있음 — 생성 후 본문을 확인하고 붙어 있으면 제거할 것
  - **본문뿐 아니라 코멘트도 대상이다.** 일반 코멘트와 인라인 리뷰 코멘트는 API가 갈려 있어(`issues/<n>/comments`, `pulls/<n>/comments`) 한쪽만 훑으면 놓친다. 단, `claude[bot]`이 남긴 코멘트의 서명은 봇 자신의 것이므로 건드리지 않는다
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
