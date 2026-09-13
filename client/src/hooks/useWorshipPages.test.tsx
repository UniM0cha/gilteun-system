// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it } from "vitest";
import type { Sheet } from "@/types";
import { useWorshipPages } from "./useWorshipPages";

let root: Root;
let sheets: Sheet[];
let current: ReturnType<typeof useWorshipPages>;
function Harness() {
  current = useWorshipPages(sheets);
  return null;
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  sheets = Array.from({ length: 10 }, (_, index) => ({
    id: `page-${index}`,
    order: index,
    worshipId: "w",
    title: `${index}`,
    imagePath: `${index}.png`,
    fileName: `${index}.png`,
    createdAt: "2026-09-13",
  }));
  root = createRoot(document.createElement("div"));
  await act(() => root.render(<Harness />));
});
afterEach(async () => {
  await act(() => root.unmount());
});

it("keeps every prepared page regardless of the former raster memory budget", async () => {
  await act(() => {
    sheets.forEach((sheet) => {
      current.onRenderMetrics(sheet.id, 12 * 1024 * 1024);
      current.onReadyChange(sheet.id, true);
    });
  });
  expect(current.preparedIds.size).toBe(10);
  expect(current.readyIds.size).toBe(10);
});

it("keeps a completed image visible while its render size is being refreshed", async () => {
  await act(() => current.onReadyChange("page-0", true));
  await act(() => current.onReadyChange("page-0", false));
  expect(current.readyIds.has("page-0")).toBe(false);
  expect(current.preparedIds.has("page-0")).toBe(true);
});

it("allows the remaining pages to prepare when the first image fails", async () => {
  await act(() => {
    current.onLoadError("page-0");
    sheets.slice(1).forEach((sheet) => current.onReadyChange(sheet.id, true));
  });
  expect(current.failedIds.has("page-0")).toBe(true);
  expect(current.preparedIds.size).toBe(9);
  await act(() => current.retryImage("page-0"));
  expect(current.imageAttempts["page-0"]).toBe(1);
  expect(current.preparedIds.has("page-0")).toBe(false);
  await act(() => current.onReadyChange("page-0", true));
  expect(current.failedIds.size).toBe(0);
  expect(current.preparedIds.size).toBe(10);
});

it("preserves pages when reordered and drops deleted pages plus their late callbacks", async () => {
  await act(() => sheets.forEach((sheet) => current.onReadyChange(sheet.id, true)));
  sheets = [...sheets].reverse();
  await act(() => root.render(<Harness />));
  expect(current.preparedIds.size).toBe(10);
  sheets = sheets.filter((sheet) => sheet.id !== "page-0");
  await act(() => root.render(<Harness />));
  await act(() => {
    current.onReadyChange("page-0", true);
    current.onLoadError("page-0");
  });
  expect(current.preparedIds.size).toBe(9);
  expect(current.preparedIds.has("page-0")).toBe(false);
  expect(current.failedIds.has("page-0")).toBe(false);
});
