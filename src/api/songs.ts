// 찬양 API 훅

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { CONFIG } from '@/constants/config';
import type { Song, CreateSongRequest, UpdateSongRequest } from '@/types';

// 예배별 찬양 목록 조회
export function useSongsByWorship(worshipId: string) {
  return useQuery({
    queryKey: queryKeys.songs.byWorship(worshipId),
    queryFn: async () => {
      const response = await apiClient.get<Song[]>(`/songs/worship/${worshipId}`);
      return response.data ?? [];
    },
    enabled: !!worshipId,
  });
}

// 찬양 단건 조회
export function useSong(id: string) {
  return useQuery({
    queryKey: queryKeys.songs.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<Song>(`/songs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// 찬양 생성
export function useCreateSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSongRequest) => {
      const response = await apiClient.post<Song>('/songs', data);
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.byWorship(variables.worshipId) });
    },
  });
}

// 찬양 수정
export function useUpdateSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, worshipId: _worshipId, ...data }: UpdateSongRequest & { id: string; worshipId: string }) => {
      const response = await apiClient.put<Song>(`/songs/${id}`, data);
      return response.data!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.byWorship(variables.worshipId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.id) });
    },
  });
}

// 찬양 삭제
export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/songs/${id}`);
    },
    onSuccess: () => {
      // 모든 찬양 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
  });
}

// 찬양 순서 변경
export function useReorderSongs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ worshipId, songIds }: { worshipId: string; songIds: string[] }) => {
      await apiClient.put(`/songs/worship/${worshipId}/reorder`, { songIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.byWorship(variables.worshipId) });
    },
  });
}

// 악보 이미지 업로드
export function useUploadSongImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ songId, file }: { songId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);

      // API 서버로 직접 요청 (Vite 프록시 아닌 직접 연결)
      const response = await fetch(`${CONFIG.API_BASE_URL}/songs/${songId}/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '이미지 업로드에 실패했습니다.');
      }

      const result = await response.json();
      return result.data as Song;
    },
    onSuccess: () => {
      // 모든 찬양 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    },
  });
}
