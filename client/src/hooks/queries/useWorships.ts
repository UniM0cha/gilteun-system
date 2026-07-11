import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { Worship, Sheet, WorshipPage } from "@/types";

// --- Queries ---

export interface WorshipListFilters {
  typeId?: string;
  q?: string;
  year?: string;
  month?: string;
  limit?: number;
}

// 무한 스크롤 목록 — 서버 페이지네이션. 필터는 queryKey에 포함되어 변경 시 자동 재조회
export function useWorships(filters: WorshipListFilters = {}) {
  const { typeId = "", q = "", year = "", month = "", limit = 20 } = filters;
  return useInfiniteQuery({
    queryKey: queryKeys.worships.list({ typeId, q, year, month, limit }),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("limit", String(limit));
      if (typeId) params.set("typeId", typeId);
      if (q) params.set("q", q);
      if (year) params.set("year", year);
      if (month) params.set("month", month);
      const { data } = await api.get<WorshipPage>(`/api/worships?${params.toString()}`);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

// 연도 목록 (필터 드롭다운용)
export function useWorshipYears() {
  return useQuery({
    queryKey: queryKeys.worships.years,
    queryFn: async () => {
      const { data } = await api.get<number[]>("/api/worships/years");
      return data;
    },
  });
}

export function useWorship(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.worships.detail(id!),
    queryFn: async () => {
      const { data } = await api.get<Worship>(`/api/worships/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// --- Worship Mutations ---

export function useAddWorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; date: string; typeId: string }) => {
      const { data: created } = await api.post<Worship>("/api/worships", data);
      return { ...created, sheets: [] as Sheet[] };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      toast.success("예배가 생성되었습니다");
    },
  });
}

export function useUpdateWorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; date?: string; typeId?: string }) => {
      await api.put(`/api/worships/${id}`, data);
    },
    onSuccess: () => {
      // all(['worships'])은 detail(['worships', id])의 prefix라 detail까지 함께 무효화됨
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      toast.success("예배가 수정되었습니다");
    },
  });
}

export function useDeleteWorship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/worships/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      toast.success("예배가 삭제되었습니다");
    },
  });
}

// --- Sheet Mutations ---

export function useAddSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ worshipId, file, title }: { worshipId: string; file: File; title: string }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("title", title);
      const { data } = await api.post<Sheet>(`/api/worships/${worshipId}/sheets`, formData);
      return data;
    },
    onSuccess: () => {
      // 목록의 '악보 N개' 카운트도 영향받으므로 useDeleteSheet와 대칭으로 all 무효화
      // (all이 detail의 prefix라 detail도 함께 커버됨)
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
    },
  });
}

export function useUpdateSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await api.put(`/api/sheets/${id}`, { title });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      toast.success("악보 제목이 수정되었습니다");
    },
  });
}

export function useDeleteSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/sheets/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      toast.success("악보가 삭제되었습니다");
    },
  });
}

export function useReorderSheets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ worshipId, orderedIds }: { worshipId: string; orderedIds: string[] }) => {
      await api.put(`/api/worships/${worshipId}/sheets/order`, { orderedIds });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.detail(variables.worshipId) });
    },
  });
}
