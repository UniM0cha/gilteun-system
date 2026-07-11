import axios, { type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

export const api = axios.create({
  baseURL: "/",
});

// PIN 검증 세대 — 검증 이전 세대에 시작된 요청의 늦은 401이 도착해도 새 인증 상태를
// 되돌리지 않도록 요청에 세대를 스탬프해 비교한다 (useVerifyPin onSuccess에서 증가).
// 벽시계 대신 단조 카운터를 쓰는 이유: 시스템 시간 보정·동일 밀리초 요청에 영향받지 않음
let authGeneration = 0;
export function markAuthVerified() {
  authGeneration++;
}

interface AuthStampedConfig extends InternalAxiosRequestConfig {
  authGeneration?: number;
}

api.interceptors.request.use((config: AuthStampedConfig) => {
  config.authGeneration = authGeneration;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      const serverMessage = error.response?.data?.error;
      const url = error.config?.url ?? "";

      // 401 인증 만료 시 PIN 화면으로 복귀 (auth 요청 자체는 제외).
      // 단 PIN 검증 이전 세대에 시작된 요청의 stale 401은 무시 — 검증 직후 도착해
      // 인증 상태를 다시 풀어버리는 레이스 방지
      if (status === 401 && !url.startsWith("/api/auth")) {
        const requestGeneration = (error.config as AuthStampedConfig | undefined)?.authGeneration ?? authGeneration;
        if (requestGeneration === authGeneration) {
          queryClient.setQueryData(queryKeys.auth.status, {
            required: true,
            authenticated: false,
          });
        }
        return Promise.reject(error);
      }

      // 메시지 단위 dedupe — 재시도(5xx/네트워크는 최대 3회)마다 같은 토스트가 중첩되는 것은
      // 막되, 서로 다른 실패는 각각 표시되도록 전역 고정 id는 쓰지 않는다
      const message =
        status >= 400 && status < 500
          ? serverMessage || "요청에 실패했습니다"
          : status >= 500
            ? "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
            : "네트워크 연결을 확인해주세요";
      toast.error(message, { id: message });
    }
    return Promise.reject(error);
  },
);
