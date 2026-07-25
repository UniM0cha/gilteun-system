/**
 * "2026-07-02" → "2026년 7월 2일". 형식이 맞지 않으면 "" 반환.
 *
 * Date 객체를 쓰지 않는 이유: `new Date("2026-07-02")`는 ES 스펙상 UTC 자정으로
 * 파싱된다. KST(UTC+9)에선 우연히 같은 날이 나오지만 UTC 음수 오프셋 환경에선
 * 하루 밀린다. YYYY-MM-DD는 이미 사람이 읽는 형태라 문자열 분해가 타임존에 무관하다.
 */
export function formatKoreanDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}
