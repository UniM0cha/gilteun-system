import { fullRect, getCanvasContentRect, type ContentRect } from "@/lib/canvas";

// All retained pages share one synchronous composition buffer. A page keeps only
// its displayed pixels; no per-page back buffer doubles the viewer's memory.
let sharedBuffer: HTMLCanvasElement | null = null;
let rendererUsers = 0;

export function retainSharedCanvasRenderer(): () => void {
  rendererUsers += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    rendererUsers -= 1;
    if (rendererUsers === 0 && sharedBuffer) {
      sharedBuffer.width = 0;
      sharedBuffer.height = 0;
      sharedBuffer = null;
    }
  };
}

export function getSharedCanvasRenderBytes(): number {
  return sharedBuffer ? sharedBuffer.width * sharedBuffer.height * 4 : 0;
}

export interface CanvasRenderSize {
  rect: ContentRect;
  dpr: number;
  width: number;
  height: number;
}

export function getCanvasRenderSize(canvas: HTMLCanvasElement): CanvasRenderSize | null {
  const rect = getCanvasContentRect(canvas);
  if (rect.width <= 0 || rect.height <= 0) return null;
  const dpr = window.devicePixelRatio || 1;
  return {
    rect,
    dpr,
    width: Math.max(1, Math.round(rect.width * dpr)),
    height: Math.max(1, Math.round(rect.height * dpr)),
  };
}

// Do not reset or clear the visible canvas while composition is in progress.
// Copy the complete transparent bitmap in one operation, including erased pixels.
// If its backing size must change, resize and copy in the same synchronous task.
export function renderCanvasAtomically(
  canvas: HTMLCanvasElement,
  size: CanvasRenderSize,
  paint: (context: CanvasRenderingContext2D, rect: ContentRect) => void,
): number | null {
  if (size.rect.width <= 0 || size.rect.height <= 0) return null;
  const destination = canvas.getContext("2d");
  if (!destination) return null;
  sharedBuffer ??= document.createElement("canvas");
  const buffer = sharedBuffer;
  if (buffer.width !== size.width || buffer.height !== size.height) {
    buffer.width = size.width;
    buffer.height = size.height;
  }
  const composition = buffer.getContext("2d");
  if (!composition) return null;
  composition.setTransform(1, 0, 0, 1, 0, 0);
  composition.globalCompositeOperation = "source-over";
  composition.globalAlpha = 1;
  composition.clearRect(0, 0, size.width, size.height);
  composition.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  paint(composition, fullRect(size.rect.width, size.rect.height));

  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  destination.setTransform(1, 0, 0, 1, 0, 0);
  destination.globalAlpha = 1;
  destination.globalCompositeOperation = "copy";
  destination.drawImage(buffer, 0, 0);
  destination.globalCompositeOperation = "source-over";
  return size.width * size.height * 4;
}
