# Server 지뢰

## Drizzle ORM

- 단건 조회: `.get()` — 복수 조회: `.all()` — 혼동 시 타입 에러 또는 런타임 버그

## Socket.IO 드로잉

- `drawing:move`는 브로드캐스트만 — DB 저장은 `drawing:end`에서만 수행
- 이유: move는 초당 수십 회 발생, 매번 DB write하면 성능 붕괴

## 이미지 업로드

- 파일명은 nanoid 기반 (`${nanoid()}${ext}`)
- `/uploads`에 `maxAge: '1y', immutable: true` 캐싱 적용 중
- 파일명 생성 방식을 바꾸면 캐시 무효화 전략이 깨짐
