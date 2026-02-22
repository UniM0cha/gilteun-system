import { create } from 'zustand';

export interface WorshipType {
  id: string;
  name: string;
  color: string;
}

export interface Sheet {
  id: string;
  worshipId: string;
  fileName: string;
  title: string;
  imagePath: string;
  order: number;
  createdAt: string;
}

export interface Worship {
  id: string;
  title: string;
  date: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  sheets: Sheet[];
}

interface WorshipState {
  worshipTypes: WorshipType[];
  worships: Worship[];
  loading: boolean;

  // Worship Types
  fetchWorshipTypes: () => Promise<void>;
  addWorshipType: (name: string, color: string) => Promise<void>;
  updateWorshipType: (id: string, name: string, color: string) => Promise<void>;
  deleteWorshipType: (id: string) => Promise<void>;

  // Worships
  fetchWorships: () => Promise<void>;
  fetchWorship: (id: string) => Promise<Worship | null>;
  addWorship: (title: string, date: string, typeId: string) => Promise<Worship | null>;
  updateWorship: (id: string, data: { title?: string; date?: string; typeId?: string }) => Promise<void>;
  deleteWorship: (id: string) => Promise<void>;

  // Sheets
  addSheet: (worshipId: string, file: File, title: string) => Promise<Sheet | null>;
  updateSheet: (id: string, title: string) => Promise<void>;
  deleteSheet: (id: string) => Promise<void>;
  reorderSheets: (worshipId: string, orderedIds: string[]) => Promise<void>;
}

export const useWorshipStore = create<WorshipState>((set) => ({
  worshipTypes: [],
  worships: [],
  loading: false,

  // === Worship Types ===
  fetchWorshipTypes: async () => {
    const res = await fetch('/api/worship-types');
    const worshipTypes = await res.json();
    set({ worshipTypes });
  },

  addWorshipType: async (name, color) => {
    const res = await fetch('/api/worship-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const wt = await res.json();
      set((s) => ({ worshipTypes: [...s.worshipTypes, wt] }));
    }
  },

  updateWorshipType: async (id, name, color) => {
    const res = await fetch(`/api/worship-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      set((s) => ({
        worshipTypes: s.worshipTypes.map((wt) =>
          wt.id === id ? { ...wt, name, color } : wt,
        ),
      }));
    }
  },

  deleteWorshipType: async (id) => {
    const res = await fetch(`/api/worship-types/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((s) => ({ worshipTypes: s.worshipTypes.filter((wt) => wt.id !== id) }));
    }
  },

  // === Worships ===
  fetchWorships: async () => {
    set({ loading: true });
    const res = await fetch('/api/worships');
    const worships = await res.json();
    set({ worships, loading: false });
  },

  fetchWorship: async (id) => {
    const res = await fetch(`/api/worships/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  addWorship: async (title, date, typeId) => {
    const res = await fetch('/api/worships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, typeId }),
    });
    if (res.ok) {
      const worship = await res.json();
      const full = { ...worship, sheets: [] };
      set((s) => ({ worships: [...s.worships, full] }));
      return full;
    }
    return null;
  },

  updateWorship: async (id, data) => {
    const res = await fetch(`/api/worships/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      set((s) => ({
        worships: s.worships.map((w) =>
          w.id === id ? { ...w, ...data } : w,
        ),
      }));
    }
  },

  deleteWorship: async (id) => {
    const res = await fetch(`/api/worships/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((s) => ({ worships: s.worships.filter((w) => w.id !== id) }));
    }
  },

  // === Sheets ===
  addSheet: async (worshipId, file, title) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', title);
    const res = await fetch(`/api/worships/${worshipId}/sheets`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const sheet = await res.json();
      set((s) => ({
        worships: s.worships.map((w) =>
          w.id === worshipId ? { ...w, sheets: [...w.sheets, sheet] } : w,
        ),
      }));
      return sheet;
    }
    return null;
  },

  updateSheet: async (id, title) => {
    const res = await fetch(`/api/sheets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      set((s) => ({
        worships: s.worships.map((w) => ({
          ...w,
          sheets: w.sheets.map((sh) =>
            sh.id === id ? { ...sh, title } : sh,
          ),
        })),
      }));
    }
  },

  deleteSheet: async (id) => {
    const res = await fetch(`/api/sheets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((s) => ({
        worships: s.worships.map((w) => ({
          ...w,
          sheets: w.sheets.filter((sh) => sh.id !== id),
        })),
      }));
    }
  },

  reorderSheets: async (worshipId, orderedIds) => {
    const res = await fetch(`/api/worships/${worshipId}/sheets/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    if (res.ok) {
      set((s) => ({
        worships: s.worships.map((w) => {
          if (w.id !== worshipId) return w;
          const sorted = orderedIds
            .map((sid, i) => {
              const sheet = w.sheets.find((sh) => sh.id === sid);
              return sheet ? { ...sheet, order: i } : null;
            })
            .filter(Boolean) as Sheet[];
          return { ...w, sheets: sorted };
        }),
      }));
    }
  },
}));
