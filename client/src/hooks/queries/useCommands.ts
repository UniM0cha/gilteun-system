import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import type { Command } from "@/types";

export function useCommands() {
  return useQuery({
    queryKey: queryKeys.commands.all,
    queryFn: async () => {
      const { data } = await api.get<Command[]>("/api/commands");
      return data;
    },
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
