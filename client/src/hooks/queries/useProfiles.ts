import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";
import { useAppStore } from "@/store/appStore";
import type { Profile } from "@/types";

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles.all,
    queryFn: async () => {
      const { data } = await api.get<Profile[]>("/api/profiles");
      return data;
    },
  });
}

export function useAddProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Profile, "id">) => {
      const { data: created } = await api.post<Profile>("/api/profiles", data);
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles.all });
      toast.success("프로필이 생성되었습니다");
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Profile) => {
      await api.put(`/api/profiles/${id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profiles.all });
      toast.success("프로필이 수정되었습니다");
    },
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/profiles/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      const { currentProfileId, clearCurrentProfile } = useAppStore.getState();
      if (currentProfileId === deletedId) {
        clearCurrentProfile();
      }
      qc.invalidateQueries({ queryKey: queryKeys.profiles.all });
      toast.success("프로필이 삭제되었습니다");
    },
  });
}
