// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import type { Sheet } from "@/types";
import { useRetainedSheetPages } from "./useRetainedSheetPages";

it("eviction removes paint readiness while keeping a measurement for remounting", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const sheets: Sheet[] = ["one", "two"].map((id, order) => ({
    id,
    order,
    worshipId: "w",
    title: id,
    imagePath: id,
    fileName: id,
    createdAt: "2026-09-13",
  }));
  let current!: ReturnType<typeof useRetainedSheetPages>;
  function Harness() {
    current = useRetainedSheetPages(sheets, "one", null);
    return null;
  }
  const root = createRoot(document.createElement("div"));
  await act(() => root.render(<Harness />));
  await act(() => {
    current.onReadyChange("one", true);
    current.onRenderMetrics("one", 1024);
  });
  expect(current.displayedIds.has("one")).toBe(true);
  await act(() => current.onRenderMetrics("one", 0));
  expect(current.readyIds.has("one")).toBe(false);
  expect(current.displayedIds.has("one")).toBe(false);
  expect(current.firstPageReady).toBe(true);
  await act(() => root.unmount());
});
