// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SheetCanvas from "@/components/SheetCanvas";

let root: Root;
let host: HTMLDivElement;
let props: ComponentProps<typeof SheetCanvas>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let ready: ReturnType<typeof vi.fn<(sheetId: string, ready: boolean) => void>>;
let stroke: ReturnType<typeof vi.fn>;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  frames = new Map();
  nextFrame = 0;
  ready = vi.fn();
  stroke = vi.fn();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, "offsetWidth", "get").mockReturnValue(300);
  vi.spyOn(HTMLCanvasElement.prototype, "offsetHeight", "get").mockReturnValue(400);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 300, 400));
  vi.spyOn(HTMLCanvasElement.prototype, "setPointerCapture").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "hasPointerCapture").mockReturnValue(false);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke,
  } as unknown as CanvasRenderingContext2D);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  props = {
    sheetId: "one",
    imageUrl: null,
    isDrawMode: true,
    penColor: "#000000",
    penWidth: 3,
    isHighlighter: false,
    eraserType: "none",
    eraserWidth: 15,
    paths: [],
    remoteInProgress: [],
    penOnly: false,
    profileId: "me",
    onReadyChange: ready,
  };
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(updates: Partial<ComponentProps<typeof SheetCanvas>> = {}) {
  props = { ...props, ...updates };
  await act(() => root.render(<SheetCanvas {...props} />));
}

it("keeps readiness stable while local pointer frames update completed pixels", async () => {
  await render();
  expect(ready).toHaveBeenLastCalledWith("one", true);
  ready.mockClear();
  const canvas = host.querySelector("canvas")!;
  await act(() => {
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "pen", clientX: 10, clientY: 10 }),
    );
  });
  for (let step = 1; step <= 8; step++) {
    await act(() => {
      canvas.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          pointerId: 1,
          pointerType: "pen",
          clientX: 10 + step * 10,
          clientY: 10 + step * 10,
        }),
      );
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((frame) => frame(step * 16));
    });
  }
  expect(stroke).toHaveBeenCalledTimes(8);
  expect(ready).not.toHaveBeenCalled();
});

it("still reports real loss and recovery of drawing readiness", async () => {
  await render();
  ready.mockClear();
  await render({ drawingsReady: false });
  expect(ready.mock.calls).toEqual([["one", false]]);
  await render({ drawingsReady: true });
  expect(ready.mock.calls).toEqual([
    ["one", false],
    ["one", true],
  ]);
});

it("reports a failed composition context as unready", async () => {
  await render();
  ready.mockClear();
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);
  await render({ paths: [] });
  expect(ready.mock.calls).toEqual([["one", false]]);
});
