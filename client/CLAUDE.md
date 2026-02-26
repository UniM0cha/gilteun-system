# Client 지뢰

## 좌표 정규화

- 모든 좌표는 0~1 비율로 정규화하여 저장/전송 — 다양한 화면 크기 지원
- 펜 굵기도 `canvas.width` 기준 비율로 정규화 (`penWidth / canvas.width`)
- 좌표 변환 시 반드시 `getBoundingClientRect().width/height` 사용 — CSS transform(줌) 보정이 자동 적용됨
  - `canvas.width`(픽셀)가 아니라 `rect.width`(CSS 크기)를 써야 줌 상태에서도 정확

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
