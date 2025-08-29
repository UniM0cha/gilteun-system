import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Annotation, Command, ConnectionStatus, User, WebSocketMessage } from '../types';
import { useAppStore } from './appStore';

/**
 * WebSocket 연결 및 실시간 통신 상태 인터페이스
 */
interface WebSocketState {
  // 연결 상태
  connectionStatus: ConnectionStatus;
  wsInstance: WebSocket | null;
  lastError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;

  // 서버 상태
  connectedUsers: User[];
  connectedUsersCount: number;

  // 실시간 메시지
  recentCommands: Command[];
  recentAnnotations: Annotation[];

  // 실시간 주석 상태 (Figma 스타일)
  activeAnnotations: Map<
    string,
    {
      userId: string;
      userName: string;
      tool: string;
      color: string;
      currentPath: string;
      startTime: number;
    }
  >;

  // 실시간 커서 위치 (Figma 스타일)
  activeCursors: Map<
    string,
    {
      userId: string;
      userName: string;
      x: number;
      y: number;
      isDrawing: boolean;
      tool: string;
      color: string;
      lastUpdate: number;
    }
  >;

  // 연결 관리
  connect: (serverUrl: string, userId: string, userName: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;

  // 메시지 전송
  sendMessage: (message: Partial<WebSocketMessage>) => boolean;
  sendCommand: (message: string) => boolean;
  sendAnnotationStart: (songId: number, tool: string, color: string, layer: string) => boolean;
  sendAnnotationUpdate: (songId: number, svgPath: string, tool: string, color: string) => boolean;
  sendAnnotationComplete: (songId: number, svgPath: string, tool: string, color: string, layer: string) => boolean;
  sendCursorMove: (songId: number, x: number, y: number, isDrawing: boolean, tool: string) => boolean;

  // 상태 관리
  clearMessages: () => void;
  removeActiveAnnotation: (userId: string) => void;
  removeActiveCursor: (userId: string) => void;
  updateCursorPosition: (
    userId: string,
    userName: string,
    x: number,
    y: number,
    isDrawing: boolean,
    tool: string,
    color: string,
  ) => void;
  updateConnectionStatus: (status: ConnectionStatus) => void;
  handleMessage: (message: WebSocketMessage) => void;
}

/**
 * WebSocket 연결 스토어
 */
export const useWebSocketStore = create<WebSocketState>()(
  devtools(
    (set, get) => ({
      // 초기 상태
      connectionStatus: 'disconnected',
      wsInstance: null,
      lastError: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      connectedUsers: [],
      connectedUsersCount: 0,
      recentCommands: [],
      recentAnnotations: [],
      activeAnnotations: new Map(),
      activeCursors: new Map(),

      // WebSocket 연결
      connect: async (serverUrl, userId, userName) => {
        const { wsInstance, connectionStatus } = get();

        // 이미 연결된 경우 연결 해제 후 재연결
        if (wsInstance && connectionStatus === 'connected') {
          get().disconnect();
        }

        set({ connectionStatus: 'connecting', lastError: null });

        try {
          const wsUrl = `${serverUrl.replace(/^http/, 'ws')}/ws?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`;
          const ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log('WebSocket 연결 성공');
            set({
              connectionStatus: 'connected',
              wsInstance: ws,
              reconnectAttempts: 0,
              lastError: null,
            });

            // 앱 스토어에 연결 상태 업데이트
            useAppStore.getState().setError(null);
          };

          ws.onmessage = (event) => {
            try {
              const message: WebSocketMessage = JSON.parse(event.data);
              get().handleMessage(message);
            } catch (error) {
              console.error('메시지 파싱 실패:', error);
            }
          };

          ws.onerror = (error) => {
            console.error('WebSocket 오류:', error);
            set({
              lastError: 'WebSocket 연결 오류가 발생했습니다',
              connectionStatus: 'error',
            });

            // 앱 스토어에 에러 업데이트
            useAppStore.getState().setError({
              code: 'WEBSOCKET_ERROR',
              message: 'WebSocket 연결 오류가 발생했습니다',
              timestamp: Date.now(),
            });
          };

          ws.onclose = (event) => {
            console.log('WebSocket 연결 종료:', event.code, event.reason);
            set({
              connectionStatus: 'disconnected',
              wsInstance: null,
            });

            // 정상 종료가 아닌 경우 재연결 시도
            if (!event.wasClean && get().reconnectAttempts < get().maxReconnectAttempts) {
              setTimeout(
                () => {
                  get().reconnect();
                },
                Math.min(1000 * Math.pow(2, get().reconnectAttempts), 30000),
              );
            }
          };

          set({ wsInstance: ws });
        } catch (error) {
          console.error('WebSocket 연결 실패:', error);
          set({
            connectionStatus: 'error',
            lastError: 'WebSocket 연결에 실패했습니다',
            wsInstance: null,
          });

          // 앱 스토어에 에러 업데이트
          useAppStore.getState().setError({
            code: 'WEBSOCKET_CONNECT_FAILED',
            message: 'WebSocket 연결에 실패했습니다',
            details: error,
            timestamp: Date.now(),
          });
        }
      },

      // 연결 해제
      disconnect: () => {
        const { wsInstance } = get();

        if (wsInstance) {
          wsInstance.close(1000, 'User disconnected');
        }

        set({
          connectionStatus: 'disconnected',
          wsInstance: null,
          reconnectAttempts: 0,
          lastError: null,
          connectedUsers: [],
          connectedUsersCount: 0,
          recentCommands: [],
          recentAnnotations: [],
          activeAnnotations: new Map(),
          activeCursors: new Map(),
        });
      },

      // 재연결
      reconnect: () => {
        const { reconnectAttempts, maxReconnectAttempts } = get();

        if (reconnectAttempts >= maxReconnectAttempts) {
          set({
            connectionStatus: 'error',
            lastError: '최대 재연결 시도 횟수를 초과했습니다',
          });
          return;
        }

        set({
          connectionStatus: 'reconnecting',
          reconnectAttempts: reconnectAttempts + 1,
        });

        // 앱 스토어에서 서버 정보와 사용자 정보 가져오기
        const appState = useAppStore.getState();
        const serverUrl = appState.serverInfo?.url || '';
        const userId = appState.currentUser?.id || '';
        const userName = appState.currentUser?.name || '';

        if (serverUrl && userId && userName) {
          get().connect(serverUrl, userId, userName);
        }
      },

      // 메시지 전송
      sendMessage: (message) => {
        const { wsInstance, connectionStatus } = get();

        if (!wsInstance || connectionStatus !== 'connected') {
          console.warn('WebSocket이 연결되어 있지 않습니다');
          return false;
        }

        try {
          const fullMessage = {
            ...message,
            timestamp: Date.now(),
            userId: useAppStore.getState().currentUser?.id,
            userName: useAppStore.getState().currentUser?.name,
          };

          wsInstance.send(JSON.stringify(fullMessage));
          return true;
        } catch (error) {
          console.error('메시지 전송 실패:', error);
          return false;
        }
      },

      // 명령 전송
      sendCommand: (message) => {
        return get().sendMessage({
          type: 'command:send',
          message,
        });
      },

      // 주석 시작
      sendAnnotationStart: (songId, tool, color, layer) => {
        return get().sendMessage({
          type: 'annotation:start',
          songId,
          tool,
          color,
          layer,
        });
      },

      // 주석 업데이트 (실시간)
      sendAnnotationUpdate: (songId, svgPath, tool, color) => {
        return get().sendMessage({
          type: 'annotation:update',
          songId,
          svgPath,
          tool,
          color,
        });
      },

      // 주석 완료
      sendAnnotationComplete: (songId, svgPath, tool, color, layer) => {
        return get().sendMessage({
          type: 'annotation:complete',
          songId,
          svgPath,
          tool,
          color,
          layer,
        });
      },

      // 커서 이동 (실시간)
      sendCursorMove: (songId, x, y, isDrawing, tool) => {
        return get().sendMessage({
          type: 'cursor:move',
          songId,
          x,
          y,
          isDrawing,
          tool,
        });
      },

      // 메시지 처리
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleMessage: (message: any) => {
        console.log('WebSocket 메시지 수신:', message);

        switch (message.type) {
          case 'welcome':
            console.log('서버 환영 메시지:', message);
            break;

          case 'user:connect':
            // 새 사용자 접속 알림
            break;

          case 'user:disconnect':
            // 사용자 연결 해제 알림
            get().removeActiveAnnotation(message.userId || '');
            get().removeActiveCursor(message.userId || '');
            break;

          case 'server:status':
            set({
              connectedUsersCount: message.connectedUsers || 0,
              connectedUsers: message.activeUsers || [],
            });
            break;

          case 'annotation:start':
            // 다른 사용자가 주석 시작
            if (message.userId && message.userId !== useAppStore.getState().currentUser?.id) {
              const activeAnnotations = new Map(get().activeAnnotations);
              activeAnnotations.set(message.userId, {
                userId: message.userId,
                userName: message.userName || '알 수 없음',
                tool: message.tool || 'pen',
                color: message.color || '#000000',
                currentPath: '',
                startTime: Date.now(),
              });
              set({ activeAnnotations });
            }
            break;

          case 'annotation:update':
            // 실시간 주석 업데이트 (Figma 스타일)
            if (message.userId && message.userId !== useAppStore.getState().currentUser?.id) {
              const activeAnnotations = new Map(get().activeAnnotations);
              const existing = activeAnnotations.get(message.userId);
              if (existing) {
                existing.currentPath = message.svgPath || '';
                activeAnnotations.set(message.userId, existing);
                set({ activeAnnotations });
              }
            }
            break;

          case 'annotation:complete':
            // 주석 완료 - 활성 주석에서 제거하고 최근 주석에 추가
            if (message.userId) {
              get().removeActiveAnnotation(message.userId);

              if (message.annotationId) {
                const annotation: Annotation = {
                  id: message.annotationId,
                  songId: message.songId || 0,
                  userId: message.userId,
                  userName: message.userName || '알 수 없음',
                  layer: message.layer || '',
                  svgPath: message.svgPath || '',
                  color: message.color || '#000000',
                  tool: message.tool || 'pen',
                  createdAt: new Date().toISOString(),
                };

                set((state) => ({
                  recentAnnotations: [annotation, ...state.recentAnnotations.slice(0, 49)], // 최대 50개
                }));
              }
            }
            break;

          case 'cursor:move':
            // 실시간 커서 위치 업데이트
            if (message.userId && message.userId !== useAppStore.getState().currentUser?.id) {
              get().updateCursorPosition(
                message.userId,
                message.userName || '알 수 없음',
                message.x || 0,
                message.y || 0,
                message.isDrawing || false,
                message.tool || 'pen',
                message.color || '#000000',
              );
            }
            break;

          case 'command:broadcast':
            // 새 명령 수신
            if (message.commandId) {
              const command: Command = {
                id: message.commandId,
                userId: message.userId || '',
                userName: message.userName || '알 수 없음',
                message: message.message || '',
                createdAt: new Date().toISOString(),
              };

              set((state) => ({
                recentCommands: [command, ...state.recentCommands.slice(0, 49)], // 최대 50개
              }));
            }
            break;

          case 'sync:response':
            // 데이터 동기화 응답 처리
            if (message.dataType === 'commands' && Array.isArray(message.data)) {
              set({ recentCommands: message.data });
            } else if (message.dataType === 'annotations' && Array.isArray(message.data)) {
              set({ recentAnnotations: message.data });
            }
            break;

          case 'error':
            console.error('서버 에러:', message);
            useAppStore.getState().setError({
              code: message.code || 'WEBSOCKET_SERVER_ERROR',
              message: message.message || '서버에서 오류가 발생했습니다',
              details: message.details,
              timestamp: Date.now(),
            });
            break;

          default:
            console.log('처리되지 않은 메시지 타입:', message.type);
        }
      },

      // 상태 관리
      clearMessages: () => {
        set({
          recentCommands: [],
          recentAnnotations: [],
          activeAnnotations: new Map(),
          activeCursors: new Map(),
        });
      },

      removeActiveAnnotation: (userId) => {
        const activeAnnotations = new Map(get().activeAnnotations);
        activeAnnotations.delete(userId);
        set({ activeAnnotations });
      },

      removeActiveCursor: (userId) => {
        const activeCursors = new Map(get().activeCursors);
        activeCursors.delete(userId);
        set({ activeCursors });
      },

      updateCursorPosition: (userId, userName, x, y, isDrawing, tool, color) => {
        const activeCursors = new Map(get().activeCursors);
        activeCursors.set(userId, {
          userId,
          userName,
          x,
          y,
          isDrawing,
          tool,
          color,
          lastUpdate: Date.now(),
        });
        set({ activeCursors });
      },

      updateConnectionStatus: (status) => {
        set({ connectionStatus: status });
      },
    }),
    {
      name: 'gilteun-websocket-store',
    },
  ),
);

// 편의용 훅들
export const useConnectionStatus = () => useWebSocketStore((state) => state.connectionStatus);
export const useConnectedUsers = () =>
  useWebSocketStore((state) => ({
    users: state.connectedUsers,
    count: state.connectedUsersCount,
  }));
export const useRecentCommands = () => useWebSocketStore((state) => state.recentCommands);
export const useRecentAnnotations = () => useWebSocketStore((state) => state.recentAnnotations);
export const useActiveAnnotations = () => useWebSocketStore((state) => state.activeAnnotations);
export const useActiveCursors = () => useWebSocketStore((state) => state.activeCursors);
