import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppError, AppSettings, ServerInfo, Song, User, Worship } from '../types';

/**
 * 메인 앱 상태 인터페이스
 */
interface AppState {
  // 사용자 정보
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // 현재 예배/찬양
  currentWorship: Worship | null;
  currentSong: Song | null;
  currentSongIndex: number;
  setCurrentWorship: (worship: Worship | null) => void;
  setCurrentSong: (song: Song | null, index?: number) => void;

  // React Router로 마이그레이션되어 제거됨

  // 서버 연결 정보
  serverInfo: ServerInfo | null;
  setServerInfo: (info: ServerInfo | null) => void;

  // 앱 설정
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // 에러 처리
  lastError: AppError | null;
  setError: (error: AppError | null) => void;
  clearError: () => void;

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;

  // 앱 초기화
  isInitialized: boolean;
  initialize: () => Promise<void>;
  reset: () => void;
}

/**
 * 기본 설정값
 */
const defaultSettings: AppSettings = {
  serverUrl: '',
  userName: '',
  userId: '',
  autoConnect: false,
  gesturesEnabled: true,
  pencilEnabled: true,
  theme: 'light',
  language: 'ko',
};

/**
 * 사용자 ID 생성 함수
 */
const generateUserId = (): string => {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 메인 앱 스토어
 */
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        currentUser: null,
        currentWorship: null,
        currentSong: null,
        currentSongIndex: 0,
        serverInfo: null,
        settings: defaultSettings,
        lastError: null,
        isLoading: false,
        loadingMessage: '',
        isInitialized: false,

        // 사용자 관리
        setCurrentUser: (user) => {
          set({ currentUser: user });
        },

        // 예배/찬양 관리
        setCurrentWorship: (worship) => {
          set({
            currentWorship: worship,
            currentSong: null, // 예배가 변경되면 현재 찬양 초기화
            currentSongIndex: 0,
          });
        },

        setCurrentSong: (song, index = 0) => {
          set({
            currentSong: song,
            currentSongIndex: index,
          });
        },

        // 서버 정보 관리
        setServerInfo: (info) => {
          set({ serverInfo: info });
        },

        // 설정 관리
        updateSettings: (newSettings) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }));
        },

        // 에러 관리
        setError: (error) => {
          set({ lastError: error });

          // 5초 후 자동으로 에러 클리어 (치명적이지 않은 경우)
          if (error && !error.code.startsWith('CRITICAL_')) {
            setTimeout(() => {
              const { lastError } = get();
              if (lastError?.timestamp === error.timestamp) {
                set({ lastError: null });
              }
            }, 5000);
          }
        },

        clearError: () => {
          set({ lastError: null });
        },

        // 로딩 상태 관리
        setLoading: (loading, message = '') => {
          set({
            isLoading: loading,
            loadingMessage: loading ? message : '',
          });
        },

        // 앱 초기화
        initialize: async () => {
          const { settings, updateSettings } = get();

          set({ isLoading: true, loadingMessage: '앱 초기화 중...' });

          try {
            // 사용자 ID가 없으면 생성
            if (!settings.userId) {
              const userId = generateUserId();
              updateSettings({ userId });
            }

            // 사용자 이름이 없으면 기본값 설정
            if (!settings.userName) {
              updateSettings({ userName: '익명 사용자' });
            }

            // 초기 사용자 정보 설정
            const { settings: updatedSettings } = get();
            set({
              currentUser: {
                id: updatedSettings.userId,
                name: updatedSettings.userName,
                color:
                  '#' +
                  Math.floor(Math.random() * 16777215)
                    .toString(16)
                    .padStart(6, '0'),
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
              },
            });

            set({ isInitialized: true, isLoading: false, loadingMessage: '' });
          } catch (error) {
            console.error('앱 초기화 실패:', error);
            set({
              lastError: {
                code: 'INIT_ERROR',
                message: '앱 초기화 중 오류가 발생했습니다',
                details: error,
                timestamp: Date.now(),
              },
            });
          } finally {
            set({ isLoading: false, loadingMessage: '' });
          }
        },

        // 앱 상태 초기화
        reset: () => {
          set({
            currentUser: null,
            currentWorship: null,
            currentSong: null,
            currentSongIndex: 0,
            serverInfo: null,
            lastError: null,
            isLoading: false,
            loadingMessage: '',
            isInitialized: false,
          });
        },
      }),
      {
        name: 'gilteun-app-store',
        partialize: (state) => ({
          settings: state.settings,
          currentUser: state.currentUser,
          currentWorship: state.currentWorship,
          // 민감하지 않은 정보만 persist
        }),
      },
    ),
    {
      name: 'gilteun-app-store',
    },
  ),
);

// 편의용 훅들
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useCurrentWorship = () => useAppStore((state) => state.currentWorship);
export const useCurrentSong = () => useAppStore((state) => state.currentSong);
export const useServerInfo = () => useAppStore((state) => state.serverInfo);
export const useAppSettings = () => useAppStore((state) => state.settings);
export const useAppError = () => useAppStore((state) => state.lastError);
export const useAppLoading = () =>
  useAppStore((state) => ({
    isLoading: state.isLoading,
    message: state.loadingMessage,
  }));
