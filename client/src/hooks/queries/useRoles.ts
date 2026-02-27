import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { Role } from "@/types";

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: async () => {
      const { data } = await api.get<Role[]>("/api/roles");
      return data;
    },
  });
}

export function useAddRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; icon: string }) => {
      const { data: created } = await api.post<Role>("/api/roles", data);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast.success("역할이 추가되었습니다");
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; icon: string }) => {
      await api.put(`/api/roles/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast.success("역할이 수정되었습니다");
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/roles/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast.success("역할이 삭제되었습니다");
    },
  });
}
