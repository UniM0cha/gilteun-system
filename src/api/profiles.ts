// 프로필 API 훅

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import type { Profile, CreateProfileRequest, UpdateProfileRequest } from '@/types';

// 프로필 목록 조회
export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles.all,
    queryFn: async () => {
      const response = await apiClient.get<Profile[]>('/profiles');
      return response.data ?? [];
    },
  });
}

// 프로필 단건 조회
export function useProfile(id: string) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Profile>(`/profiles/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// 프로필 생성
export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProfileRequest) => {
      const response = await apiClient.post<Profile>('/profiles', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });
}

// 프로필 수정
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateProfileRequest & { id: string }) => {
      const response = await apiClient.put<Profile>(`/profiles/${id}`, data);
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.detail(variables.id) });
    },
  });
}

// 프로필 삭제
export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });
}
