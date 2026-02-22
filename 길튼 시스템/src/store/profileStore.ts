import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Profile {
  id: string;
  name: string;
  roleId: string; // 역할 ID로 변경
  color: string; // 색상은 프로필별로 유지
}

interface ProfileStore {
  profiles: Profile[];
  currentProfileId: string | null;
  
  addProfile: (profile: Omit<Profile, 'id'>) => string;
  updateProfile: (id: string, profile: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  setCurrentProfile: (id: string) => void;
  getProfileById: (id: string) => Profile | undefined;
  getCurrentProfile: () => Profile | undefined;
}

const mockProfiles: Profile[] = [
  { id: '1', name: '김성준', roleId: '1', color: 'bg-blue-500' }, // 인도자
  { id: '2', name: '이미영', roleId: '2', color: 'bg-purple-500' }, // 건반
  { id: '3', name: '박준혁', roleId: '3', color: 'bg-green-500' }, // 드럼
];

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profiles: mockProfiles,
      currentProfileId: null,

      addProfile: (profile) => {
        const id = Date.now().toString();
        set((state) => ({
          profiles: [...state.profiles, { ...profile, id }],
        }));
        return id;
      },

      updateProfile: (id, updatedProfile) => {
        set((state) => ({
          profiles: state.profiles.map((profile) =>
            profile.id === id ? { ...profile, ...updatedProfile } : profile
          ),
        }));
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((profile) => profile.id !== id),
          currentProfileId: state.currentProfileId === id ? null : state.currentProfileId,
        }));
      },

      setCurrentProfile: (id) => {
        set({ currentProfileId: id });
      },

      getProfileById: (id) => {
        return get().profiles.find((profile) => profile.id === id);
      },

      getCurrentProfile: () => {
        const { currentProfileId, profiles } = get();
        if (!currentProfileId) return undefined;
        return profiles.find((profile) => profile.id === currentProfileId);
      },
    }),
    {
      name: 'profile-storage',
    }
  )
);