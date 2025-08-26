/**
 * 길튼 시스템 상태 관리 스토어 통합 export
 */

// 메인 스토어들
export {
  useAppStore,
  useCurrentUser,
  useCurrentWorship,
  useCurrentSong,
  useServerInfo,
  useAppSettings,
  useAppError,
  useAppLoading,
} from './appStore';

export {
  useWebSocketStore,
  useConnectionStatus,
  useConnectedUsers,
  useRecentCommands,
  useRecentAnnotations,
  useActiveAnnotations,
} from './websocketStore';

export {
  useUIStore,
  useDrawingState,
  useViewState,
  useUIPanel,
  useModal,
  useOfflineState,
  useIsOffline,
  useOfflineQueueSize,
} from './uiStore';

// 타입들
export type * from '../types';

// 통합 스토어는 Phase 2에서 구현
// export const useStore = () => ({ ... });

// 복합 훅들은 Phase 2에서 구현 예정
// Phase 1에서는 개별 훅들을 직접 사용하세요
// 예: useAppStore, useCurrentUser, useWebSocketStore 등
