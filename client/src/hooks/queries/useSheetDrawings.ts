import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { DrawingPath } from "@/hooks/useDrawingSync";
import type { Sheet } from "@/types";

// 미리보기/시드용으로만 쓰는 스냅샷이라 짧게 — 전환 직후 소켓 drawing:state가 권위 데이터로 reconcile
const DRAWINGS_STALE_TIME = 1000 * 15;
// prefetch된 인접 시트 캐시는 observer가 없어 즉시 inactive — 기본 gcTime(5분)이면
// 한 곡에 오래 머문 뒤 페이지 전환 시 useDrawingSync의 getQueryData seed가 GC로 사라져
// 소켓 스냅샷 도착까지 획이 빈 채로 깜빡인다. 예배 화면에 머무는 동안은 GC하지 않고,
// 누적 방지는 useAdjacentDrawingsPreload의 unmount 정리(예배 이탈 시 전체 제거)가 맡는다.
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

  // 예배 이탈 시 drawings 캐시 전체 정리 — gcTime Infinity라 방문하지 않은 인접 시트의
  // prefetch 잔여분은 useDrawingSync의 시트 단위 removeQueries에 걸리지 않고 세션 내내 쌓인다
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
