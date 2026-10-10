// 카드 크기 변화(전체 화면 전환 등)에 따른 캔버스 재합성을 크기가 멈출 때까지 미루고,
// 멈춘 뒤에는 활성 페이지부터 한 프레임에 한 장씩 나눠 처리하는 공용 스케줄러.
//
// 예배의 모든 페이지 캔버스가 유지되므로(docs/canvas-retention.md) 크기가 바뀔 때마다
// 즉시 재합성하면 애니메이션 매 프레임에 페이지 수만큼 backing store를 재할당하게 된다.
// 카드는 항상 3:4라 기존 bitmap을 CSS가 등방으로 늘려 보여주므로 잠시 미뤄도 획이 어긋나지 않는다.

// 헤더·도구바 접힘 트랜지션(--dur-panel 300ms)보다 길어야 한다. 카드는 트랜지션 초반에 3:4 상한에
// 닿아 크기 변화가 먼저 멈추는데, 이 값이 짧으면 나머지 트랜지션 도중에 재합성이 끼어든다.
export const RESIZE_SETTLE_MS = 350;

interface Entry {
  run: () => void;
  isPriority: () => boolean;
}

const queue = new Set<Entry>();
let frameId = 0;

function flush() {
  frameId = 0;
  let ranOther = false;
  for (const entry of [...queue]) {
    if (entry.isPriority()) {
      queue.delete(entry);
      entry.run();
    } else if (!ranOther) {
      queue.delete(entry);
      entry.run();
      ranOther = true;
    }
  }
  if (queue.size > 0) frameId = requestAnimationFrame(flush);
}

export interface DeferredRedraw {
  // 크기 변화 알림 — 마지막 알림 후 RESIZE_SETTLE_MS가 지나면 재합성 대기열에 올린다
  notifyResize: () => void;
  // 대기 중인 재합성이 있으면 즉시 실행 (예: 숨은 페이지가 활성화될 때)
  flushNow: () => void;
  cancel: () => void;
}

export function createDeferredRedraw(run: () => void, isPriority: () => boolean): DeferredRedraw {
  const entry: Entry = { run, isPriority };
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    notifyResize() {
      clearTimer();
      queue.delete(entry);
      timer = setTimeout(() => {
        timer = null;
        queue.add(entry);
        if (!frameId) frameId = requestAnimationFrame(flush);
      }, RESIZE_SETTLE_MS);
    },
    flushNow() {
      if (timer === null && !queue.has(entry)) return;
      clearTimer();
      queue.delete(entry);
      run();
    },
    cancel() {
      clearTimer();
      queue.delete(entry);
    },
  };
}
