import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * React Query 설정
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기본 쿼리 옵션
      retry: (failureCount, error: any) => {
        // 네트워크 오류나 서버 오류는 재시도
        if (error?.code === 'NETWORK_ERROR' || error?.status >= 500) {
          return failureCount < 3;
        }
        // 클라이언트 오류(4xx)는 재시도하지 않음
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
      gcTime: 10 * 60 * 1000, // 10분간 캐시 유지 (구 cacheTime)
      refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 갱신 비활성화
      refetchOnMount: 'if-stale', // 마운트 시 stale한 경우만 갱신
      refetchOnReconnect: 'if-stale', // 재연결 시 stale한 경우만 갱신
    },
    mutations: {
      // 기본 뮤테이션 옵션
      retry: (failureCount, error: any) => {
        // 네트워크 오류만 재시도 (최대 2회)
        if (error?.code === 'NETWORK_ERROR') {
          return failureCount < 2;
        }
        return false;
      },
      retryDelay: 1000, // 1초 후 재시도
    },
  },
});

/**
 * React Query 에러 처리 이벤트 리스너
 */
queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'error') {
    const error = event.error as any;

    // 개발 환경에서만 콘솔 로그
    if (import.meta.env.DEV) {
      console.error('[Query Error]:', {
        queryKey: event.query.queryKey,
        error: error,
      });
    }

    // 특정 에러에 대한 글로벌 처리
    if (error?.code === 'NETWORK_ERROR') {
      // 네트워크 에러 발생 시 전역 알림 (선택적)
      console.warn('네트워크 연결을 확인해주세요');
    }
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === 'error') {
    const error = event.error as any;

    // 개발 환경에서만 콘솔 로그
    if (import.meta.env.DEV) {
      console.error('[Mutation Error]:', {
        mutationKey: event.mutation.options.mutationKey,
        error: error,
      });
    }
  }
});

/**
 * React Query Provider 컴포넌트
 * - QueryClient 제공
 * - 개발 환경에서 DevTools 활성화
 * - 에러 바운더리 포함
 */
interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* 개발 환경에서만 DevTools 표시 */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: 'scale(0.8)',
              transformOrigin: 'bottom right',
            },
          }}
        />
      )}
    </QueryClientProvider>
  );
};

/**
 * QueryClient 인스턴스 export (테스트나 특별한 용도)
 */
export { queryClient };
