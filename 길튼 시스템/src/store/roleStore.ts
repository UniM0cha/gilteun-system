import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Role {
  id: string;
  name: string;
  icon: string;
}

interface RoleStore {
  roles: Role[];
  
  addRole: (role: Omit<Role, 'id'>) => string;
  updateRole: (id: string, role: Partial<Omit<Role, 'id'>>) => void;
  deleteRole: (id: string) => boolean; // 삭제 성공/실패 반환
  getRoleById: (id: string) => Role | undefined;
  isRoleInUse: (id: string) => boolean;
}

const defaultRoles: Role[] = [
  { id: '1', name: '인도자', icon: '🎤' },
  { id: '2', name: '건반', icon: '🎹' },
  { id: '3', name: '드럼', icon: '🥁' },
  { id: '4', name: '기타', icon: '🎸' },
  { id: '5', name: '베이스', icon: '🎸' },
  { id: '6', name: '보컬', icon: '🎵' },
  { id: '7', name: '목사님', icon: '📖' },
];

export const useRoleStore = create<RoleStore>()(
  persist(
    (set, get) => ({
      roles: defaultRoles,

      addRole: (role) => {
        const id = Date.now().toString();
        set((state) => ({
          roles: [...state.roles, { ...role, id }],
        }));
        return id;
      },

      updateRole: (id, updatedRole) => {
        set((state) => ({
          roles: state.roles.map((role) =>
            role.id === id ? { ...role, ...updatedRole } : role
          ),
        }));
      },

      deleteRole: (id) => {
        // 사용 중인지 확인
        if (get().isRoleInUse(id)) {
          return false;
        }
        
        set((state) => ({
          roles: state.roles.filter((role) => role.id !== id),
        }));
        return true;
      },

      getRoleById: (id) => {
        return get().roles.find((role) => role.id === id);
      },

      isRoleInUse: (id) => {
        // profileStore를 직접 import하면 순환 참조가 될 수 있으므로
        // localStorage에서 직접 확인
        const profileData = localStorage.getItem('profile-storage');
        if (!profileData) return false;
        
        try {
          const { state } = JSON.parse(profileData);
          const profiles = state?.profiles || [];
          return profiles.some((profile: { roleId: string }) => profile.roleId === id);
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'role-storage',
    }
  )
);
