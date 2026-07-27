# Client 지뢰

## 좌표 정규화

- 모든 좌표는 0~1 비율로 정규화하여 저장/전송 — 다양한 화면 크기 지원
- **그리기 영역은 캔버스(흰 카드) 전체** — 악보 이미지 영역(letterbox)이 아니라 카드 전체에 그릴 수 있다. 좌표 기준 rect는 `getCanvasContentRect(canvas)`(= `{0, 0, offsetWidth, offsetHeight}`)로 고정. 카드가 3:4로 고정돼 있어 전체 기준이어도 X/Y 정규화 스케일이 같은 비율 → 획 모양 왜곡 없음. 악보 비율은 CSS `object-contain`이 별도로 유지
  - ⚠️ 좌표계는 이미지 종횡비(`imageAspect`)에 **의존하지 않음** — 과거 letterbox(`getContainedRect`) 기준에서 전환됨. 기존 DB 좌표는 `server/db/migrateDrawingCoords.ts`로 1회 변환해 위치 보존
- 펜 굵기는 **CSS 레이아웃 폭(`offsetWidth`) 기준 비율**로 정규화 (`penWidth / drawRect.width`, drawRect는 `getCanvasContentRect(canvas)`)
  - ⚠️ `canvas.width`로 정규화하지 말 것 — backing store가 **DPR배 물리 픽셀**(`canvas.width = offsetWidth * dpr`)이라 DPR>1(아이패드=2)에서 굵기가 1/dpr로 저장되는 회귀 발생
- 좌표 변환(pointer→정규화)은 반드시 `getBoundingClientRect().width/height` 사용 — CSS transform(줌) 보정이 자동 적용됨
  - `canvas.width`(픽셀 버퍼)가 아니라 `rect.width`(CSS 크기)를 써야 줌 상태에서도 정확

## HiDPI / DPR

- canvas backing store는 `offsetWidth * devicePixelRatio`로 키워 기기 해상도로 렌더(stroke 선명도) — `syncCanvasBackingStore`
- redraw 시 `ctx.setTransform(dpr,…)`로 좌표계를 CSS px로 통일 → 렌더/정규화 수식은 전부 CSS px 기준
- **그리기/굵기용 content rect는 `getCanvasContentRect(canvas)` 단일 helper로 고정** — 한 call site라도 `canvas.width`로 되돌아가면 DPR배 어긋남

## 핀치줌

- CSS `transform: scale()`을 카드 컨테이너 div에 적용
- canvas 내부 좌표계는 변경 없음 — `rect.width/height` 사용으로 자동 보정

## react-swipeable

- ref 기반 DOM listener 부착 방식이라 조건부 spread 무효 (`isDrawMode ? {} : handlers` 안 됨)
- 항상 spread하되, callback 내부에서 ref로 guard (`isDrawModeRef.current`)

## Socket.IO

- 싱글톤 인스턴스: `useSocket.ts`의 `getSocket()`
- 새 소켓을 만들지 말 것 — 재연결 시 room 자동 재입장 로직이 싱글톤에 묶여 있음

## ESLint

- `src/components/ui/`는 shadcn/ui 자동생성 파일이므로 린트 제외 대상
- 이 디렉토리의 린트 에러는 무시하되, 직접 수정하지 말 것

## shadcn ui/ 는 base-nova stock 유지

- `components.json`의 `style`은 `base-nova`(base-ui 기반) — `ui/`는 **레지스트리 stock 그대로** 둔다.
  추가·갱신은 `npx shadcn add <컴포넌트> --overwrite`로만 하고 파일을 손으로 고치지 않는다
- 커스터마이즈는 **호출부 className**에서 한다. stock 클래스를 이겨야 하므로 주의할 점:
  - 반응형 분기까지 같이 덮어써야 한다 — `max-w-5xl`만 주면 stock의 `sm:max-w-sm`이 이긴다
    (`max-w-5xl sm:max-w-5xl`처럼 써야 함. `DialogContent`/`AlertDialogContent` 공통)
  - `ring-1`은 `border-none`으로 지워지지 않는다 — 테두리를 없애려면 `ring-0`
  - 44px 터치 타겟은 stock 기본(`h-8`/`size-8`)보다 크므로 호출부에서 `h-11`·`size-11`,
    `SelectTrigger`는 `data-[size=default]:h-11`로 지정한다
  - `PopoverContent`는 stock이 `flex flex-col gap-2.5`다 — `p-0`으로 자식을 맞붙여
    구분선(`border-b`)을 만드는 곳은 `gap-0`도 함께 줘야 한다. 패딩만 지우면 10px 빈틈이 남는다
- ⚠️ 과거 회귀: Radix→base-ui 이주(`e9cf3e2`) 때 new-york 클래스를 그대로 들고 와서
  다이얼로그 백드롭(150ms)과 팝업(`duration-200`)의 exit 길이가 어긋났다. base-ui는
  **팝업 애니메이션 완료 시점에 백드롭까지 함께 unmount**하고 `tw-animate-css`의
  `animate-out`은 `fill-mode: none`이라, 백드롭이 페이드 후 opacity 1로 되돌아온 채
  ~50ms 남아 "닫을 때 배경 한 번 깜박임"으로 나타났다. stock은 양쪽 모두 `duration-100`이라
  이 갭이 없다 — **애니메이션 duration을 한쪽에만 주지 말 것**
- stock `AlertDialogAction`은 `Close`가 아닌 순수 `Button`이라 확인 시 자동으로 닫히지 않는다.
  `ConfirmDialog`가 `open`을 직접 들고 닫아주므로, 확인 다이얼로그는 이 컴포넌트를 쓸 것
- `Popover`는 `role="dialog"`다 — `PopoverTitle`을 넣어 접근성 이름을 붙일 것
  (시각적 제목이 어색한 곳은 `className="sr-only"`)
