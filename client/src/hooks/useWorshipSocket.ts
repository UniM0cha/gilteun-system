import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./useSocket";
import { queryKeys } from "@/lib/queryKeys";
import type { Worship, Sheet } from "@/types";

export function useWorshipSocket(
  worshipId: string | undefined,
  onSheetsUpdated?: (sheets: Sheet[]) => void,
  onWorshipDeleted?: () => void,
) {
  const qc = useQueryClient();
  const callbackRef = useRef(onSheetsUpdated);
  callbackRef.current = onSheetsUpdated;
  const deletedCallbackRef = useRef(onWorshipDeleted);
  deletedCallbackRef.current = onWorshipDeleted;

  useEffect(() => {
    if (!worshipId) return;

    const socket = getSocket();

    const handleSheetsUpdated = (data: { worshipId: string; sheets: Sheet[] }) => {
      if (data.worshipId !== worshipId) return;
      qc.setQueryData<Worship>(queryKeys.worships.detail(worshipId), (prev) => {
        if (!prev) return prev;
        return { ...prev, sheets: data.sheets };
      });
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      callbackRef.current?.(data.sheets);
    };

    const handleWorshipUpdated = (data: { worshipId: string; worship: Partial<Worship> }) => {
      if (data.worshipId !== worshipId) return;
      qc.setQueryData<Worship>(queryKeys.worships.detail(worshipId), (prev) => {
        if (!prev) return prev;
        return { ...prev, ...data.worship };
      });
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
    };

    const handleWorshipDeleted = (data: { worshipId: string }) => {
      if (data.worshipId !== worshipId) return;
      deletedCallbackRef.current?.();
      // 캐시 정리는 홈 내비게이션 커밋 이후로 지연 — 관찰 중인 useWorship(id)가 남아 있는
      // 상태에서 remove/invalidate하면 삭제된 예배를 즉시 재조회(404)하는 레이스가 생긴다
      setTimeout(() => {
        qc.removeQueries({ queryKey: queryKeys.worships.detail(worshipId) });
        qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      }, 0);
    };

    socket.on("sheets:updated", handleSheetsUpdated);
    socket.on("worship:updated", handleWorshipUpdated);
    socket.on("worship:deleted", handleWorshipDeleted);

    return () => {
      socket.off("sheets:updated", handleSheetsUpdated);
      socket.off("worship:updated", handleWorshipUpdated);
      socket.off("worship:deleted", handleWorshipDeleted);
    };
  }, [worshipId, qc]);
}
