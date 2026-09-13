import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sheet } from "@/types";

interface PagePreparation {
  ready: boolean;
  prepared: boolean;
  failed: boolean;
  imageAttempt: number;
}
const EMPTY: PagePreparation = { ready: false, prepared: false, failed: false, imageAttempt: 0 };

// Every page belongs to the worship session. Navigation never removes a surface
// or changes preparation state; only deletion and leaving the viewer release it.
export function useWorshipPages(sheets: Sheet[]) {
  const [states, setStates] = useState<ReadonlyMap<string, PagePreparation>>(new Map());
  const sheetIds = useMemo(() => new Set(sheets.map((sheet) => sheet.id)), [sheets]);
  const validIds = useRef(sheetIds);
  validIds.current = sheetIds;

  useEffect(() => {
    setStates((previous) => {
      const next = new Map([...previous].filter(([id]) => sheetIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [sheetIds]);

  const update = useCallback((id: string, change: Partial<PagePreparation>) => {
    if (!validIds.current.has(id)) return;
    setStates((previous) => {
      const before = previous.get(id) ?? EMPTY;
      const next = { ...before, ...change };
      if (
        next.ready === before.ready &&
        next.prepared === before.prepared &&
        next.failed === before.failed &&
        next.imageAttempt === before.imageAttempt
      )
        return previous;
      return new Map(previous).set(id, next);
    });
  }, []);

  const onReadyChange = useCallback(
    (id: string, ready: boolean) => {
      update(id, ready ? { ready: true, prepared: true, failed: false } : { ready: false });
    },
    [update],
  );
  const onRenderMetrics = useCallback(
    (id: string, bytes: number) => {
      if (bytes === 0) update(id, { ready: false, prepared: false });
    },
    [update],
  );
  const onLoadError = useCallback((id: string) => update(id, { ready: false, failed: true }), [update]);
  const retryImage = useCallback((id: string) => {
    if (!validIds.current.has(id)) return;
    setStates((previous) => {
      const before = previous.get(id) ?? EMPTY;
      return new Map(previous).set(id, { ...before, failed: false, imageAttempt: before.imageAttempt + 1 });
    });
  }, []);

  const preparation = useMemo(() => {
    const readyIds = new Set<string>();
    const preparedIds = new Set<string>();
    const failedIds = new Set<string>();
    const imageAttempts: Record<string, number> = {};
    for (const [id, state] of states) {
      if (!sheetIds.has(id)) continue;
      if (state.ready) readyIds.add(id);
      if (state.prepared) preparedIds.add(id);
      if (state.failed) failedIds.add(id);
      imageAttempts[id] = state.imageAttempt;
    }
    return { readyIds, preparedIds, failedIds, imageAttempts };
  }, [states, sheetIds]);

  return { ...preparation, onReadyChange, onRenderMetrics, onLoadError, retryImage };
}
