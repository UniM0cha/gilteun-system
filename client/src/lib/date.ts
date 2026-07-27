import { format, isValid, parse, parseISO } from "date-fns";

/**
 * "2026-07-02" → "2026년 7월 2일". 형식이 어긋나거나 없는 날짜면 "" 반환.
 *
 * 정규식과 `parse`를 함께 쓴다 — 한쪽만으로는 구멍이 남는다.
 * - 정규식: 자릿수를 강제한다. `parse`는 "2026-7-2"나 "26-07-02"(→ 0026년)도
 *   통과시키는데, 그런 값은 서버의 월 필터(`LIKE 'YYYY-MM-%'`)에서 누락되므로
 *   화면에만 멀쩡해 보이는 유령 데이터가 된다
 * - `parse`: 달력 유효성을 본다. 정규식만으로는 "2026-13-01"이나 "2026-02-31"이
 *   "2026년 13월 1일"처럼 그대로 렌더된다
 *
 * `parseISO`를 안 쓰는 이유는 "2026-07"이나 "2026-07-02T10:00:00Z"까지 통과시켜서다.
 * `parse`는 로컬 자정으로 파싱하므로 `new Date("2026-07-02")`(UTC 자정)처럼
 * UTC 음수 오프셋 환경에서 하루 밀리는 문제가 없다.
 *
 * "" 반환은 호출부의 계약이다 — `buildAutoTitle`은 "자동 제목을 만들지 않는다"는
 * 신호로, 예배 목록은 원문 표시 폴백(`|| worship.date`)으로 쓴다.
 */
export function formatKoreanDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
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
