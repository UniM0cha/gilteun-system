// API 클라이언트 (Axios)

import axios, { AxiosRequestConfig } from 'axios';
import { CONFIG } from '@/constants/config';
import type { ApiResponse } from '@/types';

// 커스텀 API 클라이언트 인터페이스
// 인터셉터가 response.data를 반환하므로 반환 타입을 맞춤
interface ApiClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
  delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
}

// Axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    // 필요시 인증 토큰 추가
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
axiosInstance.interceptors.response.use(
  (response) => {
    // 성공 응답에서 data 추출 (ApiResponse 형태)
    return response.data;
  },
  (error) => {
    // 에러 메시지 추출
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      '알 수 없는 오류가 발생했습니다.';

    return Promise.reject(new Error(message));
  }
);

// 타입 안전한 API 클라이언트 export
export const apiClient = axiosInstance as unknown as ApiClient;

export default apiClient;
