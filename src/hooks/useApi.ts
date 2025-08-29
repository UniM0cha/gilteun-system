import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { ApiClient, createApiClient, SongApi, WorshipApi } from '../api';
import { useAppStore } from '../store/appStore';
import type {
  Annotation,
  CreateAnnotationRequest,
  CreateSongRequest,
  CreateWorshipRequest,
  Song,
  UpdateSongRequest,
  UpdateWorshipRequest,
  Worship,
} from '../types';

/**
 * API 클라이언트 인스턴스 생성 훅
 */
export const useApiClient = (): {
  client: ApiClient | null;
  worshipApi: WorshipApi | null;
  songApi: SongApi | null;
} => {
  const serverInfo = useAppStore((state) => state.serverInfo);

  if (!serverInfo?.url) {
    return { client: null, worshipApi: null, songApi: null };
  }

  const client = createApiClient(serverInfo.url);
  const worshipApi = new WorshipApi(client);
  const songApi = new SongApi(client);

  return { client, worshipApi, songApi };
};

/**
 * Query Keys 정의
 */
export const queryKeys = {
  // Health check
  health: () => ['health'] as const,

  // Worships
  worships: () => ['worships'] as const,
  worship: (id: number) => ['worships', id] as const,
  worshipSongs: (worshipId: number) => ['worships', worshipId, 'songs'] as const,
  worshipStats: () => ['worships', 'stats'] as const,
  recentWorships: (limit: number) => ['worships', 'recent', limit] as const,
  todayWorship: () => ['worships', 'today'] as const,

  // Songs
  songs: () => ['songs'] as const,
  song: (id: number) => ['songs', id] as const,
  songStats: (songId: number) => ['songs', songId, 'stats'] as const,
  popularSongs: (limit: number) => ['songs', 'popular', limit] as const,
  searchSongs: (query: string) => ['songs', 'search', query] as const,

  // Annotations
  annotations: (songId: number) => ['songs', songId, 'annotations'] as const,
  annotationLayers: (songId: number) => ['songs', songId, 'annotations', 'layers'] as const,
  latestAnnotations: (songId: number) => ['songs', songId, 'annotations', 'latest'] as const,
} as const;

// ============================================================================
// Health Check Hooks
// ============================================================================

/**
 * 서버 상태 확인 훅
 */
export const useHealthCheck = (): UseQueryResult<{
  status: 'healthy' | 'unhealthy';
  version?: string;
  connectedUsers?: number;
  timestamp: number;
}> => {
  const { client } = useApiClient();

  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: () => client?.checkHealth() ?? Promise.reject('No client'),
    enabled: !!client,
    refetchInterval: 30000, // 30초마다 상태 확인
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// ============================================================================
// Worship Hooks
// ============================================================================

/**
 * 예배 목록 조회 훅
 */
export const useWorships = (params?: {
  search?: string;
  sortBy?: 'date' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}) => {
  const { worshipApi } = useApiClient();

  return useQuery({
    queryKey: [...queryKeys.worships(), params],
    queryFn: () => worshipApi?.getWorships(params) ?? Promise.reject('No API'),
    enabled: !!worshipApi,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
  });
};

/**
 * 특정 예배 조회 훅
 */
export const useWorship = (id: number | null, options?: { enabled?: boolean }) => {
  const { worshipApi } = useApiClient();

  return useQuery({
    queryKey: queryKeys.worship(id!),
    queryFn: () => worshipApi?.getWorship(id!) ?? Promise.reject('No API'),
    enabled: !!worshipApi && !!id && id > 0 && options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
  });
};

/**
 * 예배의 찬양 목록 조회 훅
 */
export const useWorshipSongs = (worshipId: number) => {
  const { worshipApi } = useApiClient();

  return useQuery({
    queryKey: queryKeys.worshipSongs(worshipId),
    queryFn: () => worshipApi?.getWorshipSongs(worshipId) ?? Promise.reject('No API'),
    enabled: !!worshipApi && worshipId > 0,
    staleTime: 1 * 60 * 1000, // 1분간 fresh 상태 유지
  });
};

/**
 * 최근 예배 목록 조회 훅
 */
export const useRecentWorships = (limit: number = 5) => {
  const { worshipApi } = useApiClient();

  return useQuery({
    queryKey: queryKeys.recentWorships(limit),
    queryFn: () => worshipApi?.getRecentWorships(limit) ?? Promise.reject('No API'),
    enabled: !!worshipApi,
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
  });
};

/**
 * 오늘 예배 조회 훅
 */
export const useTodayWorship = () => {
  const { worshipApi } = useApiClient();

  return useQuery({
    queryKey: queryKeys.todayWorship(),
    queryFn: () => worshipApi?.getTodayWorship() ?? Promise.reject('No API'),
    enabled: !!worshipApi,
    staleTime: 10 * 60 * 1000, // 10분간 fresh 상태 유지
  });
};

/**
 * 예배 생성 뮤테이션 훅
 */
export const useCreateWorship = (): UseMutationResult<Worship, Error, CreateWorshipRequest> => {
  const { worshipApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorshipRequest) => worshipApi?.createWorship(data) ?? Promise.reject('No API'),
    onSuccess: (newWorship) => {
      // 예배 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.worships() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentWorships(5) });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayWorship() });

      // 새 예배를 캐시에 추가
      queryClient.setQueryData(queryKeys.worship(newWorship.id), newWorship);
    },
  });
};

/**
 * 예배 수정 뮤테이션 훅
 */
