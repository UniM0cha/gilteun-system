import { useCallback, useEffect, useState } from 'react';

export interface SystemStatus {
  isOnline: boolean;
  connectedUsers: number;
  uptime: string;
  serverPort: number;
  lastSync: string;
  startTime: string;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  databaseStats: {
    worships: number;
    scores: number;
    drawings: number;
    templates: number;
    users: number;
  };
}

export interface UserSession {
  id: string;
  name: string;
  instrument: string;
  joinedAt: string;
  isActive: boolean;
  currentPage?: number;
  worshipId?: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  component?: string;
  details?: unknown;
}

export interface SystemSettings {
  autoBackup: boolean;
  dataSync: boolean;
  securityEnabled: boolean;
  logLevel: string;
  maxUsers: number;
}

export const useAdmin = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출 헬퍼 함수
  const apiCall = useCallback(async (endpoint: string, options?: RequestInit) => {
    try {
      const response = await fetch(`/api/admin${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'API 호출 실패');
      }

      return data.data;
    } catch (error) {
      console.error('API 호출 오류:', error);
      throw error;
    }
  }, []);

  // 시스템 상태 조회
  const fetchSystemStatus = useCallback(async () => {
    try {
      const data = await apiCall('/status');
      setSystemStatus(data);
      setError(null);
    } catch (error) {
      setError('시스템 상태를 불러올 수 없습니다.');
      console.error('시스템 상태 조회 실패:', error);
    }
  }, [apiCall]);

  // 사용자 세션 조회
  const fetchUserSessions = useCallback(async () => {
    try {
      const data = await apiCall('/users');
      setUserSessions(data);
      setError(null);
    } catch (error) {
      setError('사용자 목록을 불러올 수 없습니다.');
      console.error('사용자 세션 조회 실패:', error);
    }
  }, [apiCall]);

  // 시스템 로그 조회
  const fetchSystemLogs = useCallback(
    async (limit: number = 100, level?: string) => {
      try {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (level) params.append('level', level);

        const data = await apiCall(`/logs?${params.toString()}`);
        setSystemLogs(data);
        setError(null);
      } catch (error) {
        setError('시스템 로그를 불러올 수 없습니다.');
        console.error('시스템 로그 조회 실패:', error);
      }
    },
    [apiCall]
  );

  // 시스템 설정 조회
  const fetchSystemSettings = useCallback(async () => {
    try {
      const data = await apiCall('/settings');
      setSystemSettings(data);
      setError(null);
    } catch (error) {
      setError('시스템 설정을 불러올 수 없습니다.');
      console.error('시스템 설정 조회 실패:', error);
    }
  }, [apiCall]);

  // 시스템 설정 업데이트
  const updateSystemSettings = useCallback(
    async (settings: Partial<SystemSettings>) => {
      try {
        setIsLoading(true);
        await apiCall('/settings', {
          method: 'PUT',
          body: JSON.stringify({ settings }),
        });

        // 설정 다시 조회
        await fetchSystemSettings();
        setError(null);
        return true;
      } catch (error) {
        setError('시스템 설정 업데이트에 실패했습니다.');
        console.error('시스템 설정 업데이트 실패:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, fetchSystemSettings]
  );

  // 사용자 강제 퇴장
  const disconnectUser = useCallback(
    async (socketId: string, reason?: string) => {
      try {
        setIsLoading(true);
        await apiCall(`/users/${socketId}/disconnect`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });

        // 사용자 목록 다시 조회
        await fetchUserSessions();
        setError(null);
        return true;
      } catch (error) {
        setError('사용자 연결 해제에 실패했습니다.');
        console.error('사용자 강제 퇴장 실패:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, fetchUserSessions]
  );

  // 악보 업로드
  const uploadScore = useCallback(async (file: File, title: string, worshipId: string) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('scoreFile', file);
      formData.append('title', title);
      formData.append('worshipId', worshipId);

      const response = await fetch('/api/admin/scores/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`업로드 실패: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '업로드 실패');
      }

      setError(null);
      return data.data;
    } catch (error) {
      setError('악보 업로드에 실패했습니다.');
      console.error('악보 업로드 실패:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 악보 삭제
  const deleteScore = useCallback(
    async (scoreId: string) => {
      try {
        setIsLoading(true);
        await apiCall(`/scores/${scoreId}`, {
          method: 'DELETE',
        });

        setError(null);
        return true;
      } catch (error) {
        setError('악보 삭제에 실패했습니다.');
        console.error('악보 삭제 실패:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall]
  );

  // 시스템 정리
  const cleanupSystem = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiCall('/cleanup', {
        method: 'POST',
      });

      setError(null);
      return data;
    } catch (error) {
      setError('시스템 정리에 실패했습니다.');
      console.error('시스템 정리 실패:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  // 데이터 백업
  const exportData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/backup/export');

      if (!response.ok) {
        throw new Error('백업 데이터를 가져올 수 없습니다.');
      }

      const backupData = await response.json();

      // JSON 파일로 다운로드
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `gilteun-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setError(null);
      return true;
    } catch (error) {
      setError('데이터 백업에 실패했습니다.');
      console.error('데이터 백업 실패:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 데이터 가져오기
  const importData = useCallback(async (file: File) => {
    try {
      setIsLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('데이터 가져오기에 실패했습니다.');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '데이터 가져오기 실패');
      }

      setError(null);
      return true;
    } catch (error) {
      setError('데이터 가져오기에 실패했습니다.');
      console.error('데이터 가져오기 실패:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 캐시 삭제
  const clearCache = useCallback(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      setError(null);
      return true;
    } catch (error) {
      setError('캐시 삭제에 실패했습니다.');
      console.error('캐시 삭제 실패:', error);
      return false;
    }
  }, []);

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    fetchSystemStatus();
    fetchUserSessions();
    fetchSystemSettings();
    fetchSystemLogs();
  }, [fetchSystemStatus, fetchUserSessions, fetchSystemSettings, fetchSystemLogs]);

  // 주기적으로 시스템 상태 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemStatus();
      fetchUserSessions();
    }, 5000); // 5초마다 업데이트

    return () => clearInterval(interval);
  }, [fetchSystemStatus, fetchUserSessions]);

  return {
    // 상태
    systemStatus,
    userSessions,
    systemLogs,
    systemSettings,
    isLoading,
    error,

    // 액션
    fetchSystemStatus,
    fetchUserSessions,
    fetchSystemLogs,
    fetchSystemSettings,
    updateSystemSettings,
    disconnectUser,
    uploadScore,
    deleteScore,
    cleanupSystem,
    exportData,
    importData,
    clearCache,

    // 에러 클리어
    clearError: () => setError(null),
  };
};
