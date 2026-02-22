import { create } from 'zustand';

export interface Role {
  id: string;
  name: string;
  icon: string;
}

interface RoleState {
  roles: Role[];
  loading: boolean;
  fetchRoles: () => Promise<void>;
  addRole: (name: string, icon: string) => Promise<void>;
  updateRole: (id: string, name: string, icon: string) => Promise<void>;
  deleteRole: (id: string) => Promise<boolean>;
}

export const useRoleStore = create<RoleState>((set) => ({
  roles: [],
  loading: false,

  fetchRoles: async () => {
    set({ loading: true });
    const res = await fetch('/api/roles');
    const roles = await res.json();
    set({ roles, loading: false });
  },

  addRole: async (name, icon) => {
    const res = await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    });
    if (res.ok) {
      const role = await res.json();
      set((s) => ({ roles: [...s.roles, role] }));
    }
  },

  updateRole: async (id, name, icon) => {
    const res = await fetch(`/api/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon }),
    });
    if (res.ok) {
      set((s) => ({
        roles: s.roles.map((r) => (r.id === id ? { ...r, name, icon } : r)),
      }));
    }
  },

  deleteRole: async (id) => {
    const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((s) => ({ roles: s.roles.filter((r) => r.id !== id) }));
      return true;
    }
    return false;
  },
}));
