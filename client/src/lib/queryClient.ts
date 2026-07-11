import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

// 캐시 신선도는 라이브러리 기본값 사용: staleTime 0, gcTime 5분, refetchOnWindowFocus true
// — 실시간 협업 앱 특성상 "항상 최신"이 우선이라 커스텀을 두지 않는다.
// retry만 예외: 4xx는 재시도해도 결과가 같고, 특히 401 재시도는 PIN 인증 직후
// 이전 시도의 늦은 401 응답이 인터셉터를 타고 인증 상태를 되돌리는 레이스를 만든다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? (error.response?.status ?? 0) : 0;
        if (status >= 400 && status < 500) return false;
        return failureCount < 3; // 네트워크/5xx는 라이브러리 기본 횟수 유지
      },
    },
  },
});
