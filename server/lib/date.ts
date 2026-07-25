import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

/**
 * 저장용 UTC ISO 타임스탬프 — `2026-07-25T03:34:56.789Z`
 *
 * `TZDate`로 UTC에 고정하고 밀리초·`Z`까지 명시해 `Date.toISOString()`과
 * 바이트 단위로 동일한 문자열을 만든다. created_at/updated_at은
 * `orderBy(desc(...))` 사전순 정렬에 쓰이므로 형식이 바뀌면 기존 행과 섞여
 * 정렬이 조용히 틀어진다 — date-fns의 `formatISO()`는 로컬 오프셋(+09:00)에
 * 밀리초도 없어 여기 쓸 수 없다.
 */
export function nowIso(): string {
  return format(new TZDate(Date.now(), "UTC"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
}
