import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Command {
  id: number;
  emoji: string;
  label: string;
  isDefault: boolean;
}

interface CommandStore {
  commands: Command[];
  setCommands: (commands: Command[]) => void;
  addCommand: (command: Omit<Command, 'id'>) => void;
  deleteCommand: (id: number) => void;
  resetToDefault: () => void;
}

const defaultCommands: Command[] = [
  { id: 1, emoji: "1️⃣", label: "1절", isDefault: true },
  { id: 2, emoji: "2️⃣", label: "2절", isDefault: true },
  { id: 3, emoji: "3️⃣", label: "3절", isDefault: true },
  { id: 4, emoji: "🔂", label: "한번 더", isDefault: true },
  { id: 5, emoji: "🔁", label: "계속 반복", isDefault: true },
  { id: 6, emoji: "▶️", label: "시작", isDefault: true },
  { id: 7, emoji: "⏹️", label: "정지", isDefault: true },
  { id: 8, emoji: "⏭️", label: "다음 곡", isDefault: true },
  { id: 9, emoji: "🔊", label: "볼륨 업", isDefault: true },
  { id: 10, emoji: "🔉", label: "볼륨 다운", isDefault: true },
  { id: 11, emoji: "👍", label: "좋음", isDefault: true },
];

export const useCommandStore = create<CommandStore>()(
  persist(
    (set) => ({
      commands: defaultCommands,
      
      setCommands: (commands) => set({ commands }),
      
      addCommand: (command) => set((state) => ({
        commands: [
          ...state.commands,
          {
            ...command,
            id: Date.now(),
          },
        ],
      })),
      
      deleteCommand: (id) => set((state) => ({
        commands: state.commands.filter((cmd) => cmd.id !== id),
      })),
      
      resetToDefault: () => set({ commands: defaultCommands }),
    }),
    {
      name: 'gilten-commands',
    }
  )
);
