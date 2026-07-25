import { format, isValid, parse, parseISO } from "date-fns";

/**
 * "2026-07-02" → "2026년 7월 2일". 파싱 실패 시 "" 반환.
 *
 * `parseISO`가 아니라 `parse`를 쓰는 이유: `parseISO`는 "2026-07"이나
 * "2026-07-02T10:00:00Z"도 통과시킨다. `parse`는 형식을 정확히 강제한다.
 * 둘 다 로컬 자정으로 파싱되므로 `new Date("2026-07-02")`(UTC 자정)처럼
 * UTC 음수 오프셋 환경에서 하루 밀리는 문제가 없다.
 */
export function formatKoreanDate(date: string): string {
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return "";
  return format(parsed, "yyyy년 M월 d일");
}

/** ISO 타임스탬프 → "2026. 7. 2." (뷰어의 로컬 날짜 기준). 파싱 실패 시 "" 반환 */
export function formatKoreanDateShort(iso: string): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return "";
  return format(parsed, "yyyy. M. d.");
}
