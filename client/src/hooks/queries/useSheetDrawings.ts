import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { DrawingPath } from "@/hooks/useDrawingSync";
import type { Sheet } from "@/types";

// 미리보기/시드용으로만 쓰는 스냅샷이라 짧게 — 전환 직후 소켓 drawing:state가 권위 데이터로 reconcile
const DRAWINGS_STALE_TIME = 1000 * 15;

async function fetchSheetDrawings(sheetId: string): Promise<DrawingPath[]> {
  const { data } = await api.get<DrawingPath[]>(`/api/sheets/${sheetId}/drawings`);
  return data;
}

// 특정 시트의 저장된 drawing path 조회 (전환 미리보기에서 사용)
export function useSheetDrawings(sheetId: string | null) {
  return useQuery({
    queryKey: queryKeys.drawings.bySheet(sheetId ?? ""),
    queryFn: () => fetchSheetDrawings(sheetId!),
    enabled: !!sheetId,
    staleTime: DRAWINGS_STALE_TIME,
  });
}

// 인접(이전/다음) 시트의 drawing을 미리 캐시에 적재 — useAdjacentSheetPreload(이미지)와 동일 패턴
export function useAdjacentDrawingsPreload(sheets: Sheet[], currentPage: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const candidates = [sheets[currentPage - 1], sheets[currentPage + 1]].filter((sheet): sheet is Sheet =>
      Boolean(sheet),
    );

    for (const sheet of candidates) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.drawings.bySheet(sheet.id),
        queryFn: () => fetchSheetDrawings(sheet.id),
        staleTime: DRAWINGS_STALE_TIME,
      });
    }
  }, [sheets, currentPage, queryClient]);
}
