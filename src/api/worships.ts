// 예배 API 훅

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import type { Worship, CreateWorshipRequest, UpdateWorshipRequest } from '@/types';

// 예배 목록 조회
export function useWorships() {
  return useQuery({
    queryKey: queryKeys.worships.all,
    queryFn: async () => {
      const response = await apiClient.get<Worship[]>('/worships');
      return response.data ?? [];
    },
  });
}

// 예배 단건 조회
export function useWorship(id: string) {
  return useQuery({
    queryKey: queryKeys.worships.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Worship>(`/worships/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// 예배 생성
export function useCreateWorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorshipRequest) => {
      const response = await apiClient.post<Worship>('/worships', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.worships.all });
    },
  });
}

// 예배 수정
export function useUpdateWorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateWorshipRequest & { id: string }) => {
      const response = await apiClient.put<Worship>(`/worships/${id}`, data);
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.worships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.worships.detail(variables.id) });
    },
  });
}

// 예배 삭제
export function useDeleteWorship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/worships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.worships.all });
    },
  });
}
