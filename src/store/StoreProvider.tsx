import React, { useEffect, useRef } from 'react';
import { useAppStore, useUIStore, useWebSocketStore } from './index';

/**
 * 길튼 시스템 스토어 프로바이더
 * 앱 초기화 및 스토어 간 동기화 관리
 */

interface StoreProviderProps {
  children: React.ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const initializeApp = useAppStore((state) => state.initialize);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const currentUser = useAppStore((state) => state.currentUser);
  const serverInfo = useAppStore((state) => state.serverInfo);
  const settings = useAppStore((state) => state.settings);

  const connectWebSocket = useWebSocketStore((state) => state.connect);
  const disconnectWebSocket = useWebSocketStore((state) => state.disconnect);
  const connectionStatus = useWebSocketStore((state) => state.connectionStatus);

  const setOfflineStatus = useUIStore((state) => state.setOfflineStatus);

  const hasInitializedRef = useRef(false);

  // 앱 초기화
  useEffect(() => {
    if (!hasInitializedRef.current) {
      console.log('🚀 길튼 시스템 초기화 시작');
      initializeApp();
      hasInitializedRef.current = true;
    }
  }, [initializeApp]);

  // 네트워크 상태 모니터링
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 네트워크 연결됨');
      setOfflineStatus(false);

      // 오프라인에서 온라인으로 전환 시 WebSocket 재연결
      if (connectionStatus === 'disconnected' && serverInfo && currentUser) {
        connectWebSocket(serverInfo.url, currentUser.id, currentUser.name);
      }
    };

    const handleOffline = () => {
      console.log('📱 네트워크 연결 끊어짐');
      setOfflineStatus(true);
    };

    // 네트워크 상태 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 초기 네트워크 상태 설정
    setOfflineStatus(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineStatus, connectionStatus, serverInfo, currentUser, connectWebSocket]);

  // WebSocket 자동 연결 (설정에 따라)
  useEffect(() => {
    if (
      isInitialized &&
      settings.autoConnect &&
      settings.serverUrl &&
      currentUser &&
      connectionStatus === 'disconnected'
    ) {
      console.log('🔌 WebSocket 자동 연결 시도');
      connectWebSocket(settings.serverUrl, currentUser.id, currentUser.name);
    }
  }, [isInitialized, settings.autoConnect, settings.serverUrl, currentUser, connectionStatus, connectWebSocket]);

  // 페이지 언로드 시 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('👋 앱 종료 - WebSocket 연결 해제');
      disconnectWebSocket();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [disconnectWebSocket]);

  // 개발 모드에서 스토어 디버그 도구 등록
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      window.GilteunDebug = {
        stores: {
          app: useAppStore,
          websocket: useWebSocketStore,
          ui: useUIStore,
        },
        logStores: () => {
          console.group('🏪 Gilteun Store States');
          console.log('📱 App:', useAppStore.getState());
          console.log('🌐 WebSocket:', useWebSocketStore.getState());
          console.log('🎨 UI:', useUIStore.getState());
          console.groupEnd();
        },
        resetStores: () => {
          useAppStore.getState().reset();
          useWebSocketStore.getState().disconnect();
          useUIStore.getState().resetUI();
        },
      };

      console.log('🛠️ 개발 모드 - window.GilteunDebug 사용 가능');
    }
  }, []);

  return <>{children}</>;
};

/**
 * 앱 초기화 상태를 보여주는 로딩 컴포넌트
 */
export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const isLoading = useAppStore((state) => state.isLoading);
  const loadingMessage = useAppStore((state) => state.loadingMessage);

  if (!isInitialized || isLoading) {
    return (
      <div className="fullscreen-portrait flex items-center justify-center bg-gray-50">
        <div className="space-y-4 text-center">
          {/* 로딩 스피너 */}
          <div className="relative mx-auto h-16 w-16">
            <div className="border-primary-200 absolute inset-0 rounded-full border-4"></div>
            <div className="border-primary-600 absolute inset-0 animate-spin rounded-full border-4 border-t-transparent"></div>
          </div>

          {/* 길튼 시스템 로고/제목 */}
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">길튼 시스템</h1>
            <p className="text-sm text-gray-600">교회 찬양팀을 위한 실시간 협업 플랫폼</p>
          </div>

          {/* 로딩 메시지 */}
          {loadingMessage && <p className="text-sm text-gray-500">{loadingMessage}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
