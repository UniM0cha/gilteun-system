import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "./useSocket";
import { queryKeys } from "@/lib/queryKeys";
import type { Worship, Sheet } from "@/types";

export function useWorshipSocket(worshipId: string | undefined, onSheetsUpdated?: (sheets: Sheet[]) => void) {
  const qc = useQueryClient();
  const callbackRef = useRef(onSheetsUpdated);
  callbackRef.current = onSheetsUpdated;

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

    socket.on("sheets:updated", handleSheetsUpdated);
    socket.on("worship:updated", handleWorshipUpdated);

    return () => {
      socket.off("sheets:updated", handleSheetsUpdated);
      socket.off("worship:updated", handleWorshipUpdated);
    };
  }, [worshipId, qc]);
}
