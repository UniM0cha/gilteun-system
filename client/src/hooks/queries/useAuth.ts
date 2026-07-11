import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, markAuthVerified } from "@/lib/axios";
import { queryKeys } from "@/lib/queryKeys";

interface AuthStatus {
  required: boolean;
  authenticated?: boolean;
}

export function useAuthStatus() {
  return useQuery({
    queryKey: queryKeys.auth.status,
    queryFn: async () => {
      const { data } = await api.get<AuthStatus>("/api/auth/status");
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useVerifyPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string) => {
      await api.post("/api/auth/verify", { pin });
    },
    onSuccess: async () => {
      // 검증 이전 세대에 시작된 요청의 늦은 401이 아래 setQueryData를 되돌리지 않게 세대 증가
      markAuthVerified();
      // PinLock 진입 전에 시작돼 아직 진행 중인 fetch는 재마운트된 observer가 그대로
      // 공유(dedupe)해 stale 401 에러로 확정될 수 있음 — 이전 세대 요청을 전부 끊어
      // 화면 재마운트 시 인증된 세션으로 새로 받아오게 한다
      await qc.cancelQueries();
      qc.setQueryData(queryKeys.auth.status, {
        required: true,
        authenticated: true,
      });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/api/auth/logout");
    },
    onSuccess: () => {
      qc.setQueryData(queryKeys.auth.status, {
        required: true,
        authenticated: false,
      });
    },
  });
}
