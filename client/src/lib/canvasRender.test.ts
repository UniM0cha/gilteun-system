import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCanvasRenderSize,
  getSharedCanvasRenderBytes,
  renderCanvasAtomically,
  retainSharedCanvasRenderer,
} from "./canvasRender";

function mockCanvas(label: string, events: string[], cssWidth = 300, cssHeight = 400) {
  let width = 300;
  let height = 150;
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(() => events.push(`${label}:clear`)),
    drawImage: vi.fn(() => events.push(`${label}:copy:${context.globalCompositeOperation}`)),
    globalCompositeOperation: "source-over",
    globalAlpha: 1,
  };
  const element = {
    offsetWidth: cssWidth,
    offsetHeight: cssHeight,
    get width() {
      return width;
    },
    set width(value: number) {
      events.push(`${label}:width:${value}`);
      width = value;
    },
    get height() {
      return height;
    },
    set height(value: number) {
      events.push(`${label}:height:${value}`);
      height = value;
    },
    getContext: vi.fn(() => context),
  };
  return { canvas: element as unknown as HTMLCanvasElement, element, context };
}

describe("atomic retained-page rendering", () => {
  let events: string[];
  let scratch: ReturnType<typeof mockCanvas>;
  let releases: Array<() => void>;

  beforeEach(() => {
    events = [];
    releases = [retainSharedCanvasRenderer()];
    scratch = mockCanvas("scratch", events);
    vi.stubGlobal("window", { devicePixelRatio: 2 });
    vi.stubGlobal("document", { createElement: vi.fn(() => scratch.canvas) });
  });

  afterEach(() => {
    releases.forEach((release) => release());
    vi.unstubAllGlobals();
  });

  it("finishes composition before resizing or replacing the visible bitmap", () => {
    const page = mockCanvas("page", events);
    const size = getCanvasRenderSize(page.canvas)!;
    const bytes = renderCanvasAtomically(page.canvas, size, (context, rect) => {
      events.push("composition:complete");
      expect(context).toBe(scratch.context);
      expect(rect).toEqual({ x: 0, y: 0, width: 300, height: 400 });
      expect(page.canvas.width).toBe(300);
      expect(page.context.drawImage).not.toHaveBeenCalled();
    });
    expect(bytes).toBe(600 * 800 * 4);
    expect(events).toEqual([
      "scratch:width:600",
      "scratch:height:800",
      "scratch:clear",
      "composition:complete",
      "page:width:600",
      "page:height:800",
      "page:copy:copy",
    ]);
    expect(page.context.clearRect).not.toHaveBeenCalled();
    expect(scratch.context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    expect(page.context.globalCompositeOperation).toBe("source-over");
  });

  it("replaces erased transparent pixels without resetting a correctly sized canvas", () => {
    const page = mockCanvas("page", events);
    const size = getCanvasRenderSize(page.canvas)!;
    renderCanvasAtomically(page.canvas, size, () => {});
    events.length = 0;
    renderCanvasAtomically(page.canvas, size, (context) => {
      context.globalCompositeOperation = "destination-out";
      context.globalAlpha = 0.35;
    });
    expect(events).toEqual(["scratch:clear", "page:copy:copy"]);
    expect(page.context.globalAlpha).toBe(1);
    expect(page.context.clearRect).not.toHaveBeenCalled();
  });

  it("keeps the prior visible bitmap when composition fails", () => {
    const page = mockCanvas("page", events);
    expect(() =>
      renderCanvasAtomically(page.canvas, getCanvasRenderSize(page.canvas)!, () => {
        throw new Error("composition failed");
      }),
    ).toThrow("composition failed");
    expect(page.canvas.width).toBe(300);
    expect(page.canvas.height).toBe(150);
    expect(page.context.drawImage).not.toHaveBeenCalled();
    expect(page.context.clearRect).not.toHaveBeenCalled();
  });

  it("preserves pixels when layout temporarily reports zero size", () => {
    const page = mockCanvas("page", events, 0, 0);
    expect(getCanvasRenderSize(page.canvas)).toBeNull();
    expect(page.canvas.width).toBe(300);
    expect(page.canvas.height).toBe(150);
    expect(events).toEqual([]);
  });

  it("uses CSS layout dimensions at the latest DPR without using transformed bounds", () => {
    const page = mockCanvas("page", events, 390, 520);
    vi.stubGlobal("window", { devicePixelRatio: 3 });
    const size = getCanvasRenderSize(page.canvas)!;
    expect(size.width).toBe(1170);
    expect(size.height).toBe(1560);
    renderCanvasAtomically(page.canvas, size, () => {});
    expect(scratch.context.setTransform).toHaveBeenLastCalledWith(3, 0, 0, 3, 0, 0);
  });

  it("shares one composition buffer and frees it only after the last page leaves", () => {
    const secondRelease = retainSharedCanvasRenderer();
    releases.push(secondRelease);
    const first = mockCanvas("first", events);
    const second = mockCanvas("second", events);
    renderCanvasAtomically(first.canvas, getCanvasRenderSize(first.canvas)!, () => {});
    renderCanvasAtomically(second.canvas, getCanvasRenderSize(second.canvas)!, () => {});
    expect(document.createElement).toHaveBeenCalledTimes(1);
    expect(getSharedCanvasRenderBytes()).toBe(600 * 800 * 4);
    releases[0]();
    expect(getSharedCanvasRenderBytes()).toBe(600 * 800 * 4);
    secondRelease();
    expect(getSharedCanvasRenderBytes()).toBe(0);
    expect(scratch.canvas.width).toBe(0);
    expect(scratch.canvas.height).toBe(0);
  });
});
