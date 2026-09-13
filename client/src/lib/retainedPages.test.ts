import { describe, expect, it } from "vitest";
import { selectRetainedPages } from "./retainedPages";

const sheets = Array.from({ length: 20 }, (_, i) => `sheet-${i}`);
const base = {
  sheetIds: sheets,
  currentId: sheets[4],
  targetId: null,
  recentIds: [sheets[2], sheets[1], sheets[0]],
  bytesById: new Map<string, number>(),
  scratchBytes: 0,
};

describe("retained canvas pages", () => {
  it("keeps the current page, neighbors and recently visited pages", () => {
    expect(selectRetainedPages(base)).toEqual(sheets.slice(0, 6));
  });
  it("protects current and incoming surfaces even when they exceed the budget", () => {
    expect(selectRetainedPages({ ...base, targetId: sheets[19], byteTarget: 1 })).toEqual([sheets[4], sheets[19]]);
  });
  it("counts the shared scratch surface and evicts old raster pages first", () => {
    const bytesById = new Map(sheets.map((id) => [id, 10]));
    expect(selectRetainedPages({ ...base, bytesById, scratchBytes: 10, byteTarget: 40 })).toEqual(sheets.slice(3, 6));
  });
  it("limits long sessions without changing the complete sheet list", () => {
    expect(selectRetainedPages({ ...base, recentIds: [...sheets].reverse() })).toHaveLength(8);
    expect(sheets).toHaveLength(20);
  });
  it("drops deleted sheets and keys pages by ID after reordering", () => {
    expect(selectRetainedPages({ ...base, sheetIds: [sheets[5], sheets[4], sheets[3]], targetId: "deleted" })).toEqual([
      sheets[5],
      sheets[4],
      sheets[3],
    ]);
  });
});
