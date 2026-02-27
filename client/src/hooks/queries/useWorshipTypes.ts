import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { WorshipType } from "@/types";

export function useWorshipTypes() {
  return useQuery({
    queryKey: queryKeys.worshipTypes.all,
    queryFn: async () => {
      const { data } = await api.get<WorshipType[]>("/api/worship-types");
      return data;
    },
  });
}

export function useAddWorshipType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const { data: created } = await api.post<WorshipType>("/api/worship-types", data);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worshipTypes.all });
      toast.success("예배 유형이 추가되었습니다");
    },
  });
}

export function useUpdateWorshipType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; color: string }) => {
      await api.put(`/api/worship-types/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worshipTypes.all });
      toast.success("예배 유형이 수정되었습니다");
    },
  });
}

export function useDeleteWorshipType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/worship-types/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.worshipTypes.all });
      toast.success("예배 유형이 삭제되었습니다");
    },
  });
}
