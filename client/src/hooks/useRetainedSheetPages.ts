import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sheet } from "@/types";
import { selectRetainedPages } from "@/lib/retainedPages";
import { getSharedCanvasRenderBytes } from "@/lib/canvasRender";

export function useRetainedSheetPages(sheets: Sheet[], currentId: string | null, targetId: string | null) {
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [readyIds, setReadyIds] = useState<ReadonlySet<string>>(new Set());
  const [displayedIds, setDisplayedIds] = useState<ReadonlySet<string>>(new Set());
  const [failedIds, setFailedIds] = useState<ReadonlySet<string>>(new Set());
  const [imageAttempts, setImageAttempts] = useState<Record<string, number>>({});
  const [bytesById, setBytesById] = useState<ReadonlyMap<string, number>>(new Map());
  const [scratchBytes, setScratchBytes] = useState(0);
  const [firstPageReady, setFirstPageReady] = useState(false);
  const currentRef = useRef(currentId);
  currentRef.current = currentId;

  useEffect(() => {
    const valid = new Set(sheets.map((sheet) => sheet.id));
    setRecentIds((prev) => [
      ...(currentId ? [currentId] : []),
      ...prev.filter((id) => id !== currentId && valid.has(id)),
    ]);
  }, [sheets, currentId]);

  const retainedIds = useMemo(
    () =>
      selectRetainedPages({
        sheetIds: sheets.map((sheet) => sheet.id),
        currentId,
        targetId,
        recentIds,
        bytesById,
        scratchBytes,
      }),
    [sheets, currentId, targetId, recentIds, bytesById, scratchBytes],
  );

  const onReadyChange = useCallback((sheetId: string, ready: boolean) => {
    setReadyIds((prev) => {
      if (prev.has(sheetId) === ready) return prev;
      const next = new Set(prev);
      if (ready) next.add(sheetId);
      else next.delete(sheetId);
      return next;
    });
    if (ready) {
      if (sheetId === currentRef.current) setFirstPageReady(true);
      setDisplayedIds((prev) => (prev.has(sheetId) ? prev : new Set([...prev, sheetId])));
      setFailedIds((prev) => {
        if (!prev.has(sheetId)) return prev;
        const next = new Set(prev);
        next.delete(sheetId);
        return next;
      });
    }
  }, []);

  const onRenderMetrics = useCallback(
    (sheetId: string, bytes: number) => {
      // Keep the last measurement as the estimate after eviction; don't remount an
      // over-budget neighbor repeatedly just because its live allocation became zero.
      if (bytes > 0) setBytesById((prev) => (prev.get(sheetId) === bytes ? prev : new Map(prev).set(sheetId, bytes)));
      else {
        onReadyChange(sheetId, false);
        setDisplayedIds((prev) => {
          if (!prev.has(sheetId)) return prev;
          const next = new Set(prev);
          next.delete(sheetId);
          return next;
        });
      }
      setScratchBytes(getSharedCanvasRenderBytes());
    },
    [onReadyChange],
  );

  const onLoadError = useCallback(
    (sheetId: string) => {
      onReadyChange(sheetId, false);
      setFailedIds((prev) => (prev.has(sheetId) ? prev : new Set([...prev, sheetId])));
    },
    [onReadyChange],
  );

  const retryImage = useCallback((sheetId: string) => {
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.delete(sheetId);
      return next;
    });
    setImageAttempts((prev) => ({ ...prev, [sheetId]: (prev[sheetId] ?? 0) + 1 }));
  }, []);

  return {
    retainedIds,
    readyIds,
    displayedIds,
    failedIds,
    imageAttempts,
    firstPageReady,
    onReadyChange,
    onRenderMetrics,
    onLoadError,
    retryImage,
  };
}
