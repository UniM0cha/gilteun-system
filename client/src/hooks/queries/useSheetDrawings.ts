import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { DrawingPath } from "@/hooks/useDrawingSync";
import type { Sheet } from "@/types";

// HTTP fallback 스냅샷의 유효기간. 예배 뷰어는 useDrawingSync의 예배 단위
// 소켓 저장소를 사용하며, 이 캐시는 아직 모르는 페이지를 처음 채울 때만 참고한다.
const DRAWINGS_STALE_TIME = 1000 * 15;
// 예배를 떠날 때 useDrawingSync가 정리한다. 페이지를 넘길 때는 삭제하지 않는다.
const DRAWINGS_GC_TIME = Infinity;

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
    gcTime: DRAWINGS_GC_TIME,
  });
}

// 인접(이전/다음) 시트의 drawing을 미리 캐시에 적재 — useAdjacentSheetPreload(이미지)와 동일 패턴
export function useAdjacentDrawingsPreload(sheets: Sheet[], currentPage: number) {
  const queryClient = useQueryClient();

  // 이 HTTP fallback 훅을 단독으로 사용하는 화면에서도 이탈 시 캐시를 정리한다.
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: queryKeys.drawings.all });
    };
  }, [queryClient]);

  useEffect(() => {
    const candidates = [sheets[currentPage - 1], sheets[currentPage + 1]].filter((sheet): sheet is Sheet =>
      Boolean(sheet),
    );

    for (const sheet of candidates) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.drawings.bySheet(sheet.id),
        queryFn: () => fetchSheetDrawings(sheet.id),
        staleTime: DRAWINGS_STALE_TIME,
        gcTime: DRAWINGS_GC_TIME,
      });
    }
  }, [sheets, currentPage, queryClient]);
}