export const useUpdateWorship = (): UseMutationResult<Worship, Error, { id: number; data: UpdateWorshipRequest }> => {
  const { worshipApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => worshipApi?.updateWorship(id, data) ?? Promise.reject('No API'),
    onSuccess: (updatedWorship, { id }) => {
      // 특정 예배 캐시 업데이트
      queryClient.setQueryData(queryKeys.worship(id), updatedWorship);

      // 예배 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.worships() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentWorships(5) });
    },
  });
};

/**
 * 예배 삭제 뮤테이션 훅
 */
export const useDeleteWorship = (): UseMutationResult<void, Error, number> => {
  const { worshipApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => worshipApi?.deleteWorship(id) ?? Promise.reject('No API'),
    onSuccess: (_, deletedId) => {
      // 캐시에서 삭제된 예배 제거
      queryClient.removeQueries({ queryKey: queryKeys.worship(deletedId) });
      queryClient.removeQueries({
        queryKey: queryKeys.worshipSongs(deletedId),
      });

      // 예배 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.worships() });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentWorships(5) });
    },
  });
};

// ============================================================================
// Song Hooks
// ============================================================================

/**
 * 찬양 목록 조회 훅 (특정 예배의 찬양들)
 */
export const useSongs = (params?: { worshipId?: number }, options?: { enabled?: boolean }) => {
  const { client } = useApiClient();

  return useQuery({
    queryKey: [...queryKeys.songs(), params],
    queryFn: async () => {
      if (!client) throw new Error('No client available');

      const queryParams = new URLSearchParams();
      if (params?.worshipId) {
        queryParams.append('worshipId', params.worshipId.toString());
      }

      return await client.get(`/api/songs?${queryParams.toString()}`);
    },
    enabled: !!client && options?.enabled !== false,
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
  });
};

/**
 * 특정 찬양 조회 훅
 */
export const useSong = (id: number) => {
  const { songApi } = useApiClient();

  return useQuery({
    queryKey: queryKeys.song(id),
    queryFn: () => songApi?.getSong(id) ?? Promise.reject('No API'),
    enabled: !!songApi && id > 0,
    staleTime: 2 * 60 * 1000, // 2분간 fresh 상태 유지
  });
};

/**
 * 찬양 생성 뮤테이션 훅
 */
export const useCreateSong = (): UseMutationResult<Song, Error, CreateSongRequest> => {
  const { songApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSongRequest) => songApi?.createSong(data) ?? Promise.reject('No API'),
    onSuccess: (newSong) => {
      // 예배의 찬양 목록 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.worshipSongs(newSong.worshipId),
      });

      // 새 찬양을 캐시에 추가
      queryClient.setQueryData(queryKeys.song(newSong.id), newSong);
    },
  });
};

/**
 * 찬양 수정 뮤테이션 훅
 */
export const useUpdateSong = (): UseMutationResult<Song, Error, { id: number } & UpdateSongRequest> => {
  const { songApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }) => songApi?.updateSong(id, data) ?? Promise.reject('No API'),
    onSuccess: (updatedSong) => {
      // 특정 찬양 캐시 업데이트
      queryClient.setQueryData(queryKeys.song(updatedSong.id), updatedSong);

      // 찬양 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.songs() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.worshipSongs(updatedSong.worshipId),
      });
    },
  });
};

/**
 * 찬양 삭제 뮤테이션 훅
 */
export const useDeleteSong = (): UseMutationResult<void, Error, number> => {
  const { songApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => songApi?.deleteSong(id) ?? Promise.reject('No API'),
    onSuccess: (_, deletedId) => {
      // 캐시에서 삭제된 찬양 제거
      queryClient.removeQueries({ queryKey: queryKeys.song(deletedId) });
      queryClient.removeQueries({ queryKey: queryKeys.annotations(deletedId) });

      // 찬양 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.songs() });
    },
  });
};

/**
 * 악보 업로드 뮤테이션 훅
 */
export const useUploadScore = (): UseMutationResult<any, Error, { songId: number; file: File }> => {
  const { songApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ songId, file }) => songApi?.uploadScore(songId, file) ?? Promise.reject('No API'),
    onSuccess: (_, { songId }) => {
      // 찬양 정보 캐시 무효화 (이미지 경로 업데이트)
      queryClient.invalidateQueries({ queryKey: queryKeys.song(songId) });
    },
  });
};

// ============================================================================
// Annotation Hooks
// ============================================================================

/**
 * 찬양의 주석 목록 조회 훅
 */
export const useAnnotations = (songId: number, params?: { userId?: string; layer?: string }) => {
  const { songApi } = useApiClient();

  return useQuery({
    queryKey: [...queryKeys.annotations(songId), params],
    queryFn: () => songApi?.getAnnotations(songId, params) ?? Promise.reject('No API'),
    enabled: !!songApi && songId > 0,
    staleTime: 30 * 1000, // 30초간 fresh 상태 유지 (실시간성 중요)
    refetchInterval: 5000, // 5초마다 자동 갱신
  });
};

/**
 * 주석 생성 뮤테이션 훅
 */
export const useCreateAnnotation = (): UseMutationResult<Annotation, Error, CreateAnnotationRequest> => {
  const { songApi } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnotationRequest) => songApi?.createAnnotation(data) ?? Promise.reject('No API'),
    onSuccess: (_, { songId }) => {
      // 주석 목록 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotations(songId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annotationLayers(songId),
      });
    },
  });
};

/**
 * 주석 레이어 목록 조회 훅
 */
export const useAnnotationLayers = (songId: number) => {
  const { songApi } = useApiClient();

  return useQuery({
    queryKey: queryKeys.annotationLayers(songId),
    queryFn: () => songApi?.getAnnotationLayers(songId) ?? Promise.reject('No API'),
    enabled: !!songApi && songId > 0,
    staleTime: 1 * 60 * 1000, // 1분간 fresh 상태 유지
  });
};
