import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { Command, ProfileCommandOrder } from "@/types";

export function useCommands(profileId?: string) {
  return useQuery({
    queryKey: queryKeys.commands.list(profileId),
    queryFn: async () => {
      const { data } = await api.get<Command[]>("/api/commands", { params: profileId ? { profileId } : undefined });
      return data;
    },
  });
}

export function useProfileCommandOrder(profileId?: string) {
  return useQuery({
    queryKey: queryKeys.commands.profileOrder(profileId ?? ""),
    queryFn: async () => {
      const { data } = await api.get<ProfileCommandOrder>(`/api/commands/order/${profileId}`);
      return data;
    },
    enabled: !!profileId,
  });
}

export function useAddCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { emoji: string; label: string }) => {
      const { data: created } = await api.post<Command>("/api/commands", data);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.success("명령이 추가되었습니다");
    },
  });
}

export function useDeleteCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/commands/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.success("명령이 삭제되었습니다");
    },
  });
}

export function useResetCommands() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Command[]>("/api/commands/reset");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.success("명령이 기본값으로 초기화되었습니다");
    },
  });
}

export function useReorderCommands() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderedIds, profileId }: { orderedIds: string[]; profileId?: string }) => {
      const path = profileId ? `/api/commands/order/${profileId}` : "/api/commands/order";
      await api.put(path, { orderedIds });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.success("명령 순서가 저장되었습니다");
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.error("명령 순서를 저장하지 못했습니다. 최신 목록을 다시 불러왔습니다.");
    },
  });
}

export function useResetProfileCommandOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      await api.delete(`/api/commands/order/${profileId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.commands.all });
      toast.success("전체 기본 순서로 되돌렸습니다");
    },
  });
}
