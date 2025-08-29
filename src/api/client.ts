import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

/**
 * API 클라이언트 설정 타입
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * API 에러 타입
 */
export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: any;
}

/**
 * API 클라이언트 클래스
 * - Axios 기반 HTTP 클라이언트
 * - 에러 처리 및 응답 변환
 * - 재시도 로직 (선택적)
 */
export class ApiClient {
  private instance: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000, // 10초 기본 타임아웃
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  /**
   * 요청/응답 인터셉터 설정
   */
  private setupInterceptors(): void {
    // 요청 인터셉터
    this.instance.interceptors.request.use(
      (config) => {
        // 요청 로그 (개발 환경에서만)
        if (import.meta.env.DEV) {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        console.error('[API Request Error]:', error);
        return Promise.reject(this.transformError(error));
      },
    );

    // 응답 인터셉터
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 응답 로그 (개발 환경에서만)
        if (import.meta.env.DEV) {
          console.log(`[API Response] ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error: AxiosError) => {
        console.error('[API Response Error]:', error.message);
        return Promise.reject(this.transformError(error));
      },
    );
  }

  /**
   * Axios 에러를 API 에러로 변환
   */
  private transformError(error: AxiosError): ApiError {
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      return {
        code: `HTTP_${error.response.status}`,
        message: (error.response.data as any)?.message || error.message,
        status: error.response.status,
        details: error.response.data,
      };
    } else if (error.request) {
      // 요청이 전송되었지만 응답이 없음
      return {
        code: 'NETWORK_ERROR',
        message: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.',
        details: error.request,
      };
    } else {
      // 요청 설정 중 에러 발생
      return {
        code: 'REQUEST_ERROR',
        message: error.message || '요청 처리 중 오류가 발생했습니다.',
        details: error,
      };
    }
  }

  /**
   * GET 요청
   */
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.instance.get<T>(url, { params });
    return response.data;
  }

  /**
   * POST 요청
   */
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post<T>(url, data);
    return response.data;
  }

  /**
   * PUT 요청
   */
  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put<T>(url, data);
    return response.data;
  }

  /**
   * PATCH 요청
   */
  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.instance.patch<T>(url, data);
    return response.data;
  }

  /**
   * DELETE 요청
   */
  async delete<T = any>(url: string): Promise<T> {
    const response = await this.instance.delete<T>(url);
    return response.data;
  }

  /**
   * 파일 업로드 (multipart/form-data)
   */
  async upload<T = any>(url: string, formData: FormData): Promise<T> {
    const response = await this.instance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * 서버 연결 상태 확인
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    version?: string;
    connectedUsers?: number;
    timestamp: number;
  }> {
    try {
      const response = await this.get('/api/health');
      return {
        status: 'healthy',
        ...response,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 베이스 URL 업데이트
   */
  updateBaseURL(newBaseURL: string): void {
    this.instance.defaults.baseURL = newBaseURL;
  }

  /**
   * 타임아웃 설정 업데이트
   */
  updateTimeout(timeout: number): void {
    this.instance.defaults.timeout = timeout;
  }
}

/**
 * 기본 API 클라이언트 인스턴스
 */
export const createApiClient = (baseURL: string): ApiClient => {
  return new ApiClient({
    baseURL,
    timeout: 10000,
  });
};
