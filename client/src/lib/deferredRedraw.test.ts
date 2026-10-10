import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESIZE_SETTLE_MS, createDeferredRedraw } from "./deferredRedraw";

describe("deferred resize redraw", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // node 환경엔 rAF가 없다 — 가짜 타이머 위에서 16ms 프레임으로 흉내낸다
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("waits until resizing stops, then redraws once", () => {
    const run = vi.fn();
    const redraw = createDeferredRedraw(run, () => true);
    for (let i = 0; i < 18; i++) {
      redraw.notifyResize();
      vi.advanceTimersByTime(16);
    }
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(RESIZE_SETTLE_MS + 16);
    expect(run).toHaveBeenCalledTimes(1);
    redraw.cancel();
  });

  it("redraws the active page first and the hidden pages one per frame", () => {
    const order: string[] = [];
    const pages = ["a", "b", "c"].map((id) =>
      createDeferredRedraw(
        () => order.push(id),
        () => id === "c",
      ),
    );
    pages.forEach((page) => page.notifyResize());
    vi.advanceTimersByTime(RESIZE_SETTLE_MS);
    vi.advanceTimersByTime(16);
    expect(order).toEqual(["c"]);
    vi.advanceTimersByTime(16);
    expect(order).toEqual(["c", "a"]);
    vi.advanceTimersByTime(16);
    expect(order).toEqual(["c", "a", "b"]);
    vi.advanceTimersByTime(16);
    expect(order).toHaveLength(3);
  });

  it("flushes a pending redraw immediately and only when one is pending", () => {
    const run = vi.fn();
    const redraw = createDeferredRedraw(run, () => false);
    redraw.flushNow();
    expect(run).not.toHaveBeenCalled();
    redraw.notifyResize();
    redraw.flushNow();
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(RESIZE_SETTLE_MS * 2);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
