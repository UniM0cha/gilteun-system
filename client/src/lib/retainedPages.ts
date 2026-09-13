export const CANVAS_CACHE_PAGE_LIMIT = 8;
export const CANVAS_CACHE_BYTE_TARGET = 64 * 1024 * 1024;

interface RetainedPageOptions {
  sheetIds: string[];
  currentId: string | null;
  targetId: string | null;
  recentIds: string[];
  bytesById: ReadonlyMap<string, number>;
  scratchBytes: number;
  byteTarget?: number;
  pageLimit?: number;
}

// Vector data lives for the worship session; only these raster surfaces are evictable.
// Current and incoming pages are protected, even on a display exceeding the soft budget.
export function selectRetainedPages({
  sheetIds,
  currentId,
  targetId,
  recentIds,
  bytesById,
  scratchBytes,
  byteTarget = CANVAS_CACHE_BYTE_TARGET,
  pageLimit = CANVAS_CACHE_PAGE_LIMIT,
}: RetainedPageOptions): string[] {
  const valid = new Set(sheetIds);
  const selected = new Set<string>();
  const estimate = bytesById.get(currentId ?? "") || 4 * 1024 * 1024;
  let bytes = scratchBytes || estimate;
  const add = (id: string | null | undefined, protectedPage = false) => {
    if (!id || !valid.has(id) || selected.has(id)) return;
    const size = bytesById.get(id) || estimate;
    if (!protectedPage && (selected.size >= pageLimit || bytes + size > byteTarget)) return;
    selected.add(id);
    bytes += size;
  };
  add(currentId, true);
  add(targetId, true);
  const index = currentId ? sheetIds.indexOf(currentId) : -1;
  if (index >= 0) {
    add(sheetIds[index + 1]);
    add(sheetIds[index - 1]);
  }
  recentIds.forEach((id) => add(id));
  // DOM order follows sheet order; page identity never depends on a current/preview slot.
  return sheetIds.filter((id) => selected.has(id));
}
