// 주석 API 훅

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import type { Annotation, CreateAnnotationRequest, UpdateAnnotationRequest } from '@/types';

// 찬양별 주석 조회 (모든 사용자)
export function useAnnotationsBySong(songId: string) {
  return useQuery({
    queryKey: queryKeys.annotations.bySong(songId),
    queryFn: async () => {
      const response = await apiClient.get<Annotation[]>(`/annotations/song/${songId}`);
      return response.data ?? [];
    },
    enabled: !!songId,
  });
}

// 찬양 + 프로필별 주석 조회 (내 주석)
export function useMyAnnotations(songId: string, profileId: string) {
  return useQuery({
    queryKey: queryKeys.annotations.byProfile(songId, profileId),
    queryFn: async () => {
      const response = await apiClient.get<Annotation[]>(
        `/annotations/song/${songId}?profileId=${profileId}`
      );
      return response.data ?? [];
    },
    enabled: !!songId && !!profileId,
  });
}

// 주석 생성
export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAnnotationRequest) => {
      const response = await apiClient.post<Annotation>('/annotations', data);
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations.bySong(variables.songId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations.byProfile(variables.songId, variables.profileId),
      });
    },
  });
}

// 벌크 주석 생성 (여러 스트로크 한번에)
export function useCreateAnnotationsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annotations: CreateAnnotationRequest[]) => {
      const response = await apiClient.post<Annotation[]>('/annotations/bulk', { annotations });
      return response.data!;
    },
    onSuccess: (_, variables) => {
      // 모든 관련 쿼리 무효화
      const songIds = [...new Set(variables.map((a) => a.songId))];
      songIds.forEach((songId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.annotations.bySong(songId),
        });
      });
    },
  });
}

// 주석 수정
export function useUpdateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      songId: _songId,
      ...data
    }: UpdateAnnotationRequest & { id: string; songId: string }) => {
      const response = await apiClient.put<Annotation>(`/annotations/${id}`, data);
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations.bySong(variables.songId),
      });
    },
  });
}

// 주석 삭제
export function useDeleteAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; songId: string }) => {
      await apiClient.delete(`/annotations/${id}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations.bySong(variables.songId),
      });
    },
  });
}

// 내 주석 전체 삭제 (특정 찬양)
export function useDeleteMyAnnotations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ songId, profileId }: { songId: string; profileId: string }) => {
      await apiClient.delete(`/annotations/song/${songId}/profile/${profileId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations.bySong(variables.songId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations.byProfile(variables.songId, variables.profileId),
      });
    },
  });
}
