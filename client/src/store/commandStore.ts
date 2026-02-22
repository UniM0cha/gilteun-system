import { create } from 'zustand';

export interface Command {
  id: string;
  emoji: string;
  label: string;
  isDefault: boolean;
}

interface CommandState {
  commands: Command[];
  loading: boolean;
  fetchCommands: () => Promise<void>;
  addCommand: (emoji: string, label: string) => Promise<void>;
  deleteCommand: (id: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}

export const useCommandStore = create<CommandState>((set) => ({
  commands: [],
  loading: false,

  fetchCommands: async () => {
    set({ loading: true });
    const res = await fetch('/api/commands');
    const commands = await res.json();
    set({ commands, loading: false });
  },

  addCommand: async (emoji, label) => {
    const res = await fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, label }),
    });
    if (res.ok) {
      const command = await res.json();
      set((s) => ({ commands: [...s.commands, command] }));
    }
  },

  deleteCommand: async (id) => {
    const res = await fetch(`/api/commands/${id}`, { method: 'DELETE' });
    if (res.ok) {
      set((s) => ({ commands: s.commands.filter((c) => c.id !== id) }));
    }
  },

  resetToDefault: async () => {
    const res = await fetch('/api/commands/reset', { method: 'POST' });
    if (res.ok) {
      const commands = await res.json();
      set({ commands });
    }
  },
}));
