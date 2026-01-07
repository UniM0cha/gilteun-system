// React Query 클라이언트 설정

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 stale 시간 (5분)
      staleTime: 5 * 60 * 1000,
      // 재시도 횟수
      retry: 1,
      // 윈도우 포커스 시 자동 리페치 비활성화
      refetchOnWindowFocus: false,
    },
    mutations: {
      // 뮤테이션 재시도 비활성화
      retry: false,
    },
  },
});

// 쿼리 키
export const queryKeys = {
  // 프로필
  profiles: {
    all: ['profiles'] as const,
    detail: (id: string) => ['profiles', id] as const,
  },

  // 예배
  worships: {
    all: ['worships'] as const,
    detail: (id: string) => ['worships', id] as const,
  },

  // 찬양
  songs: {
    byWorship: (worshipId: string) => ['songs', 'worship', worshipId] as const,
    detail: (id: string) => ['songs', id] as const,
  },

  // 주석
  annotations: {
    bySong: (songId: string) => ['annotations', songId] as const,
    byProfile: (songId: string, profileId: string) =>
      ['annotations', songId, profileId] as const,
  },
} as const;
