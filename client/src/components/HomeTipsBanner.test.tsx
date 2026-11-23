// @vitest-environment happy-dom
import { act, type HTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEATURE_TIPS, LATEST_TIP_VERSION } from "@/data/tips";
import { HomeTipsBanner } from "./HomeTipsBanner";

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => true,
}));

let container: HTMLDivElement;
let root: Root;

function installMemoryStorage(): void {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(window, "localStorage", {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  installMemoryStorage();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<HomeTipsBanner />);
  });
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  window.localStorage?.clear();
});

describe("HomeTipsBanner", () => {
  it("초기 렌더 시 NEW 배지와 최신 팁 제목을 표시한다", () => {
    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain("NEW");
    expect(trigger?.textContent).toContain(FEATURE_TIPS[0].title);
  });

  it("배너 클릭 시 모달이 열리고 localStorage 저장 후 배지가 팁으로 바뀐다", async () => {
    const trigger = container.querySelector("button");
    expect(trigger).not.toBeNull();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(window.localStorage.getItem("gilteun-seen-tips-version")).toBe(LATEST_TIP_VERSION);
    expect(trigger?.textContent).toContain("팁");
    expect(trigger?.textContent).not.toContain("NEW");

    expect(document.body.textContent).toContain(`1 / ${FEATURE_TIPS.length}`);
    expect(document.body.textContent).toContain(FEATURE_TIPS[0].steps![0].title);
  });

  it("다음·이전·점 인디케이터로 슬라이드를 이동하고 마지막에서 닫기 버튼으로 닫는다", async () => {
    const trigger = container.querySelector("button");
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const findBodyButton = (label: string) =>
      Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

    await act(async () => {
      findBodyButton("다음")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain(`2 / ${FEATURE_TIPS.length}`);
    expect(document.body.textContent).toContain(FEATURE_TIPS[1].title);

    await act(async () => {
      findBodyButton("이전")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain(`1 / ${FEATURE_TIPS.length}`);

    const lastDot = document.body.querySelector(`button[aria-label="${FEATURE_TIPS.length}번 팁 보기"]`);
    expect(lastDot).not.toBeNull();
    await act(async () => {
      lastDot?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.textContent).toContain(`${FEATURE_TIPS.length} / ${FEATURE_TIPS.length}`);

    const closeBtn = findBodyButton("닫기");
    expect(closeBtn).toBeDefined();
    await act(async () => {
      closeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(document.body.querySelector("[role='dialog']")).toBeNull();
  });
});
