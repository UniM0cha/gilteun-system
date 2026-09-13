import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDrawingMoveEmitter } from "./drawingMoveEmitter";

describe("progress position delivery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => vi.useRealTimers());
  it("delivers the last point after a rapid movement even when no more input arrives", () => {
    const send = vi.fn();
    const emitter = createDrawingMoveEmitter(send);
    emitter.push({ pathId: "stroke", point: { x: 0.2, y: 0.6 } });
    for (const x of [0.25, 0.3, 0.4, 0.45]) emitter.push({ pathId: "stroke", point: { x, y: 0.6 } });
    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(15);
    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ pathId: "stroke", point: { x: 0.45, y: 0.6 } });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not send a delayed move after its stroke ends or is cancelled", () => {
    const send = vi.fn();
    const emitter = createDrawingMoveEmitter(send);
    emitter.push({ pathId: "old", point: { x: 0.2, y: 0.6 } });
    emitter.push({ pathId: "old", point: { x: 0.8, y: 0.6 } });
    emitter.cancel();
    vi.advanceTimersByTime(100);
    expect(send).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("keeps consecutive stroke callbacks and destinations independent", () => {
    const oldSend = vi.fn(),
      nextSend = vi.fn();
    const old = createDrawingMoveEmitter(oldSend);
    old.push({ pathId: "old", point: { x: 0.2, y: 0.6 } });
    old.push({ pathId: "old", point: { x: 0.8, y: 0.6 } });
    old.cancel();
    const next = createDrawingMoveEmitter(nextSend);
    next.push({ pathId: "next", point: { x: 0.3, y: 0.4 } });
    vi.advanceTimersByTime(100);
    expect(oldSend).toHaveBeenCalledTimes(1);
    expect(nextSend).toHaveBeenCalledTimes(1);
    expect(nextSend).toHaveBeenLastCalledWith({ pathId: "next", point: { x: 0.3, y: 0.4 } });
  });
});
