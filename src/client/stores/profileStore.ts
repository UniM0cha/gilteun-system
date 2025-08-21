import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Instrument, User } from '@shared/types/user';

interface ProfileStore {
  currentUser: User | null;
  availableInstruments: Instrument[];
  setCurrentUser: (user: User) => void;
  setAvailableInstruments: (instruments: Instrument[]) => void;
  clearCurrentUser: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      currentUser: null,
      availableInstruments: [
        {
          id: 'drum',
          name: '드럼',
          icon: '🥁',
          order: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bass',
          name: '베이스',
          icon: '🎸',
          order: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'guitar',
          name: '기타',
          icon: '🎸',
          order: 3,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'keyboard',
          name: '키보드',
          icon: '🎹',
          order: 4,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'vocal',
          name: '보컬',
          icon: '🎤',
          order: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      setCurrentUser: (user) => set({ currentUser: user }),
      setAvailableInstruments: (instruments) => set({ availableInstruments: instruments }),
      clearCurrentUser: () => set({ currentUser: null }),
    }),
    {
      name: 'profile-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
