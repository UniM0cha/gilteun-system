import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { annotationApi } from '../api/annotations';
import { Annotation, UpdateAnnotationRequest } from '../types';

/**
 * 주석 API React Query 훅들
 * TanStack Query를 사용한 SVG 주석 데이터 관리
 */

// 쿼리 키 팩토리
export const annotationQueryKeys = {
  all: ['annotations'] as const,
  songAnnotations: (songId: number) => [...annotationQueryKeys.all, 'song', songId] as const,
  userAnnotations: (songId: number, userId: string) => 
    [...annotationQueryKeys.songAnnotations(songId), 'user', userId] as const,
  annotationStats: (songId: number) => [...annotationQueryKeys.songAnnotations(songId), 'stats'] as const,
};

/**
 * 찬양별 모든 주석 조회
 */
export const useAnnotations = (songId: number, enabled = true) => {
  return useQuery({
    queryKey: annotationQueryKeys.songAnnotations(songId),
    queryFn: () => annotationApi.getAnnotations(songId),
    enabled: enabled && songId > 0,
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });
};

/**
 * 사용자별 주석 조회
 */
export const useUserAnnotations = (songId: number, userId: string, enabled = true) => {
  return useQuery({
    queryKey: annotationQueryKeys.userAnnotations(songId, userId),
    queryFn: () => annotationApi.getUserAnnotations(songId, userId),
    enabled: enabled && songId > 0 && !!userId,
    staleTime: 30 * 1000, // 30초
    gcTime: 5 * 60 * 1000, // 5분
  });
};

/**
 * 주석 통계 조회
 */
export const useAnnotationStats = (songId: number, enabled = true) => {
  return useQuery({
    queryKey: annotationQueryKeys.annotationStats(songId),
    queryFn: () => annotationApi.getAnnotationStats(songId),
    enabled: enabled && songId > 0,
    staleTime: 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
  });
};

/**
 * 주석 생성 뮤테이션
 */
export const useCreateAnnotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: annotationApi.createAnnotation,
    onSuccess: (data, variables) => {
      if (data) {
        // 찬양별 주석 목록 무효화
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.songAnnotations(variables.songId)
        });
        
        // 사용자별 주석 목록 무효화
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.userAnnotations(variables.songId, variables.userId)
        });
        
        // 주석 통계 무효화
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.annotationStats(variables.songId)
        });
        
        // 옵티미스틱 업데이트
        queryClient.setQueryData(
          annotationQueryKeys.songAnnotations(variables.songId),
          (old: Annotation[] | undefined) => {
            return old ? [...old, data] : [data];
          }
        );
      }
    },
    onError: (error) => {
      console.error('주석 생성 실패:', error);
    },
  });
};

/**
 * 주석 업데이트 뮤테이션
 */
export const useUpdateAnnotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateAnnotationRequest }) =>
      annotationApi.updateAnnotation(id, updates),
    onSuccess: (data, variables) => {
      if (data) {
        // 관련된 모든 쿼리 무효화
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.songAnnotations(data.songId)
        });
        
        // 옵티미스틱 업데이트
        queryClient.setQueryData(
          annotationQueryKeys.songAnnotations(data.songId),
          (old: Annotation[] | undefined) => {
            return old?.map(annotation => 
              annotation.id === variables.id ? data : annotation
            ) || [data];
          }
        );
      }
    },
    onError: (error) => {
      console.error('주석 업데이트 실패:', error);
    },
  });
};

/**
 * 주석 삭제 뮤테이션
 */
export const useDeleteAnnotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id }: { id: number; songId: number; userId: string }) =>
      annotationApi.deleteAnnotation(id),
    onSuccess: (success, variables) => {
      if (success) {
        // 관련된 모든 쿼리 무효화
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.songAnnotations(variables.songId)
        });
        
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.userAnnotations(variables.songId, variables.userId)
        });
        
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.annotationStats(variables.songId)
        });
        
        // 옵티미스틱 업데이트
        queryClient.setQueryData(
          annotationQueryKeys.songAnnotations(variables.songId),
          (old: Annotation[] | undefined) => {
            return old?.filter(annotation => annotation.id !== variables.id) || [];
          }
        );
      }
    },
    onError: (error) => {
      console.error('주석 삭제 실패:', error);
    },
  });
};

/**
 * 사용자의 모든 주석 삭제 뮤테이션
 */
export const useDeleteUserAnnotations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ songId, userId }: { songId: number; userId: string }) =>
      annotationApi.deleteUserAnnotations(songId, userId),
    onSuccess: (success, variables) => {
      if (success) {
        // 모든 관련 쿼리 무효화
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.songAnnotations(variables.songId)
        });
        
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.userAnnotations(variables.songId, variables.userId)
        });
        
        queryClient.invalidateQueries({
          queryKey: annotationQueryKeys.annotationStats(variables.songId)
        });
      }
    },
    onError: (error) => {
      console.error('사용자 주석 삭제 실패:', error);
    },
  });
};

/**
 * 벌크 주석 생성 뮤테이션
 */
export const useBulkCreateAnnotations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: annotationApi.bulkCreateAnnotations,
    onSuccess: (data, variables) => {
      if (data.length > 0) {
        const songId = variables[0]?.songId;
        if (songId) {
          // 모든 관련 쿼리 무효화
          queryClient.invalidateQueries({
            queryKey: annotationQueryKeys.songAnnotations(songId)
          });
          
          queryClient.invalidateQueries({
            queryKey: annotationQueryKeys.annotationStats(songId)
          });
        }
      }
    },
    onError: (error) => {
      console.error('벌크 주석 생성 실패:', error);
    },
  });
};

/**
 * SVG 내보내기 - 별도 함수로 제공 (캐싱하지 않음)
 */
export const useExportAnnotationsSVG = () => {
  return useMutation({
    mutationFn: ({ songId, userIds }: { songId: number; userIds?: string[] }) =>
      annotationApi.exportAnnotationsSVG(songId, userIds),
    onError: (error) => {
      console.error('주석 SVG 내보내기 실패:', error);
    },
  });
};