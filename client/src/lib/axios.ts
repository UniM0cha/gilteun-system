import axios from "axios";
import { toast } from "sonner";
import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

export const api = axios.create({
  baseURL: "/",
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      const serverMessage = error.response?.data?.error;
      const url = error.config?.url ?? "";

      // 401 인증 만료 시 PIN 화면으로 복귀 (auth 요청 자체는 제외)
      if (status === 401 && !url.startsWith("/api/auth")) {
        queryClient.setQueryData(queryKeys.auth.status, {
          required: true,
          authenticated: false,
        });
        return Promise.reject(error);
      }

      if (status >= 400 && status < 500) {
        toast.error(serverMessage || "요청에 실패했습니다");
      } else if (status >= 500) {
        toast.error("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        toast.error("네트워크 연결을 확인해주세요");
      }
    }
    return Promise.reject(error);
  },
);
