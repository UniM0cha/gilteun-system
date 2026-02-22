import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Profile {
  id: string;
  name: string;
  roleId: string;
  color: string;
}

interface ProfileState {
  profiles: Profile[];
  currentProfileId: string | null;
  loading: boolean;
  fetchProfiles: () => Promise<void>;
  addProfile: (data: Omit<Profile, 'id'>) => Promise<void>;
  updateProfile: (id: string, data: Omit<Profile, 'id'>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setCurrentProfile: (id: string) => void;
  clearCurrentProfile: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profiles: [],
      currentProfileId: null,
      loading: false,

      fetchProfiles: async () => {
        set({ loading: true });
        const res = await fetch('/api/profiles');
        const profiles = await res.json();
        set({ profiles, loading: false });
      },

      addProfile: async (data) => {
        const res = await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const profile = await res.json();
          set((s) => ({ profiles: [...s.profiles, profile] }));
        }
      },

      updateProfile: async (id, data) => {
        const res = await fetch(`/api/profiles/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          set((s) => ({
            profiles: s.profiles.map((p) =>
              p.id === id ? { ...p, ...data } : p,
            ),
          }));
        }
      },

      deleteProfile: async (id) => {
        const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
        if (res.ok) {
          set((s) => ({
            profiles: s.profiles.filter((p) => p.id !== id),
            currentProfileId:
              s.currentProfileId === id ? null : s.currentProfileId,
          }));
        }
      },

      setCurrentProfile: (id) => set({ currentProfileId: id }),
      clearCurrentProfile: () => set({ currentProfileId: null }),
    }),
    {
      name: 'gilteun-profile',
      partialize: (state) => ({ currentProfileId: state.currentProfileId }),
    },
  ),
);
