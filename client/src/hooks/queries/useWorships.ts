import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { Worship, Sheet } from "@/types";

// --- Queries ---

export function useWorships() {
  return useQuery({
    queryKey: queryKeys.worships.all,
    queryFn: async () => {
      const { data } = await api.get<Worship[]>("/api/worships");
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
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.all });
      qc.invalidateQueries({ queryKey: queryKeys.worships.detail(variables.id) });
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
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.worships.detail(variables.worshipId) });
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
      qc.invalidateQueries({ queryKey: ["worships"] });
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
      qc.invalidateQueries({ queryKey: ["worships"] });
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
