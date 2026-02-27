import axios from "axios";
import { toast } from "sonner";

export const api = axios.create({
  baseURL: "/",
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0;
      const serverMessage = error.response?.data?.error;

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
