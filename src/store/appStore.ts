// 전역 앱 상태 (Zustand)

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, Worship, Song, ConnectionStatus } from '@/types';

// 앱 상태 타입
interface AppState {
  // 현재 선택된 항목
  currentProfile: Profile | null;
  currentWorship: Worship | null;
  currentSong: Song | null;

  // 연결 상태
  connectionStatus: ConnectionStatus;

  // 액션
  setCurrentProfile: (profile: Profile | null) => void;
  setCurrentWorship: (worship: Worship | null) => void;
  setCurrentSong: (song: Song | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  clearProfile: () => void;
  clearWorship: () => void;
  reset: () => void;
}

// 초기 상태
const initialState = {
  currentProfile: null,
  currentWorship: null,
  currentSong: null,
  connectionStatus: 'disconnected' as ConnectionStatus,
};

// 스토어 생성
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setCurrentProfile: (profile) => set({ currentProfile: profile }),
      setCurrentWorship: (worship) => set({ currentWorship: worship }),
      setCurrentSong: (song) => set({ currentSong: song }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      clearProfile: () => set({ currentProfile: null, currentWorship: null, currentSong: null }),
      clearWorship: () => set({ currentWorship: null, currentSong: null }),
      reset: () => set(initialState),
    }),
    {
      name: 'gilteun-app-store',
      partialize: (state) => ({
        // 프로필만 영구 저장 (예배/찬양은 세션마다 새로 선택)
        currentProfile: state.currentProfile,
      }),
    }
  )
);
