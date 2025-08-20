import { useEffect, useState, useCallback } from 'react';
import { getSocketService } from '../services/socket';
import type { Command, DrawingData, PageNavigation } from '@gilteun/shared';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketService = getSocketService();

  // 연결 함수
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      await socketService.connect();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결 실패');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [socketService, isConnecting, isConnected]);

  // 연결 해제 함수
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setError(null);
  }, [socketService]);

  // 연결 상태 모니터링
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(socketService.connected);
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [socketService]);

  // 컴포넌트 언마운트 시 연결 해제
  useEffect(() => {
    return () => {
      if (isConnected) {
        socketService.disconnect();
      }
    };
  }, [socketService, isConnected]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    socketService,
  };
};

// 특정 이벤트를 구독하는 훅들
export const useCommandReceived = (callback: (command: Command) => void) => {
  const socketService = getSocketService();

  useEffect(() => {
    socketService.onCommandReceived(callback);
    return () => socketService.offCommandReceived(callback);
  }, [socketService, callback]);
};

export const useScoreSync = (callback: (data: { scoreId: string; drawings: DrawingData[] }) => void) => {
  const socketService = getSocketService();

  useEffect(() => {
    socketService.onScoreSync(callback);
    return () => socketService.offScoreSync(callback);
  }, [socketService, callback]);
};

export const useUsersUpdate = (callback: (users: unknown[]) => void) => {
  const socketService = getSocketService();

  useEffect(() => {
    socketService.onUsersUpdate(callback);
    return () => socketService.offUsersUpdate(callback);
  }, [socketService, callback]);
};

export const usePageUpdate = (callback: (navigation: PageNavigation) => void) => {
  const socketService = getSocketService();

  useEffect(() => {
    socketService.onPageUpdate(callback);
    return () => socketService.offPageUpdate(callback);
  }, [socketService, callback]);
};