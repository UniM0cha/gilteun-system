import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  currentProfileId: string | null;
  setCurrentProfile: (id: string) => void;
  clearCurrentProfile: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentProfileId: null,
      setCurrentProfile: (id) => set({ currentProfileId: id }),
      clearCurrentProfile: () => set({ currentProfileId: null }),
    }),
    {
      name: 'gilteun-profile',
      partialize: (state) => ({ currentProfileId: state.currentProfileId }),
    },
  ),
);
