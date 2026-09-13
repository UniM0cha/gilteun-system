import type { Point } from "@/hooks/useDrawingSync";

type Move = { pathId: string; point: Point };

// Send at most once per 16ms, including the final position when input pauses.
// Each stroke owns its callback and cancels pending delivery before ending.
export function createDrawingMoveEmitter(send: (move: Move) => void) {
  let lastSent = -Infinity;
  let pending: Move | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    if (!pending) return;
    const move = pending;
    pending = null;
    lastSent = Date.now();
    send(move);
  };
  return {
    push(move: Move) {
      pending = move;
      const remaining = 16 - (Date.now() - lastSent);
      if (remaining <= 0) {
        if (timer !== null) clearTimeout(timer);
        flush();
      } else if (timer === null) {
        timer = setTimeout(flush, remaining);
      }
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}
