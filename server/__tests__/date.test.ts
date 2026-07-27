import { describe, it, expect } from "vitest";
import { nowIso } from "../lib/date.js";

// nowIso()의 계약: Date.prototype.toISOString()과 **바이트 단위로 동일한** 문자열.
//
// created_at/updated_at은 worships.ts의 `orderBy(desc(...))` 사전순 정렬에 쓰인다.
// 형식이 한 글자라도 달라지면 기존 행과 섞이면서 정렬이 조용히 틀어지고,
// 이미 배포된 DB의 데이터와 어긋난다. date-fns의 formatISO()는 로컬
// 오프셋(+09:00) 형식에 밀리초도 없어 여기 쓸 수 없다 — 그래서 TZDate + 명시적
// 포맷을 쓰며, 이 테스트가 그 등가성을 지킨다.

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("nowIso", () => {
  it("toISOString()과 동일한 형식이다", () => {
    expect(nowIso()).toMatch(ISO_UTC);
  });

  it("항상 24자다", () => {
    expect(nowIso()).toHaveLength(24);
  });

  it("현재 시각을 UTC로 찍는다", () => {
    const before = Date.now();
    const value = nowIso();
    const after = Date.now();

    const parsed = Date.parse(value);
    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before - 1);
    expect(parsed).toBeLessThanOrEqual(after + 1);
  });

  it("같은 순간에 대해 toISOString()과 글자까지 일치한다", () => {
    // nowIso()는 인자를 받지 않으므로 두 값을 연속 호출해 밀리초가 같을 때만 비교.
    // 최대 50회 시도하면 같은 밀리초에 걸리는 케이스가 사실상 항상 나온다.
    let compared = 0;
    for (let i = 0; i < 50; i++) {
      const a = new Date().toISOString();
      const b = nowIso();
      if (a.slice(0, 23) === b.slice(0, 23)) {
        expect(b).toBe(a);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });

  it("사전순 정렬이 시간순과 일치한다", async () => {
    const first = nowIso();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = nowIso();

    expect(first < second).toBe(true);
    expect([second, first].sort()).toEqual([first, second]);
  });
});
